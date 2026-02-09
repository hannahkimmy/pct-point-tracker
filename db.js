const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Use SQLite for now (works on most platforms with persistent storage)
// For PostgreSQL migration, see DEPLOYMENT.md
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'pcpoints.sqlite');

// Ensure the directory exists (e.g. /data for Railway volumes)
// On Railway, /data should already exist from volume mount, so we skip creating root-level dirs
const dbDir = path.dirname(dbPath);
const isRootLevel = path.isAbsolute(dbDir) && dbDir.split(path.sep).length <= 2; // e.g., /data or C:\data

if (dbDir !== '.' && !isRootLevel && !fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (e) {
    // If directory creation fails, that's okay - on Railway /data exists from volume,
    // and better-sqlite3 will give a clearer error if the directory truly doesn't exist
    if (e.code !== 'EEXIST') {
      console.warn(`Warning: Could not create directory ${dbDir}: ${e.message}`);
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

  // Users table
  const hasUsers = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get();

  if (!hasUsers) {
    db.exec(`
      CREATE TABLE users (
        id                 INTEGER PRIMARY KEY AUTOINCREMENT,
        name               TEXT NOT NULL,
        username           TEXT NOT NULL UNIQUE, -- NetID or login name
        email              TEXT,                -- optional
        password_hash      TEXT NOT NULL,
        role_level         INTEGER NOT NULL DEFAULT 0,
        must_change_password INTEGER NOT NULL DEFAULT 0,
        is_active          INTEGER NOT NULL DEFAULT 1,
        created_at         DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    // Cheap migrations for existing DBs if you've already run an earlier version.
    const columns = db.prepare('PRAGMA table_info(users)').all();
    const colNames = columns.map((c) => c.name);

    if (!colNames.includes('username')) {
      // SQLite cannot add a UNIQUE column via ALTER TABLE; add plain TEXT then index.
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

  // Events table
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

  // Migration: add mandatory column to existing events tables
  const eventCols = db.prepare('PRAGMA table_info(events)').all();
  if (eventCols.length && !eventCols.some((c) => c.name === 'mandatory')) {
    db.exec('ALTER TABLE events ADD COLUMN mandatory INTEGER NOT NULL DEFAULT 0');
  }

  // Attendance table
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

module.exports = db;

