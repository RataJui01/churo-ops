const mongoose = require('mongoose');
const {
  loadEnv,
  databaseUri,
  createPrompt,
  confirmDatabase,
} = require('./scriptEnv');

// [ENV_FILE=config.prod.env] node scripts/seedStock.js
const envFile = loadEnv();

const StockItem = require('../models/stockItemModel');

// The items orders deduct automatically. Churro / Stick / Box values chosen
// by Jui 2026-10-01; Bite churro / Bite box and the per-serving rules added
// 2026-10-03 (everything is per serving: a regular serving takes S 4 / M 8
// churros + as many sticks + 1 Box; a Nutella bite serving takes 10 Bite
// churros + 1 Stick + 1 Bite box). Quantity starts at 0 on purpose: the real
// counts get entered through the Restock page, so the first numbers have a
// restock-log entry. Every other stock item is created from Restock with all
// usage rules at 0.
const SEED_ITEMS = [
  {
    name: 'Churro',
    unit: 'pcs',
    lowStockThreshold: 20,
    usedPerPiece: 1,
    usedPerServing: 0,
    usedPerBite: 0,
    usedPerOrder: 0,
  },
  {
    name: 'Stick',
    unit: 'pcs',
    lowStockThreshold: 50,
    usedPerPiece: 1,
    usedPerServing: 0,
    usedPerBite: 1,
    usedPerOrder: 0,
  },
  {
    name: 'Box',
    unit: 'pcs',
    lowStockThreshold: 20,
    usedPerPiece: 0,
    usedPerServing: 1,
    usedPerBite: 0,
    usedPerOrder: 0,
  },
  {
    name: 'Bite churro',
    unit: 'pcs',
    lowStockThreshold: 0,
    usedPerPiece: 0,
    usedPerServing: 0,
    usedPerBite: 10,
    usedPerOrder: 0,
  },
  {
    name: 'Bite box',
    unit: 'pcs',
    lowStockThreshold: 0,
    usedPerPiece: 0,
    usedPerServing: 0,
    usedPerBite: 1,
    usedPerOrder: 0,
  },
];

const RULE_FIELDS = [
  'usedPerPiece',
  'usedPerServing',
  'usedPerBite',
  'usedPerOrder',
];

const seedStock = async function () {
  // Wait for the unique (case-insensitive) name index to exist before the
  // first insert, instead of letting Mongoose build it in the background
  await StockItem.init();

  for (const item of SEED_ITEMS) {
    // Same case-insensitive lookup as Restock
    const existing = await StockItem.findByName(item.name);
    if (!existing) {
      await StockItem.create(item);
      console.log(`✅ ${item.name} created`);
      continue;
    }

    // Items seeded before usedPerServing / usedPerBite existed get their
    // rules filled in once (Box also moves from "1 per order" to "1 per
    // serving"). Only items still missing usedPerServing in the database are
    // touched — through the raw collection, since Mongoose would fill the
    // default in — so a second run, or rules edited in the app since, are
    // left alone.
    const rules = Object.fromEntries(RULE_FIELDS.map((f) => [f, item[f]]));
    const result = await StockItem.collection.updateOne(
      { _id: existing._id, usedPerServing: { $exists: false } },
      { $set: rules },
    );
    console.log(
      result.modifiedCount
        ? `🔁 ${existing.name} rules set to ${JSON.stringify(rules)}`
        : `⚠️  ${existing.name} already up to date, skipping`,
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
    await seedStock();
  } catch (err) {
    console.log('❌', err.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();
