// One-off script to create the VP Communications account.
// Email: pct.vpcommunications@gmail.com
// Password: hannahisverypretty
// Role: 3 (VP Comms - only level that can add members)

const bcrypt = require('bcryptjs');
const db = require('./db');

const VPCOMMS_EMAIL = 'pct.vpcommunications@gmail.com';
const VPCOMMS_PASSWORD = 'hannahisverypretty';
const VPCOMMS_NAME = 'VP Communications';
const VPCOMMS_USERNAME = 'vpcomm'; // or whatever username you want

function main() {
  // Check if VP Comms already exists
  const existing = db
    .prepare('SELECT id FROM users WHERE email = ? OR role_level = 3')
    .get(VPCOMMS_EMAIL);

  if (existing) {
    console.log('VP Communications account already exists. Skipping.');
    return;
  }

  const hash = bcrypt.hashSync(VPCOMMS_PASSWORD, 10);

  try {
    db.prepare(
      `
        INSERT INTO users (name, username, email, password_hash, role_level, must_change_password, is_active)
        VALUES (?, ?, ?, ?, 3, 0, 1)
      `
    ).run(VPCOMMS_NAME, VPCOMMS_USERNAME, VPCOMMS_EMAIL, hash);

    console.log('VP Communications account created successfully!');
    console.log(`Email: ${VPCOMMS_EMAIL}`);
    console.log(`Password: ${VPCOMMS_PASSWORD}`);
    console.log(`Username: ${VPCOMMS_USERNAME}`);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      console.log('VP Communications account already exists (unique constraint).');
    } else {
      console.error('Error creating VP Comms account:', e);
      process.exit(1);
    }
  }
}

main();
