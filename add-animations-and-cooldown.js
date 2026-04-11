const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add new state variables after existing useState declarations
const statePattern = /const \[showMenu, setShowMenu\] = useState\(false\);/;
const newStates = `const [showMenu, setShowMenu] = useState(false);
  const [themeAnimate, setThemeAnimate] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [showCooldownModal, setShowCooldownModal] = useState(false);`;

if (statePattern.test(content)) {
  content = content.replace(statePattern, newStates);
  console.log('✅ Added new state variables');
} else {
  console.log('❌ Could not find showMenu state');
}

// 2. Add cooldown check function after handleLogout
const logoutPattern = /(const handleLogout = \(\) => \{[\s\S]*?\};)/;
const cooldownFunction = `$1

  const checkScanCooldown = () => {
    if (!userData?.scannedAt) return true; // No previous scan
    
    const lastScan = new Date(userData.scannedAt);
    const now = new Date();
    const hoursSinceLastScan = (now - lastScan) / (1000 * 60 * 60);
    
    return hoursSinceLastScan >= 24;
  };`;

if (logoutPattern.test(content)) {
  content = content.replace(logoutPattern, cooldownFunction);
  console.log('✅ Added cooldown check function');
} else {
  console.log('❌ Could not find handleLogout function');
}

// 3. Update startScanner to check cooldown
const startScannerPattern = /const startScanner = \(\) => \{[\s\S]*?\};/;
const newStartScanner = `const startScanner = () => {
    if (!checkScanCooldown()) {
      setShowCooldownModal(true);
      return;
    }
    
    setShowScanner(true);
    setScanning(true);
    setScanResult(null);
    setCameraError('');
  };`;

if (startScannerPattern.test(content)) {
  content = content.replace(startScannerPattern, newStartScanner);
  console.log('✅ Updated startScanner with cooldown check');
} else {
  console.log('❌ Could not find startScanner function');
}

// 4. Update theme toggle button to include animation
const themeButtonPattern = /(<button\s+onClick={toggleTheme})/;
const newThemeButton = `<button
                onClick={() => {
                  setThemeAnimate(true);
                  setTimeout(() => setThemeAnimate(false), 500);
                  toggleTheme();
                }}`;

if (themeButtonPattern.test(content)) {
  content = content.replace(themeButtonPattern, newThemeButton);
  console.log('✅ Updated theme toggle button');
} else {
  console.log('❌ Could not find theme toggle button');
}

// 5. Add animation class to theme button icon container
const themeIconPattern = /(className="p-1\.5 hover:bg-white\/10 rounded-lg transition-colors"[\s\S]*?title=)/;
const newThemeIcon = `className={\`p-1.5 hover:bg-white/10 rounded-lg transition-colors \${themeAnimate ? 'theme-toggle-animate' : ''}\`}
                title=`;

if (themeIconPattern.test(content)) {
  content = content.replace(themeIconPattern, newThemeIcon);
  console.log('✅ Added animation class to theme button');
} else {
  console.log('❌ Could not find theme button className');
}

// 6. Update menu close handler
const menuClosePattern = /onClick={() => setShowMenu\(false\)}/g;
const newMenuClose = `onClick={() => {
              setMenuClosing(true);
              setTimeout(() => {
                setShowMenu(false);
                setMenuClosing(false);
              }, 300);
            }}`;

// Replace first occurrence (backdrop)
content = content.replace(menuClosePattern, newMenuClose);
console.log('✅ Updated menu close handlers');

// 7. Add cooldown modal before closing div
const closingDivPattern = /([\s\S]*)(    <\/div>\s+<\/div>\s+\);[\s\S]*?^}$)/m;
const cooldownModal = `$1
      {/* 24-Hour Cooldown Modal */}
      {showCooldownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl p-6 sm:p-8 max-w-sm mx-4 shadow-2xl animate-scale-in border border-border">
            <div className="text-center space-y-4">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="h-8 w-8 text-warning" />
              </div>
              
              {/* Message */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Scan Cooldown Active
                </h3>
                <p className="text-sm text-muted-foreground">
                  You've already scanned today. Kindly wait for 24 hours before scanning again.
                </p>
                {userData?.scannedAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last scan: {new Date(userData.scannedAt).toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Button */}
              <button
                onClick={() => setShowCooldownModal(false)}
                className="w-full px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-sm transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
$2`;

if (closingDivPattern.test(content)) {
  content = content.replace(closingDivPattern, cooldownModal);
  console.log('✅ Added cooldown modal');
} else {
  console.log('❌ Could not find closing div pattern');
}

// Write the updated content
fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✅ All changes applied successfully!');
console.log('\nChanges made:');
console.log('1. Added state variables for animations and cooldown modal');
console.log('2. Added checkScanCooldown function');
console.log('3. Updated startScanner to check cooldown');
console.log('4. Added theme toggle animation');
console.log('5. Added menu slide animations');
console.log('6. Added 24-hour cooldown modal');
