const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { loadEnv, databaseUri } = require('./scriptEnv');

// [ENV_FILE=config.prod.env] [BACKUP_DIR=…] node scripts/backupDb.js
// Free Atlas has no automatic backup (2026-10-14: Jui runs this once a week).
// Read-only, so no y/N. Each collection is saved as canonical EJSON, which
// keeps ObjectId / Date / number types — plain JSON would turn ObjectIds into
// strings and break every reference between collections on restore.
loadEnv();
const { EJSON } = mongoose.mongo.BSON;

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const BACKUP_DIR = path.resolve(
  process.env.BACKUP_DIR || 'D:/Backups/churo-ops',
);

// The files hold both accounts' emails and password hashes — never inside
// the repo, where one `git add .` would publish them
const inside = path.relative(REPO_ROOT, BACKUP_DIR);
if (!inside.startsWith('..') && !path.isAbsolute(inside)) {
  console.log(`❌ BACKUP_DIR is inside the repo (${BACKUP_DIR}) — choose a folder outside it`);
  process.exit(1);
}

const stamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

const run = async function () {
  await mongoose.connect(databaseUri());
  try {
    const db = mongoose.connection.db;
    const host = new URL(process.env.DATABASE.replace('<db_password>', 'x')).hostname;
    console.log(`Backing up ${db.databaseName} on ${host}`);

    const folder = path.join(BACKUP_DIR, `${stamp()}-${db.databaseName}`);
    fs.mkdirSync(folder, { recursive: true });

    const meta = {
      database: db.databaseName,
      host,
      createdAt: new Date().toISOString(),
      collections: {},
    };
    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.'))
      .sort();

    for (const name of names) {
      const collection = db.collection(name);
      const docs = await collection.find().sort({ _id: 1 }).toArray();
      fs.writeFileSync(
        path.join(folder, `${name}.json`),
        EJSON.stringify(docs, null, 2, { relaxed: false }),
      );
      meta.collections[name] = {
        count: docs.length,
        indexes: await collection.indexes(),
      };
    }
    fs.writeFileSync(path.join(folder, '_meta.json'), JSON.stringify(meta, null, 2));

    // Read every file back, so a half-written backup is noticed today rather
    // than on the day it's needed
    const rows = names.map((name) => {
      const saved = EJSON.parse(fs.readFileSync(path.join(folder, `${name}.json`), 'utf8'));
      return {
        collection: name,
        documents: saved.length,
        indexes: meta.collections[name].indexes.length,
        ok: saved.length === meta.collections[name].count ? '✅' : '❌',
      };
    });
    console.table(rows);
    console.log(
      rows.every((r) => r.ok === '✅')
        ? `✅ Saved to ${folder}`
        : `❌ Some files don't match the database — don't rely on ${folder}`,
    );
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.log('❌', err.message);
  process.exitCode = 1;
});
