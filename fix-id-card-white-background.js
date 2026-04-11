const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');

console.log('Reading UserDashboardPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the ID card section with white background design
const oldIdCardPattern = /<div className="rounded-2xl bg-\[hsl\(var\(--sidebar-background\)\)\] text-\[hsl\(var\(--sidebar-primary-foreground\)\)\] overflow-hidden shadow-xl">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*{\/\* Download Button \*\/}/;

const newIdCard = `<div id="id-card-container" className="rounded-2xl bg-white overflow-hidden shadow-xl border border-gray-200" style={{ width: '91mm', maxWidth: '100%', aspectRatio: '91/55' }}>
                  {/* Card Header */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="text-sm font-bold text-gray-900 text-center">
                      {userData?.formName || 'The Force of Grace Ministry'}
                    </h2>
                  </div>

                  {/* Card Body - Profile Section */}
                  <div className="p-4 flex flex-col items-center text-center space-y-3">
                    {/* Profile Image */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-gray-300 bg-gray-100 shadow-md">
                        {userData?.profileImageUrl ? (
                          <img 
                            src={userData.profileImageUrl} 
                            alt={userData.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-600">
                              {getUserInitials()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Name and Phone */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-0.5">
                        {userData?.name || 'Church Member'}
                      </h3>
                      <p className="text-xs text-gray-600 font-medium">
                        {userData?.phone || 'N/A'}
                      </p>
                    </div>

                    {/* QR Code */}
                    {qrCodeImage && (
                      <div className="bg-white rounded-lg p-2">
                        <img 
                          src={qrCodeImage} 
                          alt="User QR Code" 
                          className="w-24 h-24"
                        />
                      </div>
                    )}

                    {/* Member Badge */}
                    <div className="w-full bg-gray-800 rounded-lg py-1.5 px-4 mt-2">
                      <p className="text-xs text-white font-bold uppercase tracking-wider">
                        Member
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Button */}`;

if (oldIdCardPattern.test(content)) {
  content = content.replace(oldIdCardPattern, newIdCard);
  console.log('✓ Replaced ID card section with white background design');
} else {
  console.log('✗ Could not find ID card pattern - trying alternative approach...');
  
  // Alternative: Find the specific div and replace it
  const altPattern = /<div className="rounded-2xl bg-\[hsl\(var\(--sidebar-background\)\)\][^>]*>/;
  if (altPattern.test(content)) {
    // Find the line with id-card-container if it exists
    if (content.includes('id="id-card-container"')) {
      // Remove id from old location
      content = content.replace(/id="id-card-container"\s+/, '');
      console.log('✓ Removed id-card-container from old location');
    }
    
    // Replace the dark background div with white background
    content = content.replace(
      /<div className="rounded-2xl bg-\[hsl\(var\(--sidebar-background\)\)\] text-\[hsl\(var\(--sidebar-primary-foreground\)\)\] overflow-hidden shadow-xl">/,
      '<div id="id-card-container" className="rounded-2xl bg-white overflow-hidden shadow-xl border border-gray-200" style={{ width: \'91mm\', maxWidth: \'100%\', aspectRatio: \'91/55\' }}>'
    );
    
    // Update header section - remove TFG box, make form name centered and bold
    content = content.replace(
      /<div className="bg-\[hsl\(var\(--sidebar-primary\)\)\]\/20 px-4 py-3 flex items-center justify-between border-b border-\[hsl\(var\(--sidebar-border\)\)\]">[\s\S]*?<\/div>/,
      `<div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="text-sm font-bold text-gray-900 text-center">
                      {userData?.formName || 'The Force of Grace Ministry'}
                    </h2>
                  </div>`
    );
    
    // Update profile image section
    content = content.replace(
      /<div className="w-24 h-24 rounded-full overflow-hidden border-4 border-\[hsl\(var\(--sidebar-primary\)\)\]\/30 bg-\[hsl\(var\(--sidebar-accent\)\)\] shadow-lg">/,
      '<div className="w-20 h-20 rounded-full overflow-hidden border-3 border-gray-300 bg-gray-100 shadow-md">'
    );
    
    // Update user name styling
    content = content.replace(
      /<h3 className="text-xl font-bold text-\[hsl\(var\(--sidebar-foreground\)\)\] mb-1">/,
      '<h3 className="text-lg font-bold text-gray-900 mb-0.5">'
    );
    
    // Replace "Member" label with phone number
    content = content.replace(
      /<p className="text-xs text-\[hsl\(var\(--sidebar-muted\)\)\] font-semibold uppercase tracking-wider">\s*Member\s*<\/p>/,
      `<p className="text-xs text-gray-600 font-medium">
                        {userData?.phone || 'N/A'}
                      </p>`
    );
    
    // Update QR code section
    content = content.replace(
      /<div className="bg-white rounded-xl p-4 shadow-md">/,
      '<div className="bg-white rounded-lg p-2">'
    );
    
    content = content.replace(
      /<img[\s\S]*?src={qrCodeImage}[\s\S]*?className="w-32 h-32"/,
      `<img 
                          src={qrCodeImage} 
                          alt="User QR Code" 
                          className="w-24 h-24"`
    );
    
    // Update member badge at bottom
    content = content.replace(
      /<div className="w-full bg-\[hsl\(var\(--sidebar-primary\)\)\]\/10 rounded-lg py-2 px-4">\s*<p className="text-xs text-\[hsl\(var\(--sidebar-muted\)\)\] font-bold uppercase tracking-wider">\s*Member\s*<\/p>\s*<\/div>/,
      `<div className="w-full bg-gray-800 rounded-lg py-1.5 px-4 mt-2">
                      <p className="text-xs text-white font-bold uppercase tracking-wider">
                        Member
                      </p>
                    </div>`
    );
    
    // Update spacing
    content = content.replace(
      /<div className="p-6 flex flex-col items-center text-center space-y-4">/,
      '<div className="p-4 flex flex-col items-center text-center space-y-3">'
    );
    
    // Update profile image initials styling
    content = content.replace(
      /<span className="text-3xl font-bold text-\[hsl\(var\(--sidebar-primary-foreground\)\)\]">/,
      '<span className="text-2xl font-bold text-gray-600">'
    );
    
    console.log('✓ Applied white background design updates');
  }
}

// Write the updated content
fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ File updated successfully!');
console.log('\nChanges made:');
console.log('1. Changed ID card background from dark theme to white');
console.log('2. Added id="id-card-container" to the white card element');
console.log('3. Set dimensions to 91mm × 55mm (credit card size)');
console.log('4. Removed TFG acronym box from header');
console.log('5. Made form name bold and centered');
console.log('6. Replaced "Member" label with phone number');
console.log('7. Updated member badge to dark gray background at bottom');
console.log('8. Adjusted spacing and sizing for compact design');
