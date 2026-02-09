// Verify that data was imported correctly
const db = require('./db');

console.log('Checking database...\n');

// Check users
const userCount = { count: db.countUsers() };
console.log(`Total users in database: ${userCount.count}`);

// Show first 5 users
const users = db.fetchUsersLimit(5);
console.log('\nFirst 5 users:');
users.forEach(u => {
  console.log(`  - ${u.name} (${u.username}) - Role: ${u.role_level}`);
});

// Check events
const eventCount = { count: db.countEvents() };
console.log(`\nTotal events: ${eventCount.count}`);

// Check attendance
const attendanceCount = { count: db.countAttendance() };
console.log(`Total attendance records: ${attendanceCount.count}`);

// Check database file location
const dbPath = process.env.DATABASE_PATH || './pcpoints.sqlite';
console.log(`\nDatabase file location: ${dbPath}`);
console.log(`DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
