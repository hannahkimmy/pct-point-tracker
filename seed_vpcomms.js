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
  const existing = db.fetchUserByEmailOrRole3(VPCOMMS_EMAIL);

  if (existing) {
    console.log('VP Communications account already exists. Skipping.');
    return;
  }

  const hash = bcrypt.hashSync(VPCOMMS_PASSWORD, 10);

  try {
    db.insertOneUserWithActive({
      name: VPCOMMS_NAME,
      username: VPCOMMS_USERNAME,
      email: VPCOMMS_EMAIL,
      password_hash: hash,
      role_level: 3,
      must_change_password: 0,
      is_active: 1,
    });

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
