const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use SQLite for now (works on most platforms with persistent storage)
// For PostgreSQL migration, see DEPLOYMENT.md
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'pcpoints.sqlite');
console.log('Database path:', dbPath);

// Ensure the directory exists (e.g. /data for Railway volumes)
const dbDir = path.dirname(dbPath);
const isRootLevel = path.isAbsolute(dbDir) && dbDir.split(path.sep).length <= 2;

if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') {
      console.error(`Error: Could not create directory ${dbDir}: ${e.message}`);
      if (isRootLevel) {
        console.error(`Note: Creating root-level directories like ${dbDir} may require sudo permissions.`);
        console.error(`For local testing, unset DATABASE_PATH or use a local path.`);
      }
      throw e;
    }
  }
}

const db = new Database(dbPath);

/**
 * Initialize / migrate database schema.
 *
 * Roles / permission levels:
 *   0 = regular member (view-only)
 *   1 = admin level 1 (can take attendance)
 *   2 = admin level 2 (full admin: manage users, grant level 1, reset semester)
 *
 * Users authenticate with a unique username (NetID) and password.
 * CSV-imported members are created as role_level = 0 with must_change_password = 1.
 */
function initSchema() {
  db.pragma('foreign_keys = ON');

  const hasUsers = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();

  if (!hasUsers) {
    db.exec(`
      CREATE TABLE users (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        name               TEXT NOT NULL,
        username           TEXT NOT NULL UNIQUE,
        email              TEXT,
        password_hash      TEXT NOT NULL,
        role_level         INTEGER NOT NULL DEFAULT 0,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        is_active          INTEGER NOT NULL DEFAULT 1,
        created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    const columns = db.prepare('PRAGMA table_info(users)').all();
    const colNames = columns.map((c) => c.name);

    if (!colNames.includes('username')) {
      db.exec('ALTER TABLE users ADD COLUMN username TEXT');
      db.exec(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)'
      );
    }
    if (!colNames.includes('email')) {
      db.exec('ALTER TABLE users ADD COLUMN email TEXT');
    }
    if (!colNames.includes('role_level')) {
      db.exec('ALTER TABLE users ADD COLUMN role_level INTEGER NOT NULL DEFAULT 0');
    }
    if (!colNames.includes('must_change_password')) {
      db.exec(
        'ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0'
      );
    }
    if (!colNames.includes('is_active')) {
      db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1');
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL CHECK (category IN ('brotherhood','professional','service','general')),
      date        DATETIME NOT NULL,
      points      INTEGER NOT NULL,
      created_by  INTEGER NOT NULL,
      semester    TEXT NOT NULL,
      mandatory   INTEGER NOT NULL DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  const eventCols = db.prepare('PRAGMA table_info(events)').all();
  if (eventCols.length && !eventCols.some((c) => c.name === 'mandatory')) {
    db.exec('ALTER TABLE events ADD COLUMN mandatory INTEGER NOT NULL DEFAULT 0');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      event_id    INTEGER NOT NULL,
      status      TEXT NOT NULL CHECK (status IN ('present','absent')),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, event_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);
}

initSchema();

// -----------------------------------------------------------------------------
// User queries
// -----------------------------------------------------------------------------

function countUsers() {
  return db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
}

function fetchOneUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/** Returns id, name, username, email, role_level (no password). */
function fetchOneUserSafe(id) {
  return db.prepare('SELECT id, name, username, email, role_level FROM users WHERE id = ?').get(id);
}

/** For login: full row by username or email. */
function fetchUserByLoginIdentifier(identifier) {
  return db
    .prepare(
      'SELECT id, name, username, email, password_hash, role_level, is_active, must_change_password FROM users WHERE username = ? OR email = ?'
    )
    .get(identifier, identifier);
}

/** For /api/me: id, name, username, email, role_level, is_active. */
function fetchOneUserForMe(id) {
  return db
    .prepare('SELECT id, name, username, email, role_level, is_active FROM users WHERE id = ?')
    .get(id);
}

function fetchUserRoleLevel(id) {
  return db.prepare('SELECT role_level FROM users WHERE id = ?').get(id);
}

/** For change-password: id, password_hash, must_change_password. */
function fetchUserForPasswordChange(id) {
  return db
    .prepare('SELECT id, password_hash, must_change_password FROM users WHERE id = ?')
    .get(id);
}

/** All users: id, name, username, email, role_level, is_active, ORDER BY name. */
function fetchAllUsers() {
  return db
    .prepare(
      'SELECT id, name, username, email, role_level, is_active FROM users ORDER BY name ASC'
    )
    .all();
}

/** Active user ids only (for attendance). */
function fetchActiveUserIds() {
  return db.prepare('SELECT id FROM users WHERE is_active = 1').all();
}

/** Active members with role_level < 1, for points view. */
function fetchActiveMembersForPoints() {
  return db
    .prepare(
      'SELECT id, name, username, email, role_level FROM users WHERE is_active = 1 AND role_level < 1 ORDER BY name ASC'
    )
    .all();
}

/** By username (id, role_level) for CSV import. */
function fetchUserByUsername(username) {
  return db.prepare('SELECT id, role_level FROM users WHERE username = ?').get(username);
}

/** Users with @pct.local email (for migrate_emails). */
function fetchUsersWithPctLocalEmail() {
  return db
    .prepare("SELECT id, username, email FROM users WHERE email LIKE '%@pct.local'")
    .all();
}

/** By email or role_level = 3 (for seed_vpcomms). */
function fetchUserByEmailOrRole3(email) {
  return db.prepare('SELECT id FROM users WHERE email = ? OR role_level = 3').get(email);
}

function insertOneUser({ name, username, email, password_hash, role_level, must_change_password }) {
  const info = db
    .prepare(
      `INSERT INTO users (name, username, email, password_hash, role_level, must_change_password)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, username, email ?? null, password_hash, role_level, must_change_password);
  return info.lastInsertRowid;
}

/** CSV import: insert new member. */
function insertOneUserWithActive({
  name,
  username,
  email,
  password_hash,
  role_level,
  must_change_password,
  is_active,
}) {
  const info = db
    .prepare(
      `INSERT INTO users (name, username, email, password_hash, role_level, must_change_password, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, username, email, password_hash, role_level, must_change_password, is_active);
  return info.lastInsertRowid;
}

/** CSV import: update existing member (name, password, role, must_change). */
function updateUserForCsvImport(id, name, password_hash) {
  db.prepare(
    `UPDATE users SET name = ?, password_hash = ?, role_level = 0, must_change_password = 1, is_active = 1 WHERE id = ?`
  ).run(name, password_hash, id);
}

function updateUserRole(id, role_level) {
  db.prepare('UPDATE users SET role_level = ? WHERE id = ?').run(role_level, id);
}

function deactivateUser(id) {
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
}

function updateUserPassword(id, password_hash) {
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(
    password_hash,
    id
  );
}

function updateUserEmail(id, email) {
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, id);
}

function updateUserRoleLevelByEmail(email, role_level) {
  return db.prepare('UPDATE users SET role_level = ? WHERE email = ?').run(role_level, email);
}

// -----------------------------------------------------------------------------
// Event queries
// -----------------------------------------------------------------------------

function fetchOneEvent(id) {
  return db.prepare('SELECT * FROM events WHERE id = ?').get(id);
}

function fetchAllEvents() {
  return db.prepare('SELECT * FROM events ORDER BY date DESC').all();
}

function insertOneEvent({
  name,
  category,
  date,
  points,
  created_by,
  semester,
  mandatory,
}) {
  const info = db
    .prepare(
      `INSERT INTO events (name, category, date, points, created_by, semester, mandatory)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, category, date, points, created_by, semester, mandatory ? 1 : 0);
  return info.lastInsertRowid;
}

function updateEvent(id, { name, category, date, points, mandatory }) {
  db.prepare(
    'UPDATE events SET name = ?, category = ?, date = ?, points = ?, mandatory = ? WHERE id = ?'
  ).run(name, category, date, points, mandatory ? 1 : 0, id);
}

function deleteEvent(id) {
  db.prepare('DELETE FROM events WHERE id = ?').run(id);
}

// -----------------------------------------------------------------------------
// Attendance queries
// -----------------------------------------------------------------------------

function fetchAttendanceByEventId(eventId) {
  return db
    .prepare('SELECT user_id, status FROM attendance WHERE event_id = ?')
    .all(eventId);
}

function insertOneAttendance(user_id, event_id, status) {
  db.prepare('INSERT INTO attendance (user_id, event_id, status) VALUES (?, ?, ?)').run(
    user_id,
    event_id,
    status
  );
}

function deleteAttendanceByEventId(eventId) {
  db.prepare('DELETE FROM attendance WHERE event_id = ?').run(eventId);
}

// -----------------------------------------------------------------------------
// Points summary (by user)
// -----------------------------------------------------------------------------

function fetchPointsSummaryByUserId(userId) {
  return db
    .prepare(
      `SELECT e.category,
        SUM(CASE
          WHEN e.mandatory = 1 THEN (CASE WHEN a.status = 'present' THEN 0 ELSE -1 END)
          ELSE (CASE WHEN a.status = 'present' THEN e.points ELSE 0 END)
        END) AS total_points
       FROM attendance a
       JOIN events e ON a.event_id = e.id
       WHERE a.user_id = ?
       GROUP BY e.category`
    )
    .all(userId);
}

// -----------------------------------------------------------------------------
// Counts and maintenance
// -----------------------------------------------------------------------------

function getCounts() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  const eventCount = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
  const attendanceCount = db.prepare('SELECT COUNT(*) AS c FROM attendance').get().c;
  return { userCount, eventCount, attendanceCount };
}

