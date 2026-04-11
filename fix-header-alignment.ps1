# Fix header alignment in UserDashboardPage.tsx

$filePath = "frontend/src/pages/UserDashboardPage.tsx"
$content = Get-Content $filePath -Raw

Write-Host "Fixing header alignment..." -ForegroundColor Cyan

# Replace the header section - swap left and right sides, restore original font sizes
$oldHeader = @'
          {/\* Single Row Layout \*/}
          <div className="flex items-center justify-between">
            {/\* Left: Icons \*/}
            <div className="flex items-center gap-2">
              <button
                onClick=\{\(\) => setShowMenu\(!showMenu\)\}
                className="p-1\.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
              
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

            {/\* Right: Welcome Text \*/}
            <div className="text-right">
              <h1 className="text-xl font-bold text-white">
                Welcome, <span className="text-primary">\{userData\?\.name\?\.split\(' '\)\[0\] \|\| 'Church'\}</span>
              </h1>
              <p className="text-white/70 text-xs font-medium">User Dashboard</p>
            </div>
          </div>
'@

$newHeader = @'
          {/* Single Row Layout */}
          <div className="flex items-center justify-between">
            {/* Left: Welcome Text */}
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome, <span className="text-primary">{userData?.name?.split(' ')[0] || 'Church'}</span>
              </h1>
              <p className="text-white/70 text-xs font-medium mt-0.5">User Dashboard</p>
            </div>

            {/* Right: Icons */}
            <div className="flex items-center gap-2">
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
              
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
'@

$content = $content -replace $oldHeader, $newHeader

# Save the file
Set-Content $filePath -Value $content -NoNewline

Write-Host "✓ Header alignment fixed!" -ForegroundColor Green
Write-Host "  - Text block moved to LEFT" -ForegroundColor Green
Write-Host "  - Icons moved to RIGHT (dark mode + hamburger)" -ForegroundColor Green
Write-Host "  - Icons vertically centered with text block" -ForegroundColor Green
Write-Host "  - Original font sizes restored (text-2xl for h1)" -ForegroundColor Green
