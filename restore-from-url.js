/**
 * Restore database from a SQL backup URL (e.g. for Railway migration).
 *
 * 1. Set RESTORE_SQL_URL to a raw HTTPS URL of your backup.sql (e.g. GitHub Gist raw URL).
 * 2. Run: node restore-from-url.js   (or on Railway: railway run npm run restore:url)
 *
 * Handles both formats:
 * - Full sqlite3 .dump (CREATE TABLE + INSERTs): drops tables first so CREATE TABLE succeeds.
 * - INSERT-only backup: clears rows then runs SQL (requires ./db to have created schema).
 */

const db = require('./db');
const path = require('path');

// Log which database file we're using
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'pcpoints.sqlite');
console.log('Using database at:', dbPath);

const url = process.env.RESTORE_SQL_URL;
if (!url) {
  console.error('Missing RESTORE_SQL_URL. Set it to the HTTPS URL of your backup.sql file.');
  process.exit(1);
}

async function main() {
  console.log('Fetching backup from URL:', url);
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Failed to fetch backup:', res.status, res.statusText);
    process.exit(1);
  }
  const sql = await res.text();
  if (!sql || sql.length < 10) {
    console.error('Backup content is empty or too short.');
    process.exit(1);
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
  try {
    db.exec(sql);
  } catch (e) {
    console.error('Error executing backup SQL:', e.message);
    process.exit(1);
  }

  const users = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const events = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  const attendance = db.prepare('SELECT COUNT(*) AS c FROM attendance').get().c;
  console.log('✅ Restore complete:', users, 'users,', events, 'events,', attendance, 'attendance records.');
  
  if (users === 0) {
    console.error('⚠️  WARNING: Restore completed but database has 0 users!');
    console.error('   Check that:');
    console.error('   1. DATABASE_PATH is set correctly (should be /data/pcpoints.sqlite on Railway)');
    console.error('   2. Volume is mounted at /data');
    console.error('   3. The backup SQL executed without errors');
    process.exit(1);
  }
}

main();
