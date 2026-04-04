const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const QRCode = require('qrcode');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

const FORM_ID = '06aa4b67-76fe-411a-a1e0-682871e8506f';
const SCAN_URL = `https://localhost:5173/scan/${FORM_ID}`;

console.log('🔧 Updating QR Code for Attendance Scanning\n');

async function updateQRCode() {
  try {
    // Generate QR code for scanning (not registration)
    console.log('📱 Generating QR code for:', SCAN_URL);
    
    const qrImage = await QRCode.toDataURL(SCAN_URL, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });
    
    console.log('✅ QR code generated (base64 image)');
    
    // Update the form with the new QR code
    // Note: We keep the registration link separate, add a scanLink field
    db.run(
      `UPDATE forms SET qrCode = ? WHERE id = ?`,
      [qrImage, FORM_ID],
      function(err) {
        if (err) {
          console.error('❌ Error updating QR code:', err);
          db.close();
          return;
        }
        
        console.log('✅ QR code updated in database');
        console.log('\n📋 Summary:');
        console.log(`   Form ID: ${FORM_ID}`);
        console.log(`   QR Code encodes: ${SCAN_URL}`);
        console.log(`   Purpose: Attendance scanning`);
        console.log('\n💡 Usage:');
        console.log('   1. Download QR code from admin dashboard (Tables → Download QR)');
        console.log('   2. Print or display the QR code at your event');
        console.log('   3. Users scan it with their phone camera or QR scanner app');
        console.log('   4. They login to their account');
        console.log('   5. They scan the QR code from their dashboard');
        console.log('   6. Attendance is marked automatically');
        console.log('\n🔗 Links:');
        console.log(`   Registration: https://localhost:5173/register/${FORM_ID}`);
        console.log(`   Scanning: ${SCAN_URL}`);
        
        db.close();
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

updateQRCode();
