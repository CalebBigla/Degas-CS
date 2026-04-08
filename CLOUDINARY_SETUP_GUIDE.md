# Cloudinary Setup Guide - Profile Image Storage ✅

## Problem
Profile images disappear after server restart because they're stored locally (ephemeral on Render).

## Solution: Configure Cloudinary
Cloudinary provides persistent cloud storage for profile images. Once set up, images will persist through deployments and restarts.

---

## Step 1: Create Cloudinary Account
1. Go to **https://cloudinary.com/users/register/free**
2. Sign up for a **Free plan** (includes 25 GB storage + 25 credits)
3. Verify your email
4. Log in to your Cloudinary Dashboard

---

## Step 2: Get Your Cloudinary Credentials

From your **Cloudinary Dashboard**:

1. Navigate to **Settings → Account** (or click Account in top-right)
2. Find your **Cloud Name** (e.g., `abc123xyz`)
3. Click **View API Keys**
4. Find your **API Key** (long alphanumeric string)
5. Click **Generate** next to API Secret to create a new **API Secret** (or reveal existing one)

You now have:
- 🔹 **Cloud Name**: Your Cloudinary cloud name
- 🔹 **API Key**: Your public API key
- 🔹 **API Secret**: Your private API secret (KEEP SECURE!)

---

## Step 3: Update Local Development (.env.local)

**File**: `backend/.env.local` (or create if it doesn't exist)

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name-here
CLOUDINARY_API_KEY=your-api-key-here
CLOUDINARY_API_SECRET=your-api-secret-here
```

Test locally:
```bash
cd backend
npm run dev
# Try uploading a profile image through the registration page
```

---

## Step 4: Update Production (Render Dashboard)

### Via Render Dashboard:

1. Go to your **Render Dashboard**
2. Select your **Backend Service**
3. Go to **Settings → Environment**
4. Add three new environment variables:

| Key | Value |
|-----|-------|
| `CLOUDINARY_CLOUD_NAME` | Your Cloud Name |
| `CLOUDINARY_API_KEY` | Your API Key |
| `CLOUDINARY_API_SECRET` | Your API Secret |

5. **Manual Deploy** → Your service will redeploy with these credentials

### Via render.yaml (Better):

Update `render.yaml`:

```yaml
env:
  - key: CLOUDINARY_CLOUD_NAME
    value: your-cloud-name
  - key: CLOUDINARY_API_KEY
    value: your-api-key
  - key: CLOUDINARY_API_SECRET
    value: your-api-secret
```

Then push to GitHub and Render will use these values.

---

## Step 5: Verify Cloudinary is Working

### Check Backend Logs:

After redeploy, look for this in the **Render logs**:
```
✅ Cloudinary configured for persistent file storage
```

If you see this instead:
```
⚠️  Cloudinary not configured - using local storage (ephemeral on Render)
```

❌ **Cloudinary is NOT configured.** Go back to Step 4 and verify your environment variables are set.

### Test Upload:

1. Log in to your admin dashboard at https://degas-cs-frontend.onrender.com
2. Create a new form (or use existing)
3. Register a new user **with a profile photo**
4. Check the admin dashboard → The photo should display ✅

### Check Cloudinary Dashboard:

1. Go to Cloudinary Dashboard
2. Click **Media Library**
3. Look for folder: `degas-cs/user-photos`
4. You should see uploaded images ✅

---

## Step 6: Migrate Existing Images (Optional)

If you already have images stored locally (before Cloudinary setup):

The old images are lost (stored only in ephemeral local storage). **Users need to re-upload their photos:**

1. On the admin dashboard, re-register users
2. Ask users to upload photos again
3. New images will now be stored on Cloudinary ✅

---

## Troubleshooting

### Issue: Still seeing "No Photo" after setup

**Check**:
1. ✅ Backend logs show `✅ Cloudinary configured...`?
2. ✅ Environment variables are set in Render?
3. ✅ Did you manually deploy after adding env vars?
4. ✅ Try clearing browser cache (Ctrl+Shift+Delete)

**Fix**:
```bash
# In Render Dashboard, click "Manual Deploy" → Clear Deploy History
# This forces a fresh deployment with new credentials
```

### Issue: Upload fails with "Failed to upload image to cloud storage"

**Check**:
1. ✅ Credentials are correct in Render?
2. ✅ API Secret is not cut off (very long string)?
3. ✅ Cloud Name matches exactly?

**Fix**: Re-copy credentials from Cloudinary Dashboard and verify character-by-character.

### Issue: Cloudinary says "Invalid API Key"

**Causes**:
- Accidentally pasted with spaces before/after
- Copied the wrong credential
- API Secret was regenerated (old one won't work)

**Fix**: 
1. Go to Cloudinary Dashboard → Settings → Account
2. Check your Cloud Name matches exactly
3. Click View API Keys and re-copy the API Key
4. If still failing, click **Generate** to create a new API Secret

---

## Verification Checklist ✅

After completing setup:

- [ ] Cloudinary account created and verified
- [ ] Cloud Name, API Key, API Secret obtained
- [ ] Added to `backend/.env.local` for local testing
- [ ] Added to Render Environment in Dashboard
- [ ] Backend logs show "✅ Cloudinary configured..."
- [ ] Test user uploaded with photo appears in admin dashboard
- [ ] Photo persists after server restart/redeploy
- [ ] Photo visible in Cloudinary Media Library

---

## Pricing

**Cloudinary Free Plan includes**:
- 25 GB storage (more than enough for profile photos)
- 25 MB asset transformation credits monthly
- Perfect for most use cases

**Typical usage**: 1,000 profile photos = ~100 MB storage (well under limit)

No credit card required. Free plan never expires. 🎉

---

## Security Notes

- **Never commit** `backend/.env.production` with real credentials to GitHub
- **Always** set credentials in Render Dashboard environment, not in files
- **API Secret must be kept private** (never share with anyone)
- Render's environment variables are encrypted at rest

---

## Next Steps

After Cloudinary is working:

1. ✅ Profile images persist through deployments
2. ✅ Admin dashboard shows photos for all registered users
3. ✅ Event scanning page displays profile images
4. ✅ No more "No Photo" after server restarts

**Questions?** Check your Cloudinary API credentials are 100% correct character-by-character.
