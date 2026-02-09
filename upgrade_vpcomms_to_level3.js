// One-off script: set VP Communications account to role_level 3.
// Run this if you already have a level-2 VP Comms and want to grant add-member permissions.

const db = require('./db');

const VPCOMMS_EMAIL = 'pct.vpcommunications@gmail.com';

const result = db
  .prepare('UPDATE users SET role_level = 3 WHERE email = ?')
  .run(VPCOMMS_EMAIL);

if (result.changes > 0) {
  console.log(`Updated ${result.changes} user(s) to role_level 3 (VP Comms).`);
} else {
  console.log('No users updated. VP Comms may already be level 3 or not present.');
}
