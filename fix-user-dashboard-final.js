const fs = require('fs');

const filePath = 'frontend/src/pages/UserDashboardPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Add missing closing brace to handleLogout
content = content.replace(
  `const handleLogout = () => {
    logout();
    navigate('/login');
  const downloadQRCode`,
  `const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const downloadQRCode`
);

// Fix 2: Remove the entire old downloadQRCode function (it's broken and duplicated)
// Find the start of downloadQRCode and remove until the end of the second try-catch
const downloadQRCodeStart = content.indexOf('const downloadQRCode = async () => {');
if (downloadQRCodeStart !== -1) {
  // Find the end - look for the pattern that marks the end of this broken function
  const searchFrom = downloadQRCodeStart;
  const endPattern = `  };

  const startScanner = () => {`;
  const downloadQRCodeEnd = content.indexOf(endPattern, searchFrom);
  
  if (downloadQRCodeEnd !== -1) {
    // Remove the entire broken downloadQRCode function
    content = content.substring(0, downloadQRCodeStart) + content.substring(downloadQRCodeEnd + 6); // +6 to keep the closing };
  }
}

// Fix 3: Rename all onClick={downloadQRCode} to onClick={downloadIDCard}
content = content.replace(/onClick={downloadQRCode}/g, 'onClick={downloadIDCard}');

// Fix 4: Update button text from "Download QR Code" to "Download ID Card"
content = content.replace(/Download QR Code/g, 'Download ID Card');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Fixed UserDashboardPage.tsx');
console.log('  - Added missing closing brace to handleLogout');
console.log('  - Removed broken downloadQRCode function');
console.log('  - Updated button onClick handlers to use downloadIDCard');
console.log('  - Updated button text to "Download ID Card"');
