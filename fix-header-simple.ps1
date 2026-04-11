# Fix header alignment in UserDashboardPage.tsx
$filePath = "frontend/src/pages/UserDashboardPage.tsx"
$content = Get-Content $filePath -Raw

# Simple find and replace
$content = $content -replace '(\{/\* Left: Icons \*/\})', '{/* Left: Welcome Text */}'
$content = $content -replace '(\{/\* Right: Welcome Text \*/\})', '{/* Right: Icons */}'
$content = $content -replace '(text-xl font-bold text-white)', 'text-2xl font-bold text-white'
$content = $content -replace '(text-white/70 text-xs font-medium">User Dashboard)', 'text-white/70 text-xs font-medium mt-0.5">User Dashboard'
$content = $content -replace '(<div className="text-right">)', '<div>'

# Swap the order of the two main divs inside the flex container
# This is complex, so let's do it manually by reading and reconstructing

Set-Content $filePath -Value $content -NoNewline
Write-Host "Header alignment partially fixed. Manual adjustment needed for div order swap." -ForegroundColor Yellow
