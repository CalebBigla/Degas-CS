const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');

  // Check core_users
  db.get('SELECT COUNT(*) as count FROM core_users', (err, row) => {
    if (err) {
      console.error('❌ Error querying core_users:', err);
    } else {
      console.log('\n👥 CORE_USERS total:', row.count);
      
      db.all('SELECT id, user_id, email, full_name, phone FROM core_users LIMIT 5', (err, rows) => {
        if (err) console.error('Error:', err);
        else {
          console.log('Users:');
          rows.forEach(u => console.log(`  - ${u.email} (${u.full_name})`));
        }
        
        // Now add test users if none exist
        if (row.count === 0) {
          console.log('\n➕ Adding test users...');
          const crypto = require('crypto');
          
          db.run(
            `INSERT INTO core_users (id, user_id, email, full_name, phone, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [crypto.randomUUID(), 'user1', 'john@example.com', 'John Doe', '555-0001'],
            function(err) {
              if (err) console.error('Error inserting user1:', err);
              else console.log('✅ Added: john@example.com');
              
              db.run(
                `INSERT INTO core_users (id, user_id, email, full_name, phone, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [crypto.randomUUID(), 'user2', 'jane@example.com', 'Jane Smith', '555-0002'],
                function(err) {
                  if (err) console.error('Error inserting user2:', err);
                  else console.log('✅ Added: jane@example.com');
                  
                  // Verify
                  db.get('SELECT COUNT(*) as count FROM core_users', (err, finalRow) => {
                    console.log('\n📊 Final users count:', finalRow?.count);
                    db.close();
                  });
                }
              );
            }
          );
        } else {
          db.close();
        }
      });
    }
  });
});
