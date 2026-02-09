// Migration script to update existing @pct.local emails to @illinois.edu
// Run with: node migrate_emails.js

const db = require('./db');

function main() {
  const users = db.fetchUsersWithPctLocalEmail();

  if (users.length === 0) {
    console.log('No users found with @pct.local emails. Nothing to migrate.');
    return;
  }

  console.log(`Found ${users.length} user(s) with @pct.local emails.`);

  const txn = db.transaction(() => {
    let updated = 0;
    for (const user of users) {
      const netId = user.email.replace('@pct.local', '');
      const newEmail = `${netId}@illinois.edu`;
      db.updateUserEmail(user.id, newEmail);
      updated++;
      console.log(`Updated user ${user.username}: ${user.email} → ${newEmail}`);
    }
    return updated;
  });

  const count = txn();
  console.log(`\nMigration complete! Updated ${count} user(s).`);
}

main();
