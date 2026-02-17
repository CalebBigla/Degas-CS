const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

const userId = '8bc42f7c-c0d4-4a75-8f9d-76fd241c6433';

// Check if user exists
db.get('SELECT id, table_id, uuid, data FROM dynamic_users WHERE id = ?', [userId], (err, user) => {
  if (err) {
    console.error('Error checking user:', err);
  } else if (user) {
    console.log('✅ User found:', {
      id: user.id,
      table_id: user.table_id,
      uuid: user.uuid,
      data: user.data ? 'exists' : 'null'
    });

    // Check if referenced table exists
    db.get('SELECT id, name FROM tables WHERE id = ?', [user.table_id], (err, table) => {
      if (err) {
        console.error('Error checking table:', err);
      } else if (table) {
        console.log('✅ Table found:', table);
      } else {
        console.log('❌ Table NOT found with id:', user.table_id);
        // List all tables
        db.all('SELECT id, name FROM tables', (err, tables) => {
          if (err) {
            console.error('Error listing tables:', err);
          } else {
            console.log('Available tables:', tables);
          }
          db.close();
        });
      }
    });
  } else {
    console.log('❌ User NOT found with id:', userId);
    db.close();
  }
});
