const sqlite3 = require('sqlite3').verbose();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./data/degas.db');

async function createGraceForm() {
  try {
    // Check if form already exists
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT id, name, link FROM forms WHERE name = ?', ['The Force of Grace Ministry'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      console.log('✅ "The Force of Grace Ministry" form already exists');
      console.log('   ID:', existing.id);
      console.log('   Name:', existing.name);
      console.log('   Link:', existing.link);
      db.close();
      return;
    }

    // Create the form
    const formId = uuidv4();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const registrationLink = `${frontendUrl}/register/${formId}`;

    // Generate QR code as base64
    console.log('📱 Generating QR code...');
    const qrCodeData = await QRCode.toDataURL(registrationLink, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });

    // Insert form into database
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO forms (id, name, link, qrCode, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [formId, 'The Force of Grace Ministry', registrationLink, qrCodeData],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('\n✅ "The Force of Grace Ministry" form created successfully!\n');
    console.log('Form Details:');
    console.log('  ID:', formId);
    console.log('  Name: The Force of Grace Ministry');
    console.log('  Registration Link:', registrationLink);
    console.log('  QR Code: Generated (base64)');
    console.log('  Status: Active');
    console.log('\n📋 Users can register at:');
    console.log('  ', registrationLink);
    console.log('\n🔗 API Endpoints:');
    console.log('   GET  /api/fixed-forms/' + formId + ' - Get form details');
    console.log('   GET  /api/users/' + formId + ' - Get registered users');
    console.log('   POST /api/auth/register/' + formId + ' - Register new user');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
  }
}

createGraceForm();
