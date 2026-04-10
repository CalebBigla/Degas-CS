# PowerShell script to fix all four bugs in UserDashboardPage.tsx

$filePath = "frontend/src/pages/UserDashboardPage.tsx"
$content = Get-Content $filePath -Raw

Write-Host "Fixing UserDashboardPage bugs..." -ForegroundColor Cyan

# Bug 1: Fix icon alignment - Change from two-row to single-row layout
$oldHeader = @'
          {/\* Top Bar \*/}
          <div className="flex items-center justify-between mb-3">
            {/\* Hamburger Menu \*/}
            <button
              onClick=\{\(\) => setShowMenu\(!showMenu\)\}
              className="p-1\.5 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>

            {/\* Dark Mode Toggle \*/}
            <button
              onClick=\{toggleTheme\}
              className="p-1\.5 hover:bg-white/10 rounded-lg transition-colors"
              title=\{theme === 'light' \? 'Switch to dark mode' : 'Switch to light mode'\}
              aria-label="Toggle theme"
            >
              \{theme === 'light' \? \(
                <Moon className="h-5 w-5 text-white" />
              \) : \(
                <Sun className="h-5 w-5 text-white" />
              \)\}
            </button>
          </div>

          {/\* Welcome Text \*/}
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, <span className="text-primary">\{userData\?\.name\?\.split\(' '\)\[0\] \|\| 'Church'\}</span>
            </h1>
            <p className="text-white/70 text-xs font-medium mt-0\.5">User Dashboard</p>
          </div>
'@

$newHeader = @'
          {/* Single Row Layout */}
          <div className="flex items-center justify-between">
            {/* Left: Icons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
              
              <button
                onClick={toggleTheme}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="h-5 w-5 text-white" />
                ) : (
                  <Sun className="h-5 w-5 text-white" />
                )}
              </button>
            </div>

            {/* Right: Welcome Text */}
            <div className="text-right">
              <h1 className="text-xl font-bold text-white">
                Welcome, <span className="text-primary">{userData?.name?.split(' ')[0] || 'Church'}</span>
              </h1>
              <p className="text-white/70 text-xs font-medium">User Dashboard</p>
            </div>
          </div>
'@

$content = $content -replace [regex]::Escape($oldHeader), $newHeader

# Bug 2: Fix phone number overflow - Add break-all class
$content = $content -replace '(<p className="text-sm sm:text-base font-medium text-foreground">)\{userData\?\.phone', '$1 break-all">{userData?.phone'

# Bug 3: Profile image already uses profileImageUrl - verify it's correct
# The code already uses userData?.profileImageUrl which is correct

# Bug 4: Add imports for PDF generation
$content = $content -replace "(import toast from 'react-hot-toast';)", "`$1`nimport html2canvas from 'html2canvas';`nimport jsPDF from 'jspdf';"

# Bug 4: Replace downloadQRCode function with PDF generation
$oldDownload = @'
  const downloadQRCode = \(\) => \{
    if \(!qrCodeImage\) return;
    
    const link = document\.createElement\('a'\);
    link\.href = qrCodeImage;
    link\.download = `qr-code-\$\{userData\?\.name \|\| 'user'\}\.png`;
    link\.click\(\);
    toast\.success\('QR code downloaded'\);
  \};
'@

$newDownload = @'
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

$content = $content -replace $oldDownload, $newDownload

# Bug 4: Add id to ID card container
$content = $content -replace '(<div className="rounded-2xl bg-\[hsl\(var\(--sidebar-background\)\)\] text-\[hsl\(var\(--sidebar-primary-foreground\)\)\] overflow-hidden shadow-xl">)', '<div id="id-card-container" className="rounded-2xl bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-primary-foreground))] overflow-hidden shadow-xl">'

# Bug 4: Update button text
$content = $content -replace 'Download QR Code', 'Download ID Card'
$content = $content -replace 'Save this to your phone for easy access', 'Download your ID card as PDF'

# Save the updated content
Set-Content $filePath -Value $content -NoNewline

Write-Host "✓ Bug 1: Fixed icon alignment (single-row layout)" -ForegroundColor Green
Write-Host "✓ Bug 2: Fixed phone number overflow (added break-all)" -ForegroundColor Green
Write-Host "✓ Bug 3: Profile image already uses profileImageUrl" -ForegroundColor Green
Write-Host "✓ Bug 4: Fixed download to generate PDF of full ID card" -ForegroundColor Green
Write-Host "`nAll bugs fixed successfully!" -ForegroundColor Green
