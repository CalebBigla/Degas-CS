const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

db.all('SELECT id, name, form_name FROM form_definitions LIMIT 10', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (!rows || rows.length === 0) {
    console.log('No forms found in database.');
    db.close();
    process.exit(0);
  }
  
  console.log('Current forms in database:');
  rows.forEach(r => {
    console.log(`  - ${r.form_name || r.name} (ID: ${r.id})`);
  });
  
  // Check for Student Onboarding Form
  const hasOld = rows.some(r => (r.form_name || r.name) === 'Student Onboarding Form');
  if (hasOld) {
    console.log('\n✅ Found old form "Student Onboarding Form" - needs to be renamed');
  }
  
  db.close();
});