function countEvents() {
  return db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
}

function countAttendance() {
  return db.prepare('SELECT COUNT(*) AS c FROM attendance').get().c;
}

function resetSemester() {
  db.exec('DELETE FROM attendance; DELETE FROM events;');
}

// -----------------------------------------------------------------------------
// Raw / export (full rows for backup/export scripts)
// -----------------------------------------------------------------------------

function fetchAllUsersRaw() {
  return db.prepare('SELECT * FROM users').all();
}

function fetchAllEventsRaw() {
  return db.prepare('SELECT * FROM events').all();
}

function fetchAllAttendanceRaw() {
  return db.prepare('SELECT * FROM attendance').all();
}

/** For export-csv / verify: id, name, username, email, role_level ORDER BY name. */
function fetchAllUsersForCsv() {
  return db
    .prepare('SELECT id, name, username, email, role_level FROM users ORDER BY name')
    .all();
}

/** For verify-import: first 5 users. */
function fetchUsersLimit(limit) {
  return db
    .prepare('SELECT id, name, username, email, role_level FROM users LIMIT ?')
    .all(limit);
}

// -----------------------------------------------------------------------------
// Restore helpers (drop/clear tables, run raw SQL)
// -----------------------------------------------------------------------------

function dropTablesForRestore() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DROP TABLE IF EXISTS attendance; DROP TABLE IF EXISTS events; DROP TABLE IF EXISTS users;');
  db.exec('PRAGMA foreign_keys = ON;');
}

