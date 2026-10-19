const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { loadEnv, databaseUri, createPrompt } = require('./scriptEnv');

// [ENV_FILE=…] node scripts/restoreDb.js <backup folder> [--db <name>]
// Puts a backupDb.js folder back. The target is the env file's database, or
// --db <name> on the same cluster (for a practice restore). It only writes
// into a database whose collections are all empty: it never overwrites or
// deletes anything, so restoring over live data has to be a deliberate,
// separate step.
loadEnv();
const { EJSON } = mongoose.mongo.BSON;

const args = process.argv.slice(2);
const dbFlag = args.indexOf('--db');
const targetName = dbFlag === -1 ? undefined : args[dbFlag + 1];
const folder = args.find(
  (a, i) => !a.startsWith('--') && (dbFlag === -1 || i !== dbFlag + 1),
);

if (!folder || (dbFlag !== -1 && !targetName)) {
  console.log('Usage: node scripts/restoreDb.js <backup folder> [--db <name>]');
  process.exit(1);
}
const metaPath = path.join(folder, '_meta.json');
if (!fs.existsSync(metaPath)) {
  console.log(`❌ ${metaPath} not found — is this a backupDb.js folder?`);
  process.exit(1);
}
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

const run = async function () {
  await mongoose.connect(databaseUri(), targetName ? { dbName: targetName } : {});
  const prompt = createPrompt();
  try {
    const db = mongoose.connection.db;
    const host = new URL(process.env.DATABASE.replace('<db_password>', 'x')).hostname;

    // Empty target only — checked before asking, so nobody is asked a
    // question whose answer can't be used
    const existing = await db.listCollections({}, { nameOnly: true }).toArray();
    const existingNames = new Set(existing.map((c) => c.name));
    for (const { name } of existing) {
      if (name.startsWith('system.')) continue;
      if (await db.collection(name).estimatedDocumentCount()) {
        console.log(`❌ ${db.databaseName} on ${host} isn't empty (${name} has documents) — nothing restored`);
        return;
      }
    }

    console.log(`Backup: ${meta.database} from ${meta.createdAt}`);
    console.log(`Target: ${db.databaseName} on ${host}`);
    const answer = await prompt.ask('Restore into this database? (y/N) ');
    if (answer.trim().toLowerCase() !== 'y') {
      console.log('Nothing restored.');
      return;
    }

    const rows = [];
    for (const [name, info] of Object.entries(meta.collections)) {
      // Created even when the backup is empty, so the restored database has
      // the same collections (an empty one only exists once something's in it)
      if (!existingNames.has(name)) await db.createCollection(name);
      const collection = db.collection(name);
      // Indexes first, so the unique ones (users.email, the case-insensitive
      // stock names) check the documents as they go in
      for (const { key, v: _v, ns: _ns, ...options } of info.indexes) {
        if (options.name === '_id_') continue;
        await collection.createIndex(key, options);
      }
      const docs = EJSON.parse(fs.readFileSync(path.join(folder, `${name}.json`), 'utf8'));
      if (docs.length) await collection.insertMany(docs, { ordered: true });

      const count = await collection.countDocuments();
      const indexNames = (await collection.indexes()).map((i) => i.name).sort();
      const wanted = info.indexes.map((i) => i.name).sort();
      rows.push({
        collection: name,
        documents: count,
        indexes: indexNames.length,
        ok: count === info.count && indexNames.join() === wanted.join() ? '✅' : '❌',
      });
    }
    console.table(rows);
    console.log(
      rows.every((r) => r.ok === '✅')
        ? `✅ Restored into ${db.databaseName}`
        : '❌ Some collections differ from the backup — check before using this database',
    );
  } finally {
    prompt.close();
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.log('❌', err.message);
  process.exitCode = 1;
});
