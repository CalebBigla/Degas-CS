{/* Logout Confirmation Modal */}
{showLogoutModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="bg-card rounded-2xl p-6 sm:p-8 max-w-sm mx-4 shadow-2xl animate-scale-in border border-border">
      <div className="text-center space-y-4">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <LogOut className="h-8 w-8 text-destructive" />
        </div>
        
        {/* Message */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-2">
            Confirm Logout
          </h3>
          <p className="text-sm text-muted-foreground">
            You are about to log out. Are you sure you want to continue?
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setShowLogoutModal(false)}
            className="flex-1 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmLogout}
            className="flex-1 px-4 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl font-semibold text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  </div>
)}
