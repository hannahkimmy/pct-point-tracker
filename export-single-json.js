// Export everything into ONE JSON file (easier to upload to Railway)
const db = require('./db');
const fs = require('fs');

const data = {
  users: db.prepare('SELECT * FROM users').all(),
  events: db.prepare('SELECT * FROM events').all(),
  attendance: db.prepare('SELECT * FROM attendance').all(),
  exportedAt: new Date().toISOString()
};

fs.writeFileSync('exported-all.json', JSON.stringify(data, null, 2));
console.log(`✓ Exported to exported-all.json`);
console.log(`  - ${data.users.length} users`);
console.log(`  - ${data.events.length} events`);
console.log(`  - ${data.attendance.length} attendance records`);
console.log('\n⚠️  Contains password hashes - keep secure!');
console.log('   To import: use import-from-single-json.js (run on Railway after uploading this file).');
