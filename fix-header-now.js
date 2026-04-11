const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the header section
const oldHeader = `{/* Left: Icons */}
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
            </div>`;

const newHeader = `{/* Left: Welcome Text */}
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
            </div>`;

if (content.includes(oldHeader)) {
  content = content.replace(oldHeader, newHeader);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Header alignment fixed successfully!');
  console.log('Changes:');
  console.log('- Text moved to LEFT');
  console.log('- Icons moved to RIGHT');
  console.log('- Dark mode toggle before hamburger');
  console.log('- h1 changed from text-xl to text-2xl');
  console.log('- Added mt-0.5 to subtitle');
} else {
  console.log('❌ Could not find the header section to replace');
  console.log('The file may have already been modified or has different formatting');
}
