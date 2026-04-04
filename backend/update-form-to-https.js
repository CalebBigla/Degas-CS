/**
 * Update Form Links to HTTPS
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const QRCode = require('qrcode');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

const FORM_ID = '06aa4b67-76fe-411a-a1e0-682871e8506f';
const FRONTEND_URL = 'https://localhost:5173'; // Change to HTTPS

console.log('🔄 Updating form to use HTTPS...\n');

db.serialize(async () => {
  // Get current form
  db.get('SELECT * FROM forms WHERE id = ?', [FORM_ID], async (err, form) => {
    if (err) {
      console.error('❌ Error getting form:', err);
      db.close();
      return;
    }

    if (!form) {
      console.error('❌ Form not found');
      db.close();
      return;
    }

    console.log('📋 Current form:');
    console.log('   Name:', form.name);
    console.log('   Link:', form.link);
    console.log('');

    // Generate new HTTPS link
    const newLink = `${FRONTEND_URL}/register/${FORM_ID}`;
    const scanUrl = `${FRONTEND_URL}/scan/${FORM_ID}`;

    console.log('🔄 Updating to:');
    console.log('   New Link:', newLink);
    console.log('   Scan URL:', scanUrl);
    console.log('');

    try {
      // Generate new QR code with HTTPS scan URL
      const qrCodeData = await QRCode.toDataURL(scanUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2
      });

      // Update form
      db.run(
        `UPDATE forms SET link = ?, qrCode = ?, updatedAt = datetime('now') WHERE id = ?`,
        [newLink, qrCodeData, FORM_ID],
        function(err) {
          if (err) {
            console.error('❌ Error updating form:', err);
          } else {
            console.log('✅ Form updated successfully!');
            console.log('   Rows affected:', this.changes);
            console.log('');
            console.log('📝 New registration link:');
            console.log('   ' + newLink);
            console.log('');
            console.log('📱 QR code updated to scan URL:');
            console.log('   ' + scanUrl);
          }
          db.close();
        }
      );
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      db.close();
    }
  });
});
