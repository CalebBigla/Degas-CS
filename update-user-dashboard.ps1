# PowerShell script to update UserDashboardPage.tsx with PDF functionality

$filePath = "frontend/src/pages/UserDashboardPage.tsx"
$content = Get-Content $filePath -Raw

# 1. Add imports for html2canvas and jsPDF
$content = $content -replace "(import toast from 'react-hot-toast';)", "`$1`nimport html2canvas from 'html2canvas';`nimport jsPDF from 'jspdf';"

# 2. Add id="id-card-container" to the ID card div
$content = $content -replace '(<div className="rounded-2xl bg-\[hsl\(var\(--sidebar-background\)\)\] text-\[hsl\(var\(--sidebar-primary-foreground\)\)\] overflow-hidden shadow-xl">)', '<div id="id-card-container" className="rounded-2xl bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-primary-foreground))] overflow-hidden shadow-xl">'

# 3. Replace downloadQRCode function with PDF generation version
$oldFunction = @'
  const downloadQRCode = \(\) => \{
    if \(!qrCodeImage\) return;

    const link = document\.createElement\('a'\);
    link\.href = qrCodeImage;
    link\.download = `qr-code-\$\{userData\?\.name \|\| 'user'\}\.png`;
    link\.click\(\);
    toast\.success\('QR code downloaded'\);
  \};
'@

$newFunction = @'
  const downloadQRCode = async () => {
    if (!qrCodeImage) {
      toast.error('QR code not available');
      return;
    }
    
    try {
      const idCardElement = document.getElementById('id-card-container');
      if (!idCardElement) {
        toast.error('ID card not found');
        return;
      }

      toast.loading('Generating PDF...');

      const canvas = await html2canvas(idCardElement, {
        scale: 2,
        backgroundColor: null,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const cardAspectRatio = canvas.width / canvas.height;
      const cardWidth = pdfWidth * 0.8;
      const cardHeight = cardWidth / cardAspectRatio;
      
      const xOffset = (pdfWidth - cardWidth) / 2;
      const yOffset = (pdfHeight - cardHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, cardWidth, cardHeight);

      const fileName = `${userData?.name?.replace(/\s+/g, '-') || 'user'}-id-card.pdf`;
      pdf.save(fileName);

      toast.dismiss();
      toast.success('ID card downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };
'@

$content = $content -replace $oldFunction, $newFunction

# 4. Update button text and subtitle
$content = $content -replace 'Download QR Code', 'Download ID Card'
$content = $content -replace 'Save this to your phone for easy access', 'Download your ID card as PDF'

# Save the updated content
Set-Content $filePath -Value $content -NoNewline

Write-Host "UserDashboardPage.tsx updated successfully!" -ForegroundColor Green
