const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the entire header section (lines 417-437 approximately)
const oldSection = `          {/* Top Bar */}
          <div className="flex items-center justify-between mb-3">
            {/* Hamburger Menu */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>

            {/* Dark Mode Toggle */}
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

          {/* Welcome Text */}
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome, <span className="text-primary">{userData?.name?.split(' ')[0] || 'Church'}</span>
            </h1>
            <p className="text-white/70 text-xs font-medium mt-0.5">User Dashboard</p>
          </div>`;

const newSection = `          {/* Single Row Layout */}
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
          </div>`;

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Header fixed successfully!');
  console.log('Changes:');
  console.log('- Combined into single row');
  console.log('- Text on LEFT');
  console.log('- Icons on RIGHT');
  console.log('- Dark mode toggle before hamburger');
  console.log('- Removed mb-3 from container');
} else {
  console.log('❌ Could not find the exact section');
  console.log('Trying to find similar patterns...');
  
  if (content.includes('Top Bar')) {
    console.log('✓ Found "Top Bar" comment');
  }
  if (content.includes('Welcome Text')) {
    console.log('✓ Found "Welcome Text" comment');
  }
}
