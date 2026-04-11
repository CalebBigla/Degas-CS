const fs = require('fs');

const filePath = 'frontend/src/pages/UserDashboardPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the ID Card Display section with the new design
const idCardStart = content.indexOf('            {/* ID Card Display */}');
const idCardEnd = content.indexOf('            {/* Info Box */}');

if (idCardStart !== -1 && idCardEnd !== -1) {
  const newIDCardSection = `            {/* ID Card Display */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
              <div className="mx-auto max-w-[400px]">
                {/* ID Card - New Clean Design */}
                <div className="rounded-3xl bg-white overflow-hidden shadow-2xl border-2 border-gray-200">
                  
                  {/* Top Hole Punch Effect */}
                  <div className="flex justify-center pt-4 pb-2">
                    <div className="w-12 h-3 bg-gray-200 rounded-full"></div>
                  </div>

                  {/* Card Body */}
                  <div className="px-8 py-6 flex flex-col items-center text-center space-y-4">
                    
                    {/* Form Name / Organization */}
                    <h2 className="text-xl font-bold text-gray-900">
                      {userData?.formName || 'The Force of Grace Ministry'}
                    </h2>

                    {/* Profile Image */}
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 shadow-lg border-4 border-gray-200">
                        {userData?.profileImageUrl ? (
                          <img 
                            src={userData.profileImageUrl} 
                            alt={userData.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-5xl font-bold text-gray-400">
                              {getUserInitials()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User Name */}
                    <div className="space-y-1">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {userData?.name || 'Church Member'}
                      </h3>
                      {/* Phone Number */}
                      {userData?.phone && (
                        <p className="text-base text-gray-600 font-medium">
                          {userData.phone}
                        </p>
                      )}
                    </div>

                    {/* QR Code - Bold with minimal padding */}
                    {qrCodeImage && (
                      <div className="bg-white rounded-lg p-2 shadow-md border-2 border-gray-300">
                        <img 
                          src={qrCodeImage} 
                          alt="User QR Code" 
                          className="w-40 h-40"
                        />
                      </div>
                    )}

                  </div>

                  {/* Member Badge at Bottom */}
                  <div className="bg-[#1e3a5f] py-4 px-8">
                    <p className="text-center text-white text-lg font-bold uppercase tracking-widest">
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

  content = content.substring(0, idCardStart) + newIDCardSection + content.substring(idCardEnd);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Implemented new ID card design');
  console.log('  - White background with clean layout');
  console.log('  - Form name at top (dynamic)');
  console.log('  - Profile image placeholder working');
  console.log('  - User name and phone number');
  console.log('  - Bold QR code with minimal padding');
  console.log('  - Dark blue MEMBER badge at bottom');
  console.log('  - Portrait orientation');
} else {
  console.log('✗ Could not find ID Card Display section');
}
