const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');

console.log('Reading UserDashboardPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the PDF generation part to use portrait orientation
const oldPdfCreation = `      // Create PDF with credit card dimensions (91mm × 55mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [91, 55]
      });

      // Add the captured image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, 91, 55);`;

const newPdfCreation = `      // Create PDF with portrait orientation (55mm × 91mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [55, 91]
      });

      // Add the captured image to PDF (portrait)
      pdf.addImage(imgData, 'PNG', 0, 0, 55, 91);`;

if (content.includes(oldPdfCreation)) {
  content = content.replace(oldPdfCreation, newPdfCreation);
  console.log('✓ Successfully updated PDF orientation to portrait');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ File updated successfully!');
  console.log('\nChanges made:');
  console.log('1. ✓ Changed PDF orientation from landscape to portrait');
  console.log('2. ✓ Changed dimensions from 91mm × 55mm to 55mm × 91mm');
  console.log('3. ✓ Updated image placement to match portrait format');
  console.log('\nThe PDF will now download in portrait orientation matching the system display!');
} else {
  console.log('✗ Could not find the exact PDF creation code');
  console.log('Trying alternative approach...');
  
  // Try a more flexible pattern
  const altPattern = /const pdf = new jsPDF\(\{[\s\S]*?orientation: 'landscape',[\s\S]*?format: \[91, 55\][\s\S]*?\}\);[\s\S]*?pdf\.addImage\(imgData, 'PNG', 0, 0, 91, 55\);/;
  
  if (altPattern.test(content)) {
    content = content.replace(altPattern, `const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [55, 91]
      });

      // Add the captured image to PDF (portrait)
      pdf.addImage(imgData, 'PNG', 0, 0, 55, 91);`);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ Successfully updated PDF orientation using alternative pattern!');
  } else {
    console.log('✗ Could not find PDF creation code with either pattern');
  }
}
