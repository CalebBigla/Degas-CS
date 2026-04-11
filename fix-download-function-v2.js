const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');

console.log('Reading UserDashboardPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Find the downloadIDCard function and replace it
// Match from function start to the closing brace
const functionPattern = /const downloadIDCard = async \(\) => \{[\s\S]*?toast\.success\('ID Card PDF downloaded!'\);[\s\S]*?\} catch \(error\)[\s\S]*?toast\.error\('Failed to generate ID Card PDF'\);[\s\S]*?\}\s*\};/;

const newFunction = `const downloadIDCard = async () => {
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

if (functionPattern.test(content)) {
  content = content.replace(functionPattern, newFunction);
  console.log('✓ Successfully replaced downloadIDCard function using regex');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ File updated successfully!');
  console.log('\nChanges made:');
  console.log('1. ✓ Function now uses html2canvas to capture the id-card-container element');
  console.log('2. ✓ PDF dimensions set to 91mm × 55mm (credit card size)');
  console.log('3. ✓ Captures the white background ID card exactly as displayed');
  console.log('4. ✓ Removed hardcoded dark theme PDF generation');
  console.log('\nThe PDF download will now capture ONLY the white ID card area!');
} else {
  console.log('✗ Could not find the downloadIDCard function with regex');
  console.log('Trying alternative approach...');
  
  // Try finding just the function start
  if (content.includes('const downloadIDCard = async () => {')) {
    console.log('✓ Found function declaration');
    
    // Find the function and manually extract it
    const startIndex = content.indexOf('const downloadIDCard = async () => {');
    let braceCount = 0;
    let inFunction = false;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inFunction = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    
    const oldFunction = content.substring(startIndex, endIndex);
    content = content.substring(0, startIndex) + newFunction + content.substring(endIndex);
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ Successfully replaced function using manual parsing!');
    console.log('\nChanges made:');
    console.log('1. ✓ Function now uses html2canvas to capture the id-card-container element');
    console.log('2. ✓ PDF dimensions set to 91mm × 55mm (credit card size)');
    console.log('3. ✓ Captures the white background ID card exactly as displayed');
    console.log('4. ✓ Removed hardcoded dark theme PDF generation');
  } else {
    console.log('✗ Could not find downloadIDCard function at all');
  }
}
