// Export users to CSV (no passwords - for re-import via import_from_csv with new password)
const db = require('./db');
const fs = require('fs');

const users = db.fetchAllUsersForCsv();
const header = 'First Name,Last Name,Net ID\n';
const rows = users.map(u => {
  const parts = (u.name || '').trim().split(/\s+/);
  const first = parts[0] || '';
  const last = parts.slice(1).join(' ') || '';
  const netId = u.username || '';
  return `"${first}","${last}","${netId}"`;
});
fs.writeFileSync('exported-users.csv', header + rows.join('\n'));
console.log(`✓ Exported ${users.length} users to exported-users.csv (no passwords)`);
console.log('  Use this with import_from_csv.js in production (users will set password on first login).');
