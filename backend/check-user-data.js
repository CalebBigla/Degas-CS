const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

const userId = 'f4e396a8-fe92-4964-9a83-445c16263298';

db.get(`
  SELECT id, data FROM dynamic_users WHERE id = ?
`, [userId], (err, user) => {
  if(err) {
    console.error('Error:', err.message);
  } else if(user) {
    console.log('User ID:', user.id);
    console.log('Stored data:');
    try {
      const data = JSON.parse(user.data);
      console.log(JSON.stringify(data, null, 2));
    } catch(e) {
      console.log(user.data);
    }
  } else {
    console.log('User not found');
  }
  db.close();
});
