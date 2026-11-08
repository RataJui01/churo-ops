const mongoose = require('mongoose');
const {
  loadEnv,
  databaseUri,
  createPrompt,
  confirmDatabase,
} = require('./scriptEnv');

// [ENV_FILE=config.prod.env] node scripts/seedMenu.js
const envFile = loadEnv();

const MenuItem = require('../models/menuItemModel');
const StoreSetting = require('../models/storeSettingModel');

// The storefront menu (Jui, 2026-11-08). Names in English, except the
// condensed-milk topping, which is only ever called นมข้น. Order within each
// category follows REQUIREMENTS §3. Classic and Bites prices equal churo-ops'
// BASE_PRICES (client/src/constants/prices.js): there's no menu-editing page,
// so changing a price means editing it here AND there, then running this
// again (REQUIREMENTS §8).
const one = (price) => [{ name: 'Regular', price }];
const sizes = (s, m) => [
  { name: 'S', price: s },
  { name: 'M', price: m },
];

const MENU = [
  { category: 'churro-hug', name: 'Plain', variants: one(59) },
  { category: 'churro-hug', name: 'Choco Pops', variants: one(69) },
  { category: 'churro-hug', name: 'Choco Berry', variants: one(79) },

  { category: 'classic', name: 'Plain', variants: sizes(59, 99) },
  { category: 'classic', name: 'Choco Pops', variants: sizes(69, 119) },
  { category: 'classic', name: 'Choco Berry', variants: sizes(89, 149) },
  { category: 'classic', name: 'Signature', variants: sizes(79, 129) },

  { category: 'bites', name: 'Strawberry Nutella Bites', variants: one(129) },

  { category: 'topping', name: 'Choc dip', variants: one(10) },
  { category: 'topping', name: 'Choc pops', variants: one(10) },
  { category: 'topping', name: 'Strawberry freeze dried', variants: one(10) },
  { category: 'topping', name: 'นมข้น', variants: one(10) },
].map((item, index, all) => ({
  ...item,
  // 1, 2, 3… within each category, in the order written above
  sortOrder:
    all.slice(0, index + 1).filter((other) => other.category === item.category)
      .length,
}));

const label = (item) => `${item.category} · ${item.name}`;
const priceList = (variants) =>
  variants.map((v) => `${v.name} ${v.price}`).join(', ');

// Creates what's missing and brings prices / order in line with MENU.
// Never touches isAvailable — that's the staff's sold-out switch, and running
// this again must not put a sold-out item back on sale. Never deletes either:
// an item no longer in MENU is only reported (switch it off in the app).
const seedMenu = async function () {
  // Wait for the unique (category, name) index before the first insert
  await MenuItem.init();

  for (const item of MENU) {
    const existing = await MenuItem.findOne({
      category: item.category,
      name: item.name,
    });
    if (!existing) {
      await MenuItem.create(item);
      console.log(`✅ ${label(item)} created (${priceList(item.variants)})`);
      continue;
    }

    const changes = [];
    if (priceList(existing.variants) !== priceList(item.variants)) {
      changes.push(
        `${priceList(existing.variants)} → ${priceList(item.variants)}`,
      );
    }
    if (existing.sortOrder !== item.sortOrder) {
      changes.push(`order ${existing.sortOrder} → ${item.sortOrder}`);
    }
    if (!changes.length) {
      console.log(`⚪ ${label(item)} up to date`);
      continue;
    }
    // findOne + set + save, like every edit in the app: full validation
    existing.set({ variants: item.variants, sortOrder: item.sortOrder });
    await existing.save();
    console.log(`🔁 ${label(item)}: ${changes.join('; ')}`);
  }

  const known = new Set(MENU.map(label));
  const extra = (await MenuItem.find()).filter((doc) => !known.has(label(doc)));
  for (const doc of extra) {
    console.log(`⚠️  ${label(doc)} is in the database but not in MENU — left alone`);
  }
};

// The store starts closed, and only if there's no setting yet: running this
// against production while the store is open must not close it. Timestamps
// are set by hand and only on insert, because "Opened by … at …" reads
// updatedAt — Mongoose's automatic timestamps would bump it on every run.
const seedStoreSetting = async function () {
  const now = new Date();
  const result = await StoreSetting.updateOne(
    { _id: StoreSetting.STORE_ID },
    { $setOnInsert: { isOpen: false, createdAt: now, updatedAt: now } },
    { upsert: true, timestamps: false },
  );
  if (result.upsertedCount) {
    console.log('✅ Store setting created (closed)');
  } else {
    const store = await StoreSetting.getStore();
    console.log(
      `⚪ Store setting already exists (${store.isOpen ? 'open' : 'closed'}) — left alone`,
    );
  }
};

const run = async function () {
  const prompt = createPrompt();
  try {
    if (!(await confirmDatabase(prompt, envFile))) {
      console.log('Nothing written.');
      return;
    }
  } finally {
    prompt.close();
  }

  await mongoose.connect(databaseUri());
  try {
    await seedMenu();
    await seedStoreSetting();
  } catch (err) {
    console.log('❌', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
