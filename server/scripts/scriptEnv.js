// Shared by the seed scripts (2026-10-12): which env file — and so which
// database — to use, a y/N check before writing, and prompts for secrets.
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

// ENV_FILE picks the env file in server/ (default config.env), so the same
// script can seed production: ENV_FILE=config.prod.env node scripts/…
function loadEnv() {
  const file = process.env.ENV_FILE || 'config.env';
  const fullPath = path.join(__dirname, '..', file);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ ${file} not found in server/`);
    process.exit(1);
  }
  dotenv.config({ path: fullPath, quiet: true });
  return file;
}

function databaseUri() {
  return process.env.DATABASE.replace(
    '<db_password>',
    process.env.DATABASE_PASSWORD,
  );
}

// "churo-ops on cluster0.abcde.mongodb.net" — never the password
function describeDatabase() {
  const url = new URL(process.env.DATABASE.replace('<db_password>', 'x'));
  return `${url.pathname.slice(1) || '(default "test")'} on ${url.hostname}`;
}

// One readline for the whole script. Lines are read through its async
// iterator, which keeps lines that arrive early (piped input) instead of
// dropping them. Hidden answers mute readline's echo — _writeToOutput is
// readline's own (undocumented) hook, the usual way to do this without a
// library.
function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: Boolean(process.stdin.isTTY),
  });
  let muted = false;
  rl._writeToOutput = (text) => {
    if (!muted) rl.output.write(text);
  };
  const lines = rl[Symbol.asyncIterator]();

  async function ask(question) {
    process.stdout.write(question);
    const { value } = await lines.next();
    return value ?? '';
  }

  async function askHidden(question) {
    muted = true;
    const answer = await ask(question);
    muted = false;
    process.stdout.write('\n');
    return answer;
  }

  return { ask, askHidden, close: () => rl.close() };
}

// Says which database is about to be written to and waits for a "y", so a
// production seed can't happen by accident (or a dev one land in production)
async function confirmDatabase(prompt, envFile) {
  console.log(`Env file: ${envFile}`);
  console.log(`Database: ${describeDatabase()}`);
  const answer = await prompt.ask('Write to this database? (y/N) ');
  return answer.trim().toLowerCase() === 'y';
}

module.exports = { loadEnv, databaseUri, createPrompt, confirmDatabase };
