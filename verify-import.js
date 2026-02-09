// Verify that data was imported correctly
const db = require('./db');

console.log('Checking database...\n');

// Check users
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
console.log(`Total users in database: ${userCount.count}`);

// Show first 5 users
const users = db.prepare('SELECT id, name, username, email, role_level FROM users LIMIT 5').all();
console.log('\nFirst 5 users:');
users.forEach(u => {
  console.log(`  - ${u.name} (${u.username}) - Role: ${u.role_level}`);
});

// Check events
const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get();
console.log(`\nTotal events: ${eventCount.count}`);

// Check attendance
const attendanceCount = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
console.log(`Total attendance records: ${attendanceCount.count}`);

// Check database file location
const dbPath = process.env.DATABASE_PATH || './pcpoints.sqlite';
console.log(`\nDatabase file location: ${dbPath}`);
console.log(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
