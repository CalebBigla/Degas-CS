# Hamburger Animation & Logout Modal Implementation

## Feature 1: Hamburger Menu Animation

### Animation Effect
A modern "pulse" or "scale" animation when clicked, keeping the icon in position.

### CSS Animation (Add to `frontend/src/index.css`)

```css
/* Hamburger menu click animation */
@keyframes hamburger-click {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.85);
  }
  100% {
    transform: scale(1);
  }
}

.hamburger-animate {
  animation: hamburger-click 0.2s ease-in-out;
}
```

### Component Update (UserDashboardPage.tsx)

#### Add State for Animation
```tsx
const [hamburgerAnimate, setHamburgerAnimate] = useState(false);
```

#### Update Hamburger Button
```tsx
<button
  onClick={() => {
    setHamburgerAnimate(true);
    setTimeout(() => setHamburgerAnimate(false), 200);
    setShowMenu(!showMenu);
  }}
  className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors ${hamburgerAnimate ? 'hamburger-animate' : ''}`}
  aria-label="Menu"
>
  <Menu className="h-5 w-5 text-white" />
</button>
```

---

## Feature 2: Logout Confirmation Modal

### Modal Component

Add this modal before the closing `</div>` of the main return statement:

```tsx
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
```

### State Management

Add state for the logout modal:

```tsx
const [showLogoutModal, setShowLogoutModal] = useState(false);
```

### Handler Functions

```tsx
const confirmLogout = () => {
  setShowLogoutModal(false);
  handleLogout();
};
```

### Update Logout Button in Menu

Replace the logout button onClick in the slide-out menu:

```tsx
<button
  onClick={() => {
    setShowMenu(false);
    setShowLogoutModal(true);
  }}
  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-all"
>
  <LogOut className="h-5 w-5" />
  Logout
</button>
```

---

## Complete Implementation

### Step 1: Add CSS Animation

In `frontend/src/index.css`, add:

```css
/* Hamburger menu click animation */
@keyframes hamburger-click {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.85);
  }
  100% {
    transform: scale(1);
  }
}

.hamburger-animate {
  animation: hamburger-click 0.2s ease-in-out;
}
```

### Step 2: Update UserDashboardPage.tsx

#### Add States (after existing useState declarations)
```tsx
const [hamburgerAnimate, setHamburgerAnimate] = useState(false);
const [showLogoutModal, setShowLogoutModal] = useState(false);
```

#### Add Handler (after handleLogout function)
```tsx
const confirmLogout = () => {
  setShowLogoutModal(false);
  handleLogout();
};
```

#### Update Hamburger Button (in header section)
Find the hamburger button and update it:

```tsx
<button
  onClick={() => {
    setHamburgerAnimate(true);
    setTimeout(() => setHamburgerAnimate(false), 200);
    setShowMenu(!showMenu);
  }}
  className={`p-1.5 hover:bg-white/10 rounded-lg transition-colors ${hamburgerAnimate ? 'hamburger-animate' : ''}`}
  aria-label="Menu"
>
  <Menu className="h-5 w-5 text-white" />
</button>
```

#### Update Logout Button (in slide-out menu)
Find the logout button in the menu and update it:

```tsx
<button
  onClick={() => {
    setShowMenu(false);
    setShowLogoutModal(true);
  }}
  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 transition-all"
>
  <LogOut className="h-5 w-5" />
  Logout
</button>
```

#### Add Modal (before the final closing `</div>` of return statement)
```tsx
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
    </div>
  );
}
```

---

## Visual Preview

### Hamburger Animation
```
Click → [☰] → Scales down to 85% → Scales back to 100%
Duration: 0.2s
Effect: Smooth, modern feedback
```

### Logout Modal
```
┌─────────────────────────────────────┐
│                                     │
│            [🚪 Icon]                │
│                                     │
│         Confirm Logout              │
│                                     │
│  You are about to log out. Are you │
│  sure you want to continue?         │
│                                     │
│  [  Cancel  ]  [  Logout  ]        │
│                                     │
└─────────────────────────────────────┘
```

---

## Features

### Hamburger Animation
✅ Smooth scale animation  
✅ Stays in position  
✅ 0.2s duration  
✅ No layout shift  
✅ Modern feel  

### Logout Modal
✅ Backdrop blur effect  
✅ Centered modal  
✅ Clear confirmation message  
✅ Two-button layout (Cancel | Logout)  
✅ Destructive color for logout button  
✅ Closes menu before showing modal  
✅ Fade-in and scale-in animations  
✅ Responsive on mobile  

---

## Testing Checklist

- [ ] Hamburger icon animates on click
- [ ] Animation doesn't shift icon position
- [ ] Logout button opens modal
- [ ] Modal shows confirmation message
- [ ] Cancel button closes modal without logging out
- [ ] Logout button logs user out
- [ ] Modal backdrop is clickable to close (optional enhancement)
- [ ] Modal is centered on all screen sizes
- [ ] Animations are smooth
- [ ] Works in both light and dark mode

---

## Optional Enhancements

### 1. Close Modal on Backdrop Click
```tsx
<div 
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
  onClick={() => setShowLogoutModal(false)}
>
  <div 
    className="bg-card rounded-2xl p-6 sm:p-8 max-w-sm mx-4 shadow-2xl animate-scale-in border border-border"
    onClick={(e) => e.stopPropagation()}
  >
    {/* Modal content */}
  </div>
</div>
```

### 2. Alternative Hamburger Animations

**Rotate Animation:**
```css
@keyframes hamburger-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(90deg); }
}
```

**Bounce Animation:**
```css
@keyframes hamburger-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
```

---

## File Locations

- **CSS**: `frontend/src/index.css`
- **Component**: `frontend/src/pages/UserDashboardPage.tsx`

---

## Summary

This implementation adds:
1. **Hamburger animation** - Smooth scale effect on click
2. **Logout modal** - Confirmation dialog before logging out

Both features enhance UX with modern, polished interactions while maintaining the existing design system.
