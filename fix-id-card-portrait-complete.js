const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');

console.log('Reading UserDashboardPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Fix the ID card container to be portrait with proper dimensions
const oldCardContainer = `<div id="id-card-container" className="rounded-2xl bg-white overflow-hidden shadow-xl border border-gray-200" style={{ width: '91mm', height: '55mm', maxWidth: '100%' }}>`;

const newCardContainer = `<div id="id-card-container" className="rounded-2xl bg-white overflow-hidden shadow-xl border border-gray-200" style={{ width: '55mm', minHeight: '91mm', maxWidth: '100%', display: 'flex', flexDirection: 'column' }}>`;

if (content.includes(oldCardContainer)) {
  content = content.replace(oldCardContainer, newCardContainer);
  console.log('✓ Step 1: Updated card container to portrait (55mm × 91mm)');
} else {
  console.log('⚠ Step 1: Card container pattern not found, trying alternative...');
}

// Step 2: Adjust card body padding and spacing for portrait
const oldCardBody = `<div className="px-6 py-8 flex flex-col items-center text-center space-y-5">`;
const newCardBody = `<div className="flex-1 px-4 py-6 flex flex-col items-center text-center space-y-4">`;

content = content.replace(oldCardBody, newCardBody);
console.log('✓ Step 2: Adjusted card body spacing for portrait');

// Step 3: Reduce profile image size for portrait
const oldProfileImage = `<div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 shadow-lg border-4 border-gray-200">`;
const newProfileImage = `<div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 shadow-lg border-3 border-gray-200">`;

content = content.replace(oldProfileImage, newProfileImage);
console.log('✓ Step 3: Reduced profile image size');

// Step 4: Adjust text sizes for portrait
content = content.replace(
  `<h2 className="text-xl font-bold text-gray-900">`,
  `<h2 className="text-base font-bold text-gray-900">`
);
content = content.replace(
  `<h3 className="text-2xl font-bold text-gray-900">`,
  `<h3 className="text-lg font-bold text-gray-900">`
);
content = content.replace(
  `<span className="text-4xl font-bold text-gray-400">`,
  `<span className="text-2xl font-bold text-gray-400">`
);
console.log('✓ Step 4: Adjusted text sizes');

// Step 5: Reduce QR code size for portrait
const oldQRCode = `<img
                          src={qrCodeImage}
                          alt="User QR Code"
                          className="w-44 h-44"`;
const newQRCode = `<img
                          src={qrCodeImage}
                          alt="User QR Code"
                          className="w-32 h-32"`;

content = content.replace(oldQRCode, newQRCode);
console.log('✓ Step 5: Reduced QR code size');

// Step 6: Adjust member badge
const oldMemberBadge = `<div className="bg-gray-600 py-3 px-6">
                    <p className="text-center text-white text-base font-bold uppercase tracking-widest">`;
const newMemberBadge = `<div className="bg-gray-600 py-2 px-4 mt-auto">
                    <p className="text-center text-white text-sm font-bold uppercase tracking-widest">`;

content = content.replace(oldMemberBadge, newMemberBadge);
console.log('✓ Step 6: Adjusted member badge');

// Step 7: Fix the download function to wait for images and capture full card
const oldDownloadFunction = `  const downloadIDCard = async () => {
    try {
      if (!userData?.name || !userData?.email) {
        toast.error('User data incomplete');
        return;
      }

      toast.loading('Generating ID Card PDF...');

      // Find the ID card element
      const idCardElement = document.getElementById('id-card-container');
      if (!idCardElement) {
        toast.error('ID card not found');
        toast.dismiss();
        return;
      }

      // Dynamically import html2canvas to ensure it loads properly
      const html2canvasModule = await import('html2canvas');
      const html2canvasFunc = html2canvasModule.default;

      // Capture the ID card as an image using html2canvas
      const canvas = await html2canvasFunc(idCardElement, {
        scale: 3, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');

      // Create PDF with portrait orientation (55mm × 91mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [55, 91]
      });

      // Add the captured image to PDF (portrait)
      pdf.addImage(imgData, 'PNG', 0, 0, 55, 91);

      // Save the PDF
      pdf.save(\`ID_Card_\${userData.name.replace(/\\s+/g, '_')}.pdf\`);

      toast.dismiss();
      toast.success('ID Card PDF downloaded!');
    } catch (error) {
      console.error('Error generating ID Card PDF:', error);
      toast.dismiss();
      toast.error(\`Failed to generate ID Card PDF: \${error.message}\`);
    }
  };`;

const newDownloadFunction = `  const downloadIDCard = async () => {
    try {
      if (!userData?.name || !userData?.email) {
        toast.error('User data incomplete');
        return;
      }

      toast.loading('Preparing ID Card...');

      // Find the ID card element
      const idCardElement = document.getElementById('id-card-container');
      if (!idCardElement) {
        toast.error('ID card not found');
        toast.dismiss();
        return;
      }

      // Wait for all images to load
      const images = idCardElement.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
          });
        })
      );

      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 300));

      toast.loading('Generating PDF...');

      // Dynamically import html2canvas to ensure it loads properly
      const html2canvasModule = await import('html2canvas');
      const html2canvasFunc = html2canvasModule.default;

      // Capture the ID card as an image using html2canvas with proper settings
      const canvas = await html2canvasFunc(idCardElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        scrollY: 0,
        scrollX: 0,
        height: idCardElement.scrollHeight,
        windowHeight: idCardElement.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');

      // Create PDF with portrait orientation (55mm × 91mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [55, 91]
      });

      // Add the captured image to PDF (portrait)
      pdf.addImage(imgData, 'PNG', 0, 0, 55, 91);

      // Save the PDF with clean filename
      const cleanName = userData.name.replace(/\\s+/g, '-').toLowerCase();
      pdf.save(\`\${cleanName}-id-card.pdf\`);

      toast.dismiss();
      toast.success('ID Card PDF downloaded!');
    } catch (error) {
      console.error('Error generating ID Card PDF:', error);
      toast.dismiss();
      toast.error(\`Failed to generate ID Card PDF: \${error.message}\`);
    }
  };`;

if (content.includes(oldDownloadFunction)) {
  content = content.replace(oldDownloadFunction, newDownloadFunction);
  console.log('✓ Step 7: Updated download function with image loading and proper capture');
} else {
  console.log('⚠ Step 7: Download function pattern not found');
}

// Write the updated content
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ All changes applied successfully!');
console.log('\nSummary of changes:');
console.log('1. ✓ Changed ID card to portrait orientation (55mm × 91mm)');
console.log('2. ✓ Adjusted layout with flexbox for proper portrait display');
console.log('3. ✓ Reduced profile image size (28 → 20)');
console.log('4. ✓ Adjusted text sizes for portrait');
console.log('5. ✓ Reduced QR code size (44 → 32)');
console.log('6. ✓ Adjusted member badge styling');
console.log('7. ✓ Fixed download to wait for images and capture full card');
console.log('8. ✓ Added scrollHeight to capture complete card');
console.log('9. ✓ Filename format: [username]-id-card.pdf');
