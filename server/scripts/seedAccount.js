const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');
const {
  loadEnv,
  databaseUri,
  createPrompt,
  confirmDatabase,
} = require('./scriptEnv');

const envFile = loadEnv();

const User = require('../models/userModel');

// Long enough to survive guessing now that the app is on the internet
// (2026-10-12; was 8)
const MIN_PASSWORD_LENGTH = 12;

const seedAccount = async function (name, email, password) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`⚠️  ${email} already exists, skipping`);
    return;
  }

  // Store only the hash, never the plain password
  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await User.create({ name, email, password: hashedPassword });
  console.log(`✅ Account created: ${newUser.name} <${newUser.email}>`);
};

const run = async function () {
  // One account per run. The password is asked for, hidden, rather than
  // given on the command line, where it would stay in the terminal's history:
  //   [ENV_FILE=config.prod.env] node scripts/seedAccount.js <name> <email>
  const [name, email] = process.argv.slice(2);
  if (!name || !email) {
    console.log('❌ Usage: node scripts/seedAccount.js <name> <email>');
    return;
  }
  if (!validator.isEmail(email)) {
    console.log('❌ Invalid email');
    return;
  }

  const prompt = createPrompt();
  let password;
  try {
    password = await prompt.askHidden(
      `Password (${MIN_PASSWORD_LENGTH}+ characters): `,
    );
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.log(
        `❌ Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
      return;
    }
    if ((await prompt.askHidden('Same password again: ')) !== password) {
      console.log("❌ The passwords don't match");
      return;
    }
    if (!(await confirmDatabase(prompt, envFile))) {
      console.log('Nothing written.');
      return;
    }
  } finally {
    prompt.close();
  }

  await mongoose.connect(databaseUri());
  try {
    await seedAccount(name, email, password);
  } catch (err) {
    console.log('❌', err.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();
