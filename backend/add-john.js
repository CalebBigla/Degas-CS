const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data/degas.db'));
const hash = bcrypt.hashSync('password123', 10);
const uid = uuidv4();
const formId = '06aa4b67-76fe-411a-a1e0-682871e8506f';

db.run(
  'INSERT OR IGNORE INTO users (id, name, email, phone, address, password, formid, scanned, createdat, updatedat) VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime("now"), datetime("now"))',
  [uid, 'John Smith', 'john.smith@example.com', '+1(555)100-0001', '100 Main St', hash, formId],
  function(err) {
    if (err) {
      console.log('❌ Error:', err.message);
    } else {
      console.log('✅ Created john.smith@example.com (password: password123)');
    }
    db.close();
  }
);
