const fs = require('fs');

const filePath = 'frontend/src/pages/UserDashboardPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the ID card section
const idCardStart = content.indexOf('{/* ID Card Display */}');
const infoBoxStart = content.indexOf('{/* Info Box */}', idCardStart);

if (idCardStart !== -1 && infoBoxStart !== -1) {
  const newIDCardSection = `{/* ID Card Display */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <div className="mx-auto max-w-[400px]">
                {/* ID Card - Clean Light Design */}
                <div id="id-card-container" className="rounded-2xl bg-white overflow-hidden shadow-xl border border-gray-200">
                  
                  {/* Card Body */}
                  <div className="px-6 py-8 flex flex-col items-center text-center space-y-5">
                    
                    {/* Form Name / Organization - Bold and Centered, No TFG */}
                    <h2 className="text-xl font-bold text-gray-900">
                      {userData?.formName || 'The Force of Grace Ministry'}
                    </h2>

                    {/* Profile Image */}
                    <div className="relative">
                      <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 shadow-lg border-4 border-gray-200">
                        {userData?.profileImageUrl ? (
                          <img 
                            src={userData.profileImageUrl} 
                            alt={userData.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl font-bold text-gray-400">
                              {getUserInitials()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Name and Phone */}
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {userData?.name || 'Church Member'}
                      </h3>
                      {/* Phone Number (replaces "Member" label) */}
                      {userData?.phone && (
                        <p className="text-base text-gray-600 font-medium">
                          {userData.phone}
                        </p>
                      )}
                    </div>

                    {/* QR Code - No number below */}
                    {qrCodeImage && (
                      <div className="bg-white rounded-lg p-3 shadow-md border-2 border-gray-200">
                        <img 
                          src={qrCodeImage} 
                          alt="User QR Code" 
                          className="w-44 h-44"
                        />
                      </div>
                    )}

                  </div>

                  {/* Member Badge at Bottom */}
                  <div className="bg-gray-600 py-3 px-6">
                    <p className="text-center text-white text-base font-bold uppercase tracking-widest">
                      MEMBER
                    </p>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={downloadIDCard}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
                >
                  <Download className="h-4 w-4" />
                  Download ID Card
                </button>
                <p className="text-xs text-muted-foreground text-center font-medium mt-2">
                  Save this to your phone for easy access
                </p>
              </div>
            </div>

            `;
  
  content = content.substring(0, idCardStart) + newIDCardSection + content.substring(infoBoxStart);
  
  // Also fix the button onClick to use downloadIDCard instead of downloadQRCode
  content = content.replace(/onClick={downloadQRCode}/g, 'onClick={downloadIDCard}');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Updated ID card design to match PDF');
  console.log('  - White/light background');
  console.log('  - Form name bold and centered (no TFG)');
  console.log('  - Phone number under name');
  console.log('  - QR code with no number below');
  console.log('  - Dark gray MEMBER badge at bottom');
  console.log('  - Fixed download button to use downloadIDCard');
} else {
  console.log('✗ Could not find ID Card Display section');
}
