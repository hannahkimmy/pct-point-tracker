/**
 * Restore database from a SQL backup URL (e.g. for Railway migration).
 *
 * On Railway (recommended): Set RESTORE_SQL_URL in Variables and deploy. The app will
 * run the restore once on startup (where /data exists), then start the server.
 * Remove RESTORE_SQL_URL after the first successful deploy.
 *
 * Handles both formats:
 * - Full sqlite3 .dump (CREATE TABLE + INSERTs): drops tables first so CREATE TABLE succeeds.
 * - INSERT-only backup: clears rows then runs SQL (requires schema to exist).
 *
 * @param {object} db - better-sqlite3 database instance
 * @param {string} url - HTTPS URL of backup.sql (e.g. GitHub Gist raw URL)
 * @returns {Promise<void>}
 */
async function runRestoreFromUrl(db, url) {
  console.log('Fetching backup from URL:', url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch backup: ${res.status} ${res.statusText}`);
  }
  const sql = await res.text();
  if (!sql || sql.length < 10) {
    throw new Error('Backup content is empty or too short.');
  }

  const isFullDump = /CREATE\s+TABLE\s+users\s*\(/i.test(sql);
  if (isFullDump) {
    console.log('Detected full .dump format; dropping tables so CREATE TABLE can run...');
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('DROP TABLE IF EXISTS attendance; DROP TABLE IF EXISTS events; DROP TABLE IF EXISTS users;');
    db.exec('PRAGMA foreign_keys = ON;');
  } else {
    console.log('Clearing existing data...');
    db.exec('DELETE FROM attendance; DELETE FROM events; DELETE FROM users;');
  }

  console.log('Running backup SQL...');
  db.exec(sql);

  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const events = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  const attendance = db.prepare('SELECT COUNT(*) AS c FROM attendance').get().c;
  console.log('✅ Restore complete:', users, 'users,', events, 'events,', attendance, 'attendance records.');

  if (users === 0) {
    throw new Error('Restore completed but database has 0 users. Check backup and DATABASE_PATH/Volume.');
  }
}

// When run as a script (e.g. node restore-from-url.js): use ./db and RESTORE_SQL_URL.
// Note: This only works where DATABASE_PATH exists (e.g. on Railway). Locally, use a local path
// or run restore via server startup (set RESTORE_SQL_URL and deploy).
if (require.main === module) {
  const db = require('./db');
  const path = require('path');
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'pcpoints.sqlite');
  console.log('Using database at:', dbPath);

  const url = process.env.RESTORE_SQL_URL;
  if (!url) {
    console.error('Missing RESTORE_SQL_URL. Set it to the HTTPS URL of your backup.sql file.');
    process.exit(1);
  }

  runRestoreFromUrl(db, url).catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}

module.exports = { runRestoreFromUrl };