function clearTablesForRestore() {
  db.exec('DELETE FROM attendance; DELETE FROM events; DELETE FROM users;');
}

function execSql(sql) {
  db.exec(sql);
}

// -----------------------------------------------------------------------------
// Import helpers (upsert full row for import-from-single-json and import-data)
// -----------------------------------------------------------------------------

function upsertUserFull(row) {
  db.prepare(
    `INSERT OR REPLACE INTO users (id, name, username, email, password_hash, role_level, must_change_password, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.name,
    row.username,
    row.email,
    row.password_hash,
    row.role_level,
    row.must_change_password,
    row.is_active,
    row.created_at
  );
}

function upsertEventFull(row) {
  db.prepare(
    `INSERT OR REPLACE INTO events (id, name, category, date, points, created_by, semester, mandatory, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.name,
    row.category,
    row.date,
    row.points,
    row.created_by,
    row.semester,
    row.mandatory ?? 0,
    row.created_at
  );
}

function upsertAttendanceFull(row) {
  db.prepare(
    `INSERT OR REPLACE INTO attendance (id, user_id, event_id, status, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(row.id, row.user_id, row.event_id, row.status, row.created_at);
}

/** SQLite: INSERT with ON CONFLICT (import-data.js uses this pattern). */
function upsertUserForImport(row) {
  db.prepare(
    `INSERT INTO users (id, name, username, email, password_hash, role_level, must_change_password, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       username = excluded.username,
       email = excluded.email,
       password_hash = excluded.password_hash,
       role_level = excluded.role_level,
       must_change_password = excluded.must_change_password,
       is_active = excluded.is_active`
  ).run(
    row.id,
    row.name,
    row.username,
    row.email,
    row.password_hash,
    row.role_level,
    row.must_change_password,
    row.is_active,
    row.created_at
  );
}

function upsertEventForImport(row) {
  db.prepare(
    `INSERT INTO events (id, name, category, date, points, created_by, semester, mandatory, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       category = excluded.category,
       date = excluded.date,
       points = excluded.points,
       created_by = excluded.created_by,
       semester = excluded.semester,
       mandatory = excluded.mandatory`
  ).run(
    row.id,
    row.name,
    row.category,
    row.date,
    row.points,
    row.created_by,
    row.semester,
    row.mandatory ?? 0,
    row.created_at
  );
}

function upsertAttendanceForImport(row) {
  db.prepare(
    `INSERT INTO attendance (id, user_id, event_id, status, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       event_id = excluded.event_id,
       status = excluded.status`
  ).run(row.id, row.user_id, row.event_id, row.status, row.created_at);
}

// Attach all functions to db so require('./db') gives one object
Object.assign(db, {
  countUsers,
  fetchOneUser,
  fetchOneUserSafe,
  fetchUserByLoginIdentifier,
  fetchOneUserForMe,
  fetchUserRoleLevel,
  fetchUserForPasswordChange,
  fetchAllUsers,
  fetchActiveUserIds,
  fetchActiveMembersForPoints,
  fetchUserByUsername,
  fetchUsersWithPctLocalEmail,
  fetchUserByEmailOrRole3,
  insertOneUser,
  insertOneUserWithActive,
  updateUserForCsvImport,
  updateUserRole,
  deactivateUser,
  updateUserPassword,
  updateUserEmail,
  updateUserRoleLevelByEmail,
  fetchOneEvent,
  fetchAllEvents,
  insertOneEvent,
  updateEvent,
  deleteEvent,
  fetchAttendanceByEventId,
  insertOneAttendance,
  deleteAttendanceByEventId,
  fetchPointsSummaryByUserId,
  getCounts,
  countEvents,
  countAttendance,
  resetSemester,
  fetchAllUsersRaw,
  fetchAllEventsRaw,
  fetchAllAttendanceRaw,
  fetchAllUsersForCsv,
  fetchUsersLimit,
  dropTablesForRestore,
  clearTablesForRestore,
  execSql,
  upsertUserFull,
  upsertEventFull,
  upsertAttendanceFull,
  upsertUserForImport,
  upsertEventForImport,
  upsertAttendanceForImport,
});

module.exports = db;
