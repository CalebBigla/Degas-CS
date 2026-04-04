const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const QRCode = require('qrcode');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking QR Code Content\n');

db.get('SELECT id, name, link, qrCode FROM forms WHERE id = ?', ['06aa4b67-76fe-411a-a1e0-682871e8506f'], async (err, form) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }
  
  if (!form) {
    console.log('❌ Form not found');
    db.close();
    return;
  }
  
  console.log('📋 Form Details:');
  console.log(`   Name: ${form.name}`);
  console.log(`   ID: ${form.id}`);
  console.log(`   Link: ${form.link}`);
  console.log(`   QR Code: ${form.qrCode ? 'Present (base64 image)' : 'Missing'}`);
  
  // The QR code is a base64 image, but we need to know what URL it encodes
  // Let's check what the link field says
  console.log('\n🔗 Current Link Analysis:');
  if (form.link.includes('/register/')) {
    console.log('   ⚠️  Link points to REGISTRATION page');
    console.log('   ❌ This is for NEW USER REGISTRATION, not attendance scanning');
    console.log('\n💡 For attendance scanning, the QR should encode:');
    console.log(`   https://localhost:5173/scan/${form.id}`);
    console.log('\n🔧 Recommendation: Update the QR code to scan URL');
  } else if (form.link.includes('/scan/')) {
    console.log('   ✅ Link points to SCAN page');
    console.log('   ✅ This is correct for attendance scanning');
  } else {
    console.log('   ⚠️  Unknown link format');
  }
  
  db.close();
});
