# Cloudinary Setup Guide for Persistent File Storage

## Problem
Render's free tier uses **ephemeral storage** - files uploaded to the server are deleted when it restarts. This causes:
- ❌ User photos disappear
- ❌ ID cards can't be generated (photos missing)
- ❌ Downloaded ID cards don't show photos

## Solution: Cloudinary
Cloudinary provides free cloud storage for images (25GB storage, 25GB bandwidth/month).

---

## Step 1: Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Click "Sign Up" (free tier is sufficient)
3. Complete registration
4. Verify your email

---

## Step 2: Get Cloudinary Credentials

1. Log in to Cloudinary Dashboard
2. You'll see your credentials on the main page:
   ```
   Cloud Name: your-cloud-name
   API Key: 123456789012345
   API Secret: abcdefghijklmnopqrstuvwxyz
   ```
3. Copy these values (you'll need them for Render)

---

## Step 3: Add Cloudinary to Render Backend

1. Go to **Render Dashboard**
2. Select your **Backend Service**
3. Go to **Environment** tab
4. Add these three new environment variables:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

**Important**: Replace with your actual Cloudinary credentials!

---

## Step 4: Deploy Updated Code

The code has been updated to automatically use Cloudinary when credentials are present.

1. Commit and push changes:
   ```bash
   git add .
   git commit -m "Add Cloudinary integration for persistent file storage"
   git push origin main
   ```

2. Render will auto-deploy the changes

---

## How It Works

### Before (Ephemeral Storage)
```
User uploads photo → Saved to /tmp/uploads → Deleted on restart ❌
```

### After (Cloudinary)
```
User uploads photo → Uploaded to Cloudinary → Permanent storage ✅
```

### Automatic Detection
The system automatically detects if Cloudinary is configured:

```typescript
// If Cloudinary credentials exist
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  // Upload to Cloudinary ✅
} else {
  // Fallback to local storage (ephemeral) ⚠️
}
```

---

## What Gets Stored in Cloudinary

1. **User Photos** - Uploaded when creating/editing users
2. **Profile Images** - Displayed in tables and ID cards
3. **All images are automatically**:
   - Resized to 400x400px max
   - Converted to WebP format
   - Optimized for web delivery

---

## Testing After Setup

### 1. Check Backend Logs
After deploying, check Render logs for:
```
✅ Cloudinary configured for persistent file storage
```

If you see:
```
⚠️ Cloudinary not configured - using local storage (ephemeral on Render)
```
Then credentials are missing or incorrect.

### 2. Upload a User Photo
1. Go to Tables → Select a table
2. Add or edit a user
3. Upload a photo
4. Check backend logs for:
   ```
   Image uploaded to Cloudinary: https://res.cloudinary.com/...
   ```

### 3. Generate ID Card
1. Select a user with a photo
2. Click "Generate ID Card"
3. Download the PDF
4. Open it - photo should be visible ✅

### 4. Verify Photo Persistence
1. Restart your Render backend service
2. Go back to the table
3. User photo should still be visible ✅

---

## Troubleshooting

### Photos Still Disappearing
- Verify Cloudinary credentials are correct
- Check backend logs for "Cloudinary configured" message
- Ensure you deployed the updated code

### "Failed to upload image to cloud storage"
- Check Cloudinary API credentials
- Verify Cloudinary account is active
- Check Render logs for detailed error

### Photos Not Showing in ID Cards
- Verify photo URL in database starts with `https://res.cloudinary.com/`
- Check backend logs for "Fetching photo from Cloudinary" message
- Ensure axios is installed (`npm install axios`)

### Old Photos Still Using Local Storage
- Old photos won't be migrated automatically
- Re-upload photos for existing users
- Or manually update database URLs to Cloudinary URLs

---

## Database Photo URL Format

### Before (Local Storage)
```
photo_url: "uploads/abc123.webp"
```

### After (Cloudinary)
```
photo_url: "https://res.cloudinary.com/your-cloud/image/upload/v123/degas-cs/user-photos/abc123.webp"
```

The system automatically handles both formats!

---

## Cloudinary Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Images**: Unlimited

For a typical access control system with 100-500 users, this is more than enough.

---

## Cost Estimate

### Free Tier (Sufficient for Most Cases)
- 0-500 users: **FREE** ✅
- 500-1000 users: **FREE** ✅
- 1000+ users: May need paid plan

### If You Exceed Free Tier
- Paid plans start at $89/month
- But you'd need 10,000+ users to exceed free tier

---

## Alternative: AWS S3

If you prefer AWS S3 instead of Cloudinary:

1. Create S3 bucket
2. Add these environment variables:
   ```bash
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=degas-cs-uploads
   ```
3. Update `imageService.ts` to use S3 SDK

---

## Summary

✅ Cloudinary provides persistent file storage  
✅ Free tier is sufficient for most use cases  
✅ Automatic fallback to local storage if not configured  
✅ Photos and ID cards will work reliably in production  
✅ No code changes needed after adding credentials  

**Next Step**: Add Cloudinary credentials to Render and deploy!
