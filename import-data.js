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
      
      for (const user of users) {
        try {
          db.upsertUserForImport(user);
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
      
      for (const event of events) {
        try {
          db.upsertEventForImport(event);
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
      
      for (const record of attendance) {
        try {
          db.upsertAttendanceForImport(record);
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
