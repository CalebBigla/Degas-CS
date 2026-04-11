const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find the section between "Top Bar" and the closing of Welcome Text div
const pattern = /(\s*){\/\* Top Bar \*\/}[\s\S]*?{\/\* Welcome Text \*\/}[\s\S]*?<\/div>/;

const replacement = `$1{/* Single Row Layout */}
$1<div className="flex items-center justify-between">
$1  {/* Left: Welcome Text */}
$1  <div>
$1    <h1 className="text-2xl font-bold text-white">
$1      Welcome, <span className="text-primary">{userData?.name?.split(' ')[0] || 'Church'}</span>
$1    </h1>
$1    <p className="text-white/70 text-xs font-medium mt-0.5">User Dashboard</p>
$1  </div>

$1  {/* Right: Icons */}
$1  <div className="flex items-center gap-2">
$1    <button
$1      onClick={toggleTheme}
$1      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
$1      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
$1      aria-label="Toggle theme"
$1    >
$1      {theme === 'light' ? (
$1        <Moon className="h-5 w-5 text-white" />
$1      ) : (
$1        <Sun className="h-5 w-5 text-white" />
$1      )}
$1    </button>
$1    
$1    <button
$1      onClick={() => setShowMenu(!showMenu)}
$1      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
$1      aria-label="Menu"
$1    >
$1      <Menu className="h-5 w-5 text-white" />
$1    </button>
$1  </div>
$1</div>`;

if (pattern.test(content)) {
  content = content.replace(pattern, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Header fixed successfully with regex!');
} else {
  console.log('❌ Pattern not found');
}
