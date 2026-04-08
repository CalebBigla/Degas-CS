/**
 * Test Cloudinary Upload
 * This script tests if Cloudinary is properly configured and can upload images
 */

require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

console.log('🔍 Checking Cloudinary Configuration...\n');

// Check if credentials are set
const hasCloudName = !!process.env.CLOUDINARY_CLOUD_NAME;
const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
const hasApiSecret = !!process.env.CLOUDINARY_API_SECRET;

console.log('Environment Variables:');
console.log(`  CLOUDINARY_CLOUD_NAME: ${hasCloudName ? '✅ Set' : '❌ Missing'}`);
console.log(`  CLOUDINARY_API_KEY: ${hasApiKey ? '✅ Set' : '❌ Missing'}`);
console.log(`  CLOUDINARY_API_SECRET: ${hasApiSecret ? '✅ Set' : '❌ Missing'}`);
console.log('');

if (!hasCloudName || !hasApiKey || !hasApiSecret) {
  console.log('❌ Cloudinary is NOT configured');
  console.log('\nTo configure Cloudinary:');
  console.log('1. Sign up at https://cloudinary.com');
  console.log('2. Get your credentials from the dashboard');
  console.log('3. Add to backend/.env:');
  console.log('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
  console.log('   CLOUDINARY_API_KEY=your_api_key');
  console.log('   CLOUDINARY_API_SECRET=your_api_secret');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('✅ Cloudinary credentials are configured\n');
console.log('📤 Testing upload with a sample base64 image...\n');

// Create a tiny 1x1 red pixel PNG as base64
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

// Test upload
cloudinary.uploader.upload(
  testImageBase64,
  {
    folder: 'degas-cs/user-photos',
    public_id: 'test-upload-' + Date.now(),
    format: 'webp',
    resource_type: 'image'
  },
  (error, result) => {
    if (error) {
      console.error('❌ Upload failed:', error.message);
      console.error('\nError details:', error);
      process.exit(1);
    }

    console.log('✅ Upload successful!\n');
    console.log('Upload Details:');
    console.log(`  Public ID: ${result.public_id}`);
    console.log(`  URL: ${result.secure_url}`);
    console.log(`  Format: ${result.format}`);
    console.log(`  Width: ${result.width}px`);
    console.log(`  Height: ${result.height}px`);
    console.log(`  Size: ${result.bytes} bytes`);
    console.log('');
    console.log('🎉 Cloudinary is working correctly!');
    console.log('   Images will be uploaded to:', result.secure_url.split('/').slice(0, -1).join('/'));
    
    // Clean up test image
    console.log('\n🧹 Cleaning up test image...');
    cloudinary.uploader.destroy(result.public_id, (delError) => {
      if (delError) {
        console.log('⚠️  Could not delete test image (not critical)');
      } else {
        console.log('✅ Test image deleted');
      }
      process.exit(0);
    });
  }
);
