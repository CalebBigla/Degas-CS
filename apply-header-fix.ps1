$file = "frontend/src/pages/UserDashboardPage.tsx"
$lines = Get-Content $file

$startLine = 440  # Line where {/* Single Row Layout */} starts
$endLine = 475    # Line where </div> ends (before </div></div>)

# Read the fixed section
$fixedSection = Get-Content "header-fixed-section.txt"

# Reconstruct the file
$newContent = @()
$newContent += $lines[0..($startLine-2)]  # Lines before the section
$newContent += $fixedSection               # Fixed section
$newContent += $lines[$endLine..($lines.Length-1)]  # Lines after the section

# Write back
$newContent | Set-Content $file

Write-Host "Header alignment fixed successfully!" -ForegroundColor Green
