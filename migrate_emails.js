// Migration script to update existing @pct.local emails to @illinois.edu
// Run with: node migrate_emails.js

const db = require('./db');

function main() {
  // Get all users with @pct.local emails
  const users = db
    .prepare("SELECT id, username, email FROM users WHERE email LIKE '%@pct.local'")
    .all();

  if (users.length === 0) {
    console.log('No users found with @pct.local emails. Nothing to migrate.');
    return;
  }

  console.log(`Found ${users.length} user(s) with @pct.local emails.`);

  const txn = db.transaction(() => {
    let updated = 0;
    const stmt = db.prepare('UPDATE users SET email = ? WHERE id = ?');

    for (const user of users) {
      // Extract the NetID/username part before @pct.local
      const netId = user.email.replace('@pct.local', '');
      const newEmail = `${netId}@illinois.edu`;

      // Update the email
      stmt.run(newEmail, user.id);
      updated++;
      console.log(`Updated user ${user.username}: ${user.email} → ${newEmail}`);
    }

    return updated;
  });

  const count = txn();
  console.log(`\nMigration complete! Updated ${count} user(s).`);
}

main();
