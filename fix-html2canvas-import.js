const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');

console.log('Reading UserDashboardPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the downloadIDCard function to use dynamic imports
const oldFunction = `  const downloadIDCard = async () => {
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
        return;
      }

      // Capture the ID card as an image using html2canvas
      const canvas = await html2canvas(idCardElement, {
        scale: 3, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');

      // Create PDF with credit card dimensions (91mm × 55mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [91, 55]
      });

      // Add the captured image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, 91, 55);

      // Save the PDF
      pdf.save(\`ID_Card_\${userData.name}.pdf\`);

      toast.dismiss();
      toast.success('ID Card PDF downloaded!');
    } catch (error) {
      console.error('Error generating ID Card PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate ID Card PDF');
    }
  };`;

const newFunction = `  const downloadIDCard = async () => {
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

      // Create PDF with credit card dimensions (91mm × 55mm)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [91, 55]
      });

      // Add the captured image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, 91, 55);

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

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  console.log('✓ Successfully updated downloadIDCard function with dynamic import');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ File updated successfully!');
  console.log('\nChanges made:');
  console.log('1. ✓ Added dynamic import for html2canvas to ensure proper loading');
  console.log('2. ✓ Added better error handling with error message display');
  console.log('3. ✓ Fixed filename to replace spaces with underscores');
  console.log('4. ✓ Added toast.dismiss() when element not found');
  console.log('\nThis should fix the "html2canvas is not defined" error!');
} else {
  console.log('✗ Could not find the exact function to replace');
  console.log('The function may have a different format');
}
