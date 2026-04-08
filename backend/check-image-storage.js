#!/usr/bin/env node

/**
 * Diagnostic script to check profile image storage configuration
 * Run: node check-image-storage.js
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const logger = {
  info: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  section: (title) => console.log(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}`),
};

async function checkImageStorage() {
  logger.section('🖼️  Profile Image Storage Diagnostic');

  try {
    // Check environment variables
    logger.section('1. Environment Configuration');
    
    const useCloudinary = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (useCloudinary) {
      logger.info('CLOUDINARY_CLOUD_NAME is set');
      logger.info(`  Value: ${process.env.CLOUDINARY_CLOUD_NAME}`);
      logger.info('CLOUDINARY_API_KEY is set');
      logger.info(`  Length: ${process.env.CLOUDINARY_API_KEY?.length} chars`);
      logger.info('CLOUDINARY_API_SECRET is set');
      logger.info(`  Length: ${process.env.CLOUDINARY_API_SECRET?.length} chars`);
      logger.info('📦 Storage Mode: CLOUDINARY (PERSISTENT) ✅');
    } else {
      logger.warn('Cloudinary NOT configured');
      logger.warn('📦 Storage Mode: LOCAL FILESYSTEM (EPHEMERAL)');
      
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        logger.warn('  - CLOUDINARY_CLOUD_NAME is missing');
      }
      if (!process.env.CLOUDINARY_API_KEY) {
        logger.warn('  - CLOUDINARY_API_KEY is missing');
      }
      if (!process.env.CLOUDINARY_API_SECRET) {
        logger.warn('  - CLOUDINARY_API_SECRET is missing');
      }
    }

    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    logger.info(`UPLOAD_DIR: ${uploadDir}`);
    logger.info(`DATABASE_TYPE: ${process.env.DATABASE_TYPE || 'sqlite'}`);

    // Check local uploads directory
    logger.section('2. Local Uploads Directory');
    
    try {
      const uploadsExist = await fs.stat(uploadDir);
      logger.info(`✅ Uploads directory exists: ${uploadDir}`);
      
      // List files
      const files = await fs.readdir(uploadDir);
      logger.info(`📁 Files in uploads directory: ${files.length}`);
      
      if (files.length > 0) {
        logger.info('Files:');
        files.slice(0, 10).forEach(file => {
          logger.info(`  - ${file}`);
        });
        if (files.length > 10) {
          logger.info(`  ... and ${files.length - 10} more files`);
        }
      } else {
        logger.warn('⚠️  No files in uploads directory (ephemeral storage, or fresh deployment)');
      }
    } catch (err) {
      logger.warn(`Uploads directory does not exist or not accessible: ${uploadDir}`);
    }

    // Check database
    logger.section('3. Database Image Records');
    
    try {
      const dbType = process.env.DATABASE_TYPE || 'sqlite';
      
      if (dbType === 'sqlite') {
        const sqlite3 = require('sqlite3');
        const Database = sqlite3.Database;
        const dbPath = process.env.DATABASE_DIR || 'data/degas.db';
        
        const db = new Database(dbPath, (err) => {
          if (err) {
            logger.error(`Failed to connect to SQLite: ${err.message}`);
            return;
          }

          db.all(
            'SELECT id, name, email, profileimageurl FROM users WHERE profileimageurl IS NOT NULL LIMIT 10',
            (err, rows) => {
              if (err) {
                logger.error(`Database query failed: ${err.message}`);
                db.close();
                return;
              }

              if (!rows || rows.length === 0) {
                logger.warn('No users with profile images in database');
              } else {
                logger.info(`Found ${rows.length} users with profile images`);
                logger.info('Sample records:');
                rows.forEach((row, idx) => {
                  const url = row.profileimageurl;
                  const storageType = url?.startsWith('http') ? 'CLOUDINARY' : 'LOCAL';
                  logger.info(`  ${idx + 1}. ${row.name} (${row.email})`);
                  logger.info(`     Storage: ${storageType}`);
                  logger.info(`     URL: ${url?.substring(0, 50)}...`);
                });
              }

              db.close();
              printRecommendations(useCloudinary);
            }
          );
        });
      } else if (dbType === 'postgresql') {
        logger.warn('PostgreSQL database detected. Manual verification needed.');
        logger.warn('Connect to database and run:');
        logger.warn('  SELECT COUNT(*) FROM users WHERE profileimageurl IS NOT NULL;');
        printRecommendations(useCloudinary);
      }
    } catch (err) {
      logger.error(`Database check failed: ${err.message}`);
      printRecommendations(useCloudinary);
    }

  } catch (err) {
    logger.error(`Diagnostic failed: ${err.message}`);
    console.error(err);
  }
}

function printRecommendations(useCloudinary) {
  logger.section('4. Recommendations');

  if (!useCloudinary) {
    logger.warn('⚠️  CLOUDINARY NOT CONFIGURED');
    logger.warn('This means:');
    logger.warn('  • Profile images are stored locally (ephemeral)');
    logger.warn('  • Images disappear when server restarts/redeploys');
    logger.warn('  • Admin dashboard shows "No Photo" after restart');
    logger.warn('');
    logger.info('✅ RECOMMENDED: Configure Cloudinary');
    logger.info('  1. Visit: https://cloudinary.com/users/register/free');
    logger.info('  2. Create a free account');
    logger.info('  3. Get Cloud Name, API Key, and API Secret');
    logger.info('  4. Add to backend/.env:');
    logger.info('     CLOUDINARY_CLOUD_NAME=xxx');
    logger.info('     CLOUDINARY_API_KEY=xxx');
    logger.info('     CLOUDINARY_API_SECRET=xxx');
    logger.info('  5. For production (Render): Add to Environment variables');
    logger.info('  6. Redeploy backend');
    logger.info('');
    logger.info('📚 Full guide: CLOUDINARY_SETUP_GUIDE.md');
  } else {
    logger.info('✅ CLOUDINARY IS CONFIGURED');
    logger.info('Profile images will persist through deployments.');
    logger.info('');
    logger.info('If images still not showing:');
    logger.info('  1. Check Cloudinary dashboard for uploaded images');
    logger.info('  2. Verify credentials in Render environment');
    logger.info('  3. Check backend logs for Cloudinary errors');
    logger.info('  4. Try uploading a test image and check dashboard');
  }

  console.log('\n' + '='.repeat(60));
  console.log('Diagnostic complete. ✅\n');
}

// Run diagnostic
checkImageStorage().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
