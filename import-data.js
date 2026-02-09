// Import exported data into production database
// Run this AFTER deploying to production (with DATABASE_URL set)

const db = require('./db');
const fs = require('fs');

// Check if we're in production (PostgreSQL) or local (SQLite)
const isProduction = !!process.env.DATABASE_URL;

if (!isProduction) {
  console.log('⚠️  Warning: This appears to be a local database.');
  console.log('   Set DATABASE_URL environment variable for production import.');
  console.log('   Continue anyway? (This will import into local database)');
}

async function importData() {
  try {
    // Import users
    if (fs.existsSync('exported-users.json')) {
      const users = JSON.parse(fs.readFileSync('exported-users.json', 'utf8'));
      console.log(`\nImporting ${users.length} users...`);
      
      const insertUser = db.prepare(`
        INSERT INTO users (id, name, username, email, password_hash, role_level, must_change_password, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          username = excluded.username,
          email = excluded.email,
          password_hash = excluded.password_hash,
          role_level = excluded.role_level,
          must_change_password = excluded.must_change_password,
          is_active = excluded.is_active
      `);
      
      for (const user of users) {
        try {
          insertUser.run(
            user.id,
            user.name,
            user.username,
            user.email,
            user.password_hash,
            user.role_level,
            user.must_change_password,
            user.is_active,
            user.created_at
          );
        } catch (e) {
          console.log(`  ⚠️  Skipped user ${user.username}: ${e.message}`);
        }
      }
      console.log('✓ Users imported');
    }

    // Import events
    if (fs.existsSync('exported-events.json')) {
      const events = JSON.parse(fs.readFileSync('exported-events.json', 'utf8'));
      console.log(`\nImporting ${events.length} events...`);
      
      const insertEvent = db.prepare(`
        INSERT INTO events (id, name, category, date, points, created_by, semester, mandatory, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          category = excluded.category,
          date = excluded.date,
          points = excluded.points,
          created_by = excluded.created_by,
          semester = excluded.semester,
          mandatory = excluded.mandatory
      `);
      
      for (const event of events) {
        try {
          insertEvent.run(
            event.id,
            event.name,
            event.category,
            event.date,
            event.points,
            event.created_by,
            event.semester,
            event.mandatory || 0,
            event.created_at
          );
        } catch (e) {
          console.log(`  ⚠️  Skipped event ${event.name}: ${e.message}`);
        }
      }
      console.log('✓ Events imported');
    }

    // Import attendance
    if (fs.existsSync('exported-attendance.json')) {
      const attendance = JSON.parse(fs.readFileSync('exported-attendance.json', 'utf8'));
      console.log(`\nImporting ${attendance.length} attendance records...`);
      
      const insertAttendance = db.prepare(`
        INSERT INTO attendance (id, user_id, event_id, status, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          event_id = excluded.event_id,
          status = excluded.status
      `);
      
      for (const record of attendance) {
        try {
          insertAttendance.run(
            record.id,
            record.user_id,
            record.event_id,
            record.status,
            record.created_at
          );
        } catch (e) {
          console.log(`  ⚠️  Skipped attendance record: ${e.message}`);
        }
      }
      console.log('✓ Attendance imported');
    }

    console.log('\n✅ Import complete!');
  } catch (e) {
    console.error('❌ Import failed:', e);
    process.exit(1);
  }
}

importData();
