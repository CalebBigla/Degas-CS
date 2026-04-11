# ID Card Design Specification

## Overview
Clean, professional ID card design matching the provided PDF sample with light background and credit card dimensions.

## Design Specifications

### Dimensions
- **Size**: 91mm × 55mm (3.58" × 2.17") - Standard credit card size
- **Orientation**: Portrait
- **Format**: PDF output

### Layout Structure (Top to Bottom)

1. **Header Section**
   - Form name (dynamic from userData.formName or default "The Force of Grace Ministry")
   - Font: Bold, centered
   - Color: Dark gray/black (#1a1a1a)
   - Size: Large (text-xl or 20px)
   - NO TFG acronym box

2. **Profile Image**
   - Size: Large circular image (96px - 128px diameter)
   - Border: Light gray border
   - Centered
   - Fallback: User initials if no image

3. **User Information**
   - **Name**: Bold, large font (text-2xl), centered, dark color
   - **Phone Number**: Below name, medium font (text-base), gray color, centered
   - NO "Member" label here

4. **QR Code**
   - Size: Large (160px - 180px)
   - Centered
   - White background with minimal padding
   - Border: Light gray
   - NO number below QR code

5. **Footer Badge**
   - Text: "MEMBER"
   - Background: Dark gray (#4a5568 or similar)
   - Text color: White
   - Font: Bold, uppercase, letter-spacing
   - Full width at bottom

### Color Scheme
- **Background**: White (#ffffff)
- **Text Primary**: Dark gray/black (#1a1a1a, #2d3748)
- **Text Secondary**: Medium gray (#718096)
- **Border**: Light gray (#e2e8f0)
- **Footer Badge**: Dark gray (#4a5568)
- **Footer Text**: White (#ffffff)

## Implementation Code

### JSX Structure for UserDashboardPage.tsx

```tsx
{/* ID Card Display */}
<div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
  <div className="mx-auto max-w-[400px]">
    {/* ID Card - Clean Light Design */}
    <div className="rounded-2xl bg-white overflow-hidden shadow-xl border border-gray-200">
      
      {/* Card Body */}
      <div className="px-6 py-8 flex flex-col items-center text-center space-y-5">
        
        {/* Form Name / Organization - Bold and Centered */}
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
```

### PDF Generation Update (downloadIDCard function)

Update the PDF dimensions to credit card size:

```typescript
const pdf = new jsPDF({
  orientation: 'landscape', // Credit card is landscape
  unit: 'mm',
  format: [55, 91] // Height x Width for portrait display
});
```

Or for portrait PDF:

```typescript
const pdf = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: [91, 55] // Width x Height
});
```

## Key Changes from Current Design

1. ❌ **Removed**: Dark background
2. ❌ **Removed**: TFG acronym box
3. ❌ **Removed**: "Member" label under name
4. ❌ **Removed**: Number below QR code
5. ✅ **Added**: White/light background
6. ✅ **Added**: Phone number under name
7. ✅ **Added**: Credit card dimensions (91mm × 55mm)
8. ✅ **Changed**: Form name bold and centered (no acronym)
9. ✅ **Changed**: Cleaner, more professional appearance

## Notes

- Profile image (CM placeholder) is already working - DO NOT modify
- PDF generation is already working - only update dimensions
- Keep all existing functionality (download button, QR code generation, etc.)
- Ensure responsive design for mobile viewing
- Maintain accessibility standards

## Testing Checklist

- [ ] ID card displays with white background
- [ ] Form name shows correctly (dynamic)
- [ ] Profile image displays or shows initials
- [ ] User name displays correctly
- [ ] Phone number shows under name
- [ ] QR code displays without number below
- [ ] "MEMBER" badge at bottom with dark background
- [ ] Download button works
- [ ] PDF generates with correct dimensions (91mm × 55mm)
- [ ] Design looks good on mobile and desktop
