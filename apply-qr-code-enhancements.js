const fs = require('fs');

const filePath = 'frontend/src/pages/UserDashboardPage_backup.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Add QRCode import at the top
if (!content.includes("import QRCode from 'qrcode'")) {
  content = content.replace(
    "import jsPDF from 'jspdf';",
    "import jsPDF from 'jspdf';\nimport QRCode from 'qrcode';"
  );
}

// Step 2: Add state for cooldown modal and animations
content = content.replace(
  'const [showMenu, setShowMenu] = useState(false);',
  `const [showMenu, setShowMenu] = useState(false);
  const [themeAnimate, setThemeAnimate] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [showCooldownModal, setShowCooldownModal] = useState(false);`
);

// Step 3: Fix handleLogout - add missing closing brace
content = content.replace(
  /const handleLogout = \(\) => \{\s+logout\(\);\s+navigate\('\/login'\);\s+const downloadQRCode/s,
  `const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const checkScanCooldown = () => {
    if (!userData?.scannedAt) return true; // No previous scan
    
    const lastScan = new Date(userData.scannedAt);
    const now = new Date();
    const hoursSinceLastScan = (now.getTime() - lastScan.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceLastScan >= 24;
  };

  const convertImageToBase64 = async (imageUrl: string): Promise<string | null> => {
    try {
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit'
      });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Failed to convert image to base64:', error);
      return null;
    }
  };

  const downloadIDCard = async () => {
    try {
      if (!userData?.name || !userData?.email) {
        toast.error('User data incomplete');
        return;
      }

      toast.loading('Generating ID Card PDF...');

      // Generate QR code as image
      let qrCodeDataUrl = qrCodeImage;
      if (!qrCodeDataUrl) {
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

      // Header text
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('The Force of Grace Ministry', pageWidth / 2, 8, { align: 'center' });

      // Profile Image Area
      const profileImageX = pageWidth / 2;
      const profileImageY = 28;
      const profileImageSize = 25;

      if (userData?.profileImageUrl) {
        try {
          const base64Image = await convertImageToBase64(userData.profileImageUrl);
          if (base64Image) {
            pdf.addImage(base64Image, 'JPEG', profileImageX - profileImageSize / 2, profileImageY - profileImageSize / 2, profileImageSize, profileImageSize);
          }
        } catch (imgError) {
          console.warn('Could not add profile image to PDF:', imgError);
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
  };

  const downloadQRCode`
);

// Step 4: Remove the old broken downloadQRCode function
const downloadQRCodeStart = content.indexOf('const downloadQRCode = async () => {');
if (downloadQRCodeStart !== -1) {
  const nextFunctionStart = content.indexOf('const startScanner', downloadQRCodeStart);
  if (nextFunctionStart !== -1) {
    content = content.substring(0, downloadQRCodeStart) + content.substring(nextFunctionStart);
  }
}

// Step 5: Update startScanner to check cooldown
content = content.replace(
  /const startScanner = \(\) => \{\s+setShowScanner\(true\);/,
  `const startScanner = () => {
    if (!checkScanCooldown()) {
      setShowCooldownModal(true);
      return;
    }
    
    setShowScanner(true);`
);

// Step 6: Update theme toggle button to include animation
content = content.replace(
  /<button\s+onClick={toggleTheme}\s+className="p-1\.5 hover:bg-white\/10 rounded-lg transition-colors"/g,
  `<button
                onClick={() => {
                  setThemeAnimate(true);
                  setTimeout(() => setThemeAnimate(false), 500);
                  toggleTheme();
                }}
                className={\`p-1.5 hover:bg-white/10 rounded-lg transition-colors \${themeAnimate ? 'theme-toggle-animate' : ''}\`}`
);

// Step 7: Replace all downloadQRCode calls with downloadIDCard
content = content.replace(/onClick={downloadQRCode}/g, 'onClick={downloadIDCard}');
content = content.replace(/Download QR Code/g, 'Download ID Card');

// Write the fixed content
fs.writeFileSync('frontend/src/pages/UserDashboardPage.tsx', content, 'utf8');
console.log('✓ Applied QR code enhancements to UserDashboardPage.tsx');
console.log('  - Added QRCode import');
console.log('  - Added cooldown modal state');
console.log('  - Added theme animation state');
console.log('  - Fixed handleLogout closing brace');
console.log('  - Added checkScanCooldown function');
console.log('  - Added convertImageToBase64 function');
console.log('  - Added downloadIDCard function with PDF generation');
console.log('  - Updated startScanner to check cooldown');
console.log('  - Added theme toggle animation');
console.log('  - Updated all button handlers');
