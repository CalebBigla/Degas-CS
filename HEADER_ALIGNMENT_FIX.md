# Header Alignment Fix - UserDashboardPage

## Issue
The header icons (dark mode toggle and hamburger menu) need to be vertically centered and horizontally aligned with the "Welcome, [Name]" text block.

## Required Layout

```
┌─────────────────────────────────────────────────────────┐
│  Welcome, [Name]              [🌙] [☰]                  │
│  User Dashboard                                          │
└─────────────────────────────────────────────────────────┘
```

### Left Side (Text Block):
- Line 1: "Welcome, [Name]" (text-2xl, bold)
- Line 2: "User Dashboard" (text-xs, muted, mt-0.5)

### Right Side (Icons):
- Dark mode toggle icon
- Hamburger menu icon
- Both vertically centered relative to the entire text block

## Implementation

### Current Code (INCORRECT):
```tsx
<div className="flex items-center justify-between">
  {/* Left: Icons */}
  <div className="flex items-center gap-2">
    <button onClick={() => setShowMenu(!showMenu)}>
      <Menu className="h-5 w-5 text-white" />
    </button>
    <button onClick={toggleTheme}>
      {theme === 'light' ? <Moon /> : <Sun />}
    </button>
  </div>

  {/* Right: Welcome Text */}
  <div className="text-right">
    <h1 className="text-xl font-bold text-white">
      Welcome, <span className="text-primary">{userData?.name?.split(' ')[0] || 'Church'}</span>
    </h1>
    <p className="text-white/70 text-xs font-medium">User Dashboard</p>
  </div>
</div>
```

### Fixed Code (CORRECT):
```tsx
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
</div>
```

## Key Changes

1. **Swapped Left and Right**:
   - Text block moved from right to left
   - Icons moved from left to right

2. **Removed `text-right` class**:
   - Changed `<div className="text-right">` to `<div>`
   - Text now left-aligned on the left side

3. **Restored Original Font Size**:
   - Changed `text-xl` back to `text-2xl` for h1
   - Added `mt-0.5` to subtitle for proper spacing

4. **Icon Order**:
   - Dark mode toggle first
   - Hamburger menu second

5. **Vertical Centering**:
   - Parent div uses `flex items-center justify-between`
   - Icons automatically center relative to the full height of the text block
   - No manual positioning needed

## File Location
`frontend/src/pages/UserDashboardPage.tsx` - Lines 440-475

## Testing
After applying the fix:
- [ ] Icons appear on the right side
- [ ] Text appears on the left side
- [ ] Icons are vertically centered with the text block
- [ ] No shifting when toggling dark mode
- [ ] Responsive on mobile devices

## Manual Application
If the automated script didn't work, manually replace the header section in `UserDashboardPage.tsx` starting at line 440 with the "Fixed Code" above.
