const fs = require('fs');

const filePath = 'frontend/src/pages/UserDashboardPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the Welcome Modal and add Cooldown Modal after it
const welcomeModalEnd = content.indexOf('</div>\n        </div>\n      )}');

if (welcomeModalEnd !== -1) {
  const insertPosition = welcomeModalEnd + '</div>\n        </div>\n      )}'.length;
  
  const cooldownModal = `

      {/* Cooldown Modal */}
      {showCooldownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-3xl p-8 sm:p-12 max-w-md mx-4 shadow-2xl animate-scale-in border border-border">
            <div className="text-center space-y-6">
              {/* Clock Icon */}
              <div className="mx-auto w-24 h-24 rounded-full bg-warning/10 flex items-center justify-center ring-4 ring-warning/20">
                <Clock className="h-12 w-12 text-warning" />
              </div>
              
              {/* Message */}
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Please Wait
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground font-medium">
                  Kindly wait for 24 hours
                </p>
                {userData?.scannedAt && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Last scan: {new Date(userData.scannedAt).toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setShowCooldownModal(false)}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all shadow-md"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}`;
  
  content = content.substring(0, insertPosition) + cooldownModal + content.substring(insertPosition);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Added cooldown modal to UserDashboardPage.tsx');
} else {
  console.log('✗ Could not find Welcome Modal end marker');
}
