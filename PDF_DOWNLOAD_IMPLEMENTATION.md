# PDF ID Card Download Implementation Guide

## Status
The packages (`jspdf` and `html2canvas`) are already installed in `package.json`.

## Changes Needed in `frontend/src/pages/UserDashboardPage.tsx`

### 1. Add Imports (after line 8)
```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
```

### 2. Add ID to ID Card Container (around line 678)
Find this line:
```tsx
<div className="rounded-2xl bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-primary-foreground))] overflow-hidden shadow-xl">
```

Replace with:
```tsx
<div id="id-card-container" className="rounded-2xl bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-primary-foreground))] overflow-hidden shadow-xl">
```

### 3. Replace downloadQRCode Function (around line 140)
Find:
```typescript
  const downloadQRCode = () => {
    if (!qrCodeImage) return;
    
    const link = document.createElement('a');
    link.href = qrCodeImage;
    link.download = `qr-code-${userData?.name || 'user'}.png`;
    link.click();
    toast.success('QR code downloaded');
  };
```

Replace with:
```typescript
  const downloadQRCode = async () => {
    if (!qrCodeImage) {
      toast.error('QR code not available');
      return;
    }
    
    try {
      const idCardElement = document.getElementById('id-card-container');
      if (!idCardElement) {
        toast.error('ID card not found');
        return;
      }

      toast.loading('Generating PDF...');

      const canvas = await html2canvas(idCardElement, {
        scale: 2,
        backgroundColor: null,
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const cardAspectRatio = canvas.width / canvas.height;
      const cardWidth = pdfWidth * 0.8;
      const cardHeight = cardWidth / cardAspectRatio;
      
      const xOffset = (pdfWidth - cardWidth) / 2;
      const yOffset = (pdfHeight - cardHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, cardWidth, cardHeight);

      const fileName = `${userData?.name?.replace(/\s+/g, '-') || 'user'}-id-card.pdf`;
      pdf.save(fileName);

      toast.dismiss();
      toast.success('ID card downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };
```

### 4. Update Button Text (around line 740)
Find:
```tsx
Download QR Code
```
Replace with:
```tsx
Download ID Card
```

Find:
```tsx
Save this to your phone for easy access
```
Replace with:
```tsx
Download your ID card as PDF
```

## Testing
After making these changes:
1. Build the frontend: `npm run build`
2. Test locally to ensure PDF generation works
3. Deploy to Render

## How It Works
1. The `id="id-card-container"` attribute marks the ID card element for capture
2. `html2canvas` captures the ID card as an image
3. `jsPDF` creates a PDF and embeds the image
4. The PDF is downloaded with the user's name in the filename
