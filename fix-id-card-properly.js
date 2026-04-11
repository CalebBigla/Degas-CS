const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/UserDashboardPage.tsx');

console.log('Reading UserDashboardPage.tsx...');
let content = fs.readFileSync(filePath, 'utf8');

// Find the exact section to replace - from the ID Card comment to the closing div before Download Button
const oldSection = `                {/* ID Card */}
                <div className="rounded-2xl bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-primary-foreground))] overflow-hidden shadow-xl">
                  {/* Card Header */}
                  <div className="bg-[hsl(var(--sidebar-primary))]/20 px-4 py-3 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))]">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--sidebar-primary))] flex items-center justify-center shadow-sm">
                        <span className="text-xs font-bold text-white">TFG</span>
                      </div>
                      <span className="text-xs text-[hsl(var(--sidebar-foreground))] font-semibold">The Force of Grace Ministry</span>
                    </div>
                  </div>

                  {/* Card Body - Profile Section */}
                  <div className="p-6 flex flex-col items-center text-center space-y-4">
                    {/* Large Profile Image */}
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[hsl(var(--sidebar-primary))]/30 bg-[hsl(var(--sidebar-accent))] shadow-lg">
                        {userData?.profileImageUrl ? (
                          <img 
                            src={userData.profileImageUrl} 
                            alt={userData.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-3xl font-bold text-[hsl(var(--sidebar-primary-foreground))]">
                              {getUserInitials()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Name and Role */}
                    <div>
                      <h3 className="text-xl font-bold text-[hsl(var(--sidebar-foreground))] mb-1">
                        {userData?.name || 'Church Member'}
                      </h3>
                      <p className="text-xs text-[hsl(var(--sidebar-muted))] font-semibold uppercase tracking-wider">
                        Member
                      </p>
                    </div>

                    {/* QR Code */}
                    {qrCodeImage && (
                      <div className="bg-white rounded-xl p-4 shadow-md">
                        <img 
                          src={qrCodeImage} 
                          alt="User QR Code" 
                          className="w-32 h-32"
                        />
                      </div>
                    )}

                    {/* Member Badge */}
                    <div className="w-full bg-[hsl(var(--sidebar-primary))]/10 rounded-lg py-2 px-4">
                      <p className="text-xs text-[hsl(var(--sidebar-muted))] font-bold uppercase tracking-wider">
                        Member
                      </p>
                    </div>
                  </div>
                </div>`;

const newSection = `                {/* ID Card */}
                <div id="id-card-container" className="rounded-2xl bg-white overflow-hidden shadow-xl border border-gray-200" style={{ width: '91mm', maxWidth: '100%', aspectRatio: '91/55' }}>
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
                </div>`;

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection);
  console.log('✓ Successfully replaced ID card section with white background design');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ File updated successfully!');
  console.log('\nChanges made:');
  console.log('1. ✓ Changed ID card background from dark theme to white');
  console.log('2. ✓ Added id="id-card-container" to the white card element');
  console.log('3. ✓ Set dimensions to 91mm × 55mm (credit card size)');
  console.log('4. ✓ Removed TFG acronym box from header');
  console.log('5. ✓ Made form name bold and centered');
  console.log('6. ✓ Replaced "Member" label with phone number');
  console.log('7. ✓ Updated member badge to dark gray background at bottom');
  console.log('8. ✓ Adjusted spacing and sizing for compact design');
  console.log('\nThe PDF download will now capture only the white ID card area (91mm × 55mm)');
} else {
  console.log('✗ Could not find the exact ID card section to replace');
  console.log('The file may have already been updated or has a different structure');
}
