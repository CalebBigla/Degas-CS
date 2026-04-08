# ⚠️ Cloudinary Setup Required

## Current Status

❌ **Cloudinary is NOT configured** - Images are being stored locally in `backend/uploads/`

This means:
- Images work in development ✅
- Images will be LOST on server restart ❌
- Images won't persist in production ❌

## Quick Setup (5 minutes)

### Step 1: Create Cloudinary Account

1. Go to https://cloudinary.com
2. Click "Sign Up" (free tier available)
3. Verify your email

### Step 2: Get Credentials

1. Login to Cloudinary
2. Go to Dashboard (https://cloudinary.com/console)
3. You'll see:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### Step 3: Add to Environment File

Edit `backend/.env` and add these lines:

```env
# Cloudinary Configuration (for persistent image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Example:**
```env
CLOUDINARY_CLOUD_NAME=degas-attendance
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### Step 4: Restart Backend

```bash
# Stop the backend (Ctrl+C)
# Then restart:
cd backend
npm run dev
```

### Step 5: Verify

Look for this message in backend logs:
```
✅ Cloudinary configured for persistent file storage
```

If you see:
```
⚠️  Cloudinary not configured - using local storage (ephemeral on Render)
```

Then credentials are incorrect or missing.

### Step 6: Test Upload

```bash
cd backend
node test-cloudinary-upload.js
```

Expected output:
```
✅ Cloudinary credentials are configured
📤 Testing upload...
✅ Upload successful!
🎉 Cloudinary is working correctly!
```

## What Happens After Setup

### Before (Local Storage):
```
User uploads photo
  ↓
Saved to: backend/uploads/uuid.webp
  ↓
Database: /uploads/uuid.webp
  ↓
❌ Lost on server restart
```

### After (Cloudinary):
```
User uploads photo
  ↓
Uploaded to: Cloudinary CDN
  ↓
Database: https://res.cloudinary.com/.../image.webp
  ↓
✅ Persists forever
✅ Fast CDN delivery
✅ Automatic optimization
```

## Troubleshooting

### "Upload failed: Invalid credentials"

**Solution:** Double-check your credentials in `.env` file
- No quotes around values
- No spaces
- Exact copy from Cloudinary dashboard

### "Cloudinary is NOT configured"

**Solution:** 
1. Check `.env` file has all 3 variables
2. Restart backend server
3. Check for typos in variable names

### "Cannot find module 'cloudinary'"

**Solution:**
```bash
cd backend
npm install cloudinary
```

## Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month

**For this app:**
- Average image: 30KB
- 1000 users = 30MB
- Free tier = 833,000 users worth of storage

You're good to go! 🎉

## Need Help?

Run the test script:
```bash
cd backend
node test-cloudinary-upload.js
```

It will tell you exactly what's wrong.
