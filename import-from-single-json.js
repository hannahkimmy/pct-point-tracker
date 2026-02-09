// Import from exported-all.json (single file - run on Railway after uploading exported-all.json)
const db = require('./db');
const fs = require('fs');

if (!fs.existsSync('exported-all.json')) {
  console.error('exported-all.json not found. Run export-single-json.js locally first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync('exported-all.json', 'utf8'));

console.log('Importing from exported-all.json...\n');

// Users
if (data.users && data.users.length) {
  for (const u of data.users) {
    try {
      db.upsertUserFull(u);
    } catch (e) {
      console.log('  Skip user:', u.username, e.message);
    }
  }
  console.log(`✓ ${data.users.length} users`);
}

// Events
if (data.events && data.events.length) {
  for (const e of data.events) {
    try {
      db.upsertEventFull(e);
    } catch (err) {
      console.log('  Skip event:', e.name, err.message);
    }
  }
  console.log(`✓ ${data.events.length} events`);
}

// Attendance
if (data.attendance && data.attendance.length) {
  for (const a of data.attendance) {
    try {
      db.upsertAttendanceFull(a);
    } catch (err) {
      console.log('  Skip attendance:', err.message);
    }
  }
  console.log(`✓ ${data.attendance.length} attendance records`);
}

console.log('\n✅ Import complete.');
