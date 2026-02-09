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
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (id, name, username, email, password_hash, role_level, must_change_password, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const u of data.users) {
    try {
      insertUser.run(u.id, u.name, u.username, u.email, u.password_hash, u.role_level, u.must_change_password, u.is_active, u.created_at);
    } catch (e) {
      console.log('  Skip user:', u.username, e.message);
    }
  }
  console.log(`✓ ${data.users.length} users`);
}

// Events
if (data.events && data.events.length) {
  const insertEvent = db.prepare(`
    INSERT OR REPLACE INTO events (id, name, category, date, points, created_by, semester, mandatory, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const e of data.events) {
    try {
      insertEvent.run(e.id, e.name, e.category, e.date, e.points, e.created_by, e.semester, e.mandatory || 0, e.created_at);
    } catch (err) {
      console.log('  Skip event:', e.name, err.message);
    }
  }
  console.log(`✓ ${data.events.length} events`);
}

// Attendance
if (data.attendance && data.attendance.length) {
  const insertAtt = db.prepare(`
    INSERT OR REPLACE INTO attendance (id, user_id, event_id, status, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const a of data.attendance) {
    try {
      insertAtt.run(a.id, a.user_id, a.event_id, a.status, a.created_at);
    } catch (err) {
      console.log('  Skip attendance:', err.message);
    }
  }
  console.log(`✓ ${data.attendance.length} attendance records`);
}

console.log('\n✅ Import complete.');
