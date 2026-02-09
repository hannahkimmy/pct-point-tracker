// Export all data from local SQLite database to JSON files
// This allows you to migrate data to production

const db = require('./db');
const fs = require('fs');
const path = require('path');

console.log('Exporting database data...');

// Export users
const users = db.fetchAllUsersRaw();
fs.writeFileSync('exported-users.json', JSON.stringify(users, null, 2));
console.log(`✓ Exported ${users.length} users to exported-users.json`);

// Export events
const events = db.fetchAllEventsRaw();
fs.writeFileSync('exported-events.json', JSON.stringify(events, null, 2));
console.log(`✓ Exported ${events.length} events to exported-events.json`);

// Export attendance
const attendance = db.fetchAllAttendanceRaw();
fs.writeFileSync('exported-attendance.json', JSON.stringify(attendance, null, 2));
console.log(`✓ Exported ${attendance.length} attendance records to exported-attendance.json`);

console.log('\n✅ Export complete!');
console.log('\nFiles created:');
console.log('  - exported-users.json');
console.log('  - exported-events.json');
console.log('  - exported-attendance.json');
console.log('\n⚠️  Keep these files secure - they contain password hashes!');
console.log('⚠️  Do NOT commit these files to git!');
