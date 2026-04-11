const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');

console.log('Reading UserDashboardPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the downloadIDCard function to use html2canvas
const oldFunction = `  const downloadIDCard = async () => {
    try {
      if (!userData?.name || !userData?.email) {
        toast.error('User data incomplete');
        return;
      }

      toast.loading('Generating ID Card PDF...');

      // Generate QR code as image
      let qrCodeDataUrl = qrCodeImage;
      if (!qrCodeDataUrl) {
        // Generate QR code from user data if not available
        const qrData = JSON.stringify({ userId: userData.userId || userData.id, name: userData.name });
        qrCodeDataUrl = await QRCode.toDataURL(qrData);
      }

      // Create PDF (A6 ID card size: 105mm x 148mm landscape)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [105, 148]
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Background color (dark)
      pdf.setFillColor(26, 26, 26);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Header background
      pdf.setFillColor(15, 15, 15);
      pdf.rect(0, 0, pageWidth, 15, 'F');

      // Header text: "The Force of Grace Ministry"
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('The Force of Grace Ministry', pageWidth / 2, 8, { align: 'center' });

      // TFG Badge in top right
      pdf.setFillColor(100, 150, 255);
      pdf.rect(pageWidth - 12, 2, 10, 10, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255);
      pdf.text('TFG', pageWidth - 7, 8, { align: 'center' });

      // Profile Image Area (circular, centered)
      const profileImageX = pageWidth / 2;
      const profileImageY = 28;
      const profileImageSize = 25;

      if (userData?.profileImageUrl) {
        try {
          pdf.addImage(userData.profileImageUrl, 'JPEG', profileImageX - profileImageSize / 2, profileImageY - profileImageSize / 2, profileImageSize, profileImageSize);
        } catch (imgError) {
          console.warn('Could not load profile image for PDF');
        }
      }

      // User Name
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text(userData.name, pageWidth / 2, 58, { align: 'center' });

      // "Member" label
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(180, 180, 180);
      pdf.text('MEMBER', pageWidth / 2, 65, { align: 'center' });

      // QR Code
      const qrSize = 30;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 72;
      if (qrCodeDataUrl) {
        pdf.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // Footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Scan to verify membership', pageWidth / 2, 110, { align: 'center' });

      // Save
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

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  console.log('✓ Successfully replaced downloadIDCard function');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ File updated successfully!');
  console.log('\nChanges made:');
  console.log('1. ✓ Function now uses html2canvas to capture the id-card-container element');
  console.log('2. ✓ PDF dimensions set to 91mm × 55mm (credit card size)');
  console.log('3. ✓ Captures the white background ID card exactly as displayed');
  console.log('4. ✓ Removed hardcoded dark theme PDF generation');
  console.log('\nThe PDF download will now capture ONLY the white ID card area!');
} else {
  console.log('✗ Could not find the exact downloadIDCard function to replace');
  console.log('The function may have already been updated or has a different structure');
}
