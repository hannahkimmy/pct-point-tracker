// One-off script to import members from the
// "Fall 25 Active Directory-Grid view.csv" file into the SQLite DB.
//
// - username  = Net ID
// - name      = "First Name Last Name"
// - password  = "pctattendance" (must_change_password = 1)
// - role      = 0 (member; view-only)

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

// Allow CSV path from command line: node import_from_csv.js [path/to/file.csv]
// Otherwise try: members.csv, then Fall 25 Active Directory-Grid view.csv
const CSV_FILE = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : (fs.existsSync(path.join(__dirname, 'members.csv'))
      ? path.join(__dirname, 'members.csv')
      : path.join(__dirname, 'Fall 25 Active Directory-Grid view.csv'));

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        // Escaped quote
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\r') {
        // ignore, handle on '\n'
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += c;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function main() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error('CSV file not found:', CSV_FILE);
    console.error('Usage: node import_from_csv.js [path/to/members.csv]');
    console.error('Or add a file named members.csv in the project root and run: npm run import:csv');
    process.exit(1);
  }

  const text = fs.readFileSync(CSV_FILE, 'utf8').trim();
  if (!text.length) {
    console.error('CSV file is empty (0 bytes). Make sure the file has content.');
    process.exit(1);
  }

  const rows = parseCsv(text);
  if (!rows.length) {
    console.error('CSV file could not be parsed (no rows). Check that it has a header row and "First Name", "Last Name", "Net ID" columns.');
    process.exit(1);
  }

  const header = rows[0];
  const idxFirst = header.indexOf('First Name');
  const idxLast = header.indexOf('Last Name');
  const idxNetId = header.indexOf('Net ID');

  if (idxFirst === -1 || idxLast === -1 || idxNetId === -1) {
    console.error('Could not find expected columns: "First Name", "Last Name", "Net ID"');
    process.exit(1);
  }

  const defaultPassword = 'pctattendance';
  const defaultHash = bcrypt.hashSync(defaultPassword, 10);

  const txn = db.transaction(() => {
    let created = 0;
    let updated = 0;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;

      const firstName = String(r[idxFirst] || '').trim();
      const lastName = String(r[idxLast] || '').trim();
      const netId = String(r[idxNetId] || '').trim();

      if (!netId) continue;
      if (!firstName && !lastName) continue;

      const name = `${firstName} ${lastName}`.trim();

      const existing = db
        .prepare('SELECT id, role_level FROM users WHERE username = ?')
        .get(netId);

      // Never overwrite a level 2 admin (VP Communications)
      if (existing && existing.role_level >= 2) {
        continue;
      }

      if (existing) {
        db.prepare(
          `
            UPDATE users
            SET name = ?, password_hash = ?, role_level = 0,
                must_change_password = 1, is_active = 1
            WHERE id = ?
          `
        ).run(name, defaultHash, existing.id);
        updated++;
      } else {
        // Email must be NOT NULL and UNIQUE; use a unique placeholder per NetID.
        const emailPlaceholder = `${netId}@illinois.edu`;
        db.prepare(
          `
            INSERT INTO users (name, username, email, password_hash, role_level, must_change_password, is_active)
            VALUES (?, ?, ?, ?, 0, 1, 1)
          `
        ).run(name, netId, emailPlaceholder, defaultHash);
        created++;
      }
    }

    console.log(`Import complete. Created: ${created}, Updated: ${updated}`);
  });

  txn();
}

main();

