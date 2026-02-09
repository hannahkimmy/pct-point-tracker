// Export database as SQL dump (can restore with sqlite3 < backup.sql or restore-from-url.js)
const db = require('./db');
const fs = require('fs');
const path = require('path');

// Use same path as app (DATABASE_PATH or default)
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'pcpoints.sqlite');

// Use sqlite3 CLI if available, otherwise generate basic INSERT statements
const { execSync } = require('child_process');

try {
  execSync(`sqlite3 "${dbPath}" .dump > backup.sql`, { stdio: 'inherit' });
  console.log('✓ Exported to backup.sql (full SQL dump)');
} catch (e) {
  console.log('sqlite3 CLI not in PATH. Creating INSERT-based export...');
  const users = db.prepare('SELECT * FROM users').all();
  const events = db.prepare('SELECT * FROM events').all();
  const attendance = db.prepare('SELECT * FROM attendance').all();
  let sql = '-- PC Points backup\n';
  sql += 'BEGIN TRANSACTION;\n';
  users.forEach(u => {
    const name = (u.name || '').replace(/'/g, "''");
    const username = (u.username || '').replace(/'/g, "''");
    const email = (u.email || '').replace(/'/g, "''");
    const hash = (u.password_hash || '').replace(/'/g, "''");
    sql += `INSERT OR REPLACE INTO users VALUES(${u.id},'${name}','${username}','${email}','${hash}',${u.role_level},${u.must_change_password},${u.is_active},'${u.created_at || ''}');\n`;
  });
  events.forEach(ev => {
    const name = (ev.name || '').replace(/'/g, "''");
    const cat = (ev.category || '').replace(/'/g, "''");
    const sem = (ev.semester || '').replace(/'/g, "''");
    sql += `INSERT OR REPLACE INTO events VALUES(${ev.id},'${name}','${cat}','${ev.date}',${ev.points},${ev.created_by},'${sem}',${ev.mandatory || 0},'${ev.created_at || ''}');\n`;
  });
  attendance.forEach(a => {
    const status = (a.status || '').replace(/'/g, "''");
    sql += `INSERT OR REPLACE INTO attendance VALUES(${a.id},${a.user_id},${a.event_id},'${status}','${a.created_at || ''}');\n`;
  });
  sql += 'COMMIT;\n';
  fs.writeFileSync('backup.sql', sql);
  console.log('✓ Exported to backup.sql');
}
