# PHASE 1: IMAGE UPLOAD / CAMERA INTEGRATION

## Implementation Plan

### 1. Database Schema Update
- Add `photo_url` column to `users` table
- Make it optional (nullable) to not break existing users
- Store Cloudinary URL only

### 2. Backend Changes
- Install Cloudinary SDK: `cloudinary`
- Add Cloudinary configuration
- Update registration endpoint to handle image upload
- Upload to Cloudinary and get URL
- Store URL in database

### 3. Frontend Changes
- Update RegisterPage to include image upload/camera capture
- Add file input with camera option
- Preview image before upload
- Send image with registration data

### 4. Environment Variables Needed
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Files to Modify
1. `backend/src/routes/setup.ts` - Add photo_url column
2. `backend/package.json` - Add cloudinary dependency
3. `backend/src/config/cloudinary.ts` - New file for Cloudinary config
4. `backend/src/controllers/fixedUserController.ts` - Update registration
5. `frontend/src/pages/RegisterPage.tsx` - Add image upload UI

## Testing Plan
1. Test registration without image (backward compatibility)
2. Test registration with uploaded image
3. Test registration with camera capture
4. Verify Cloudinary URL is stored correctly
5. Verify existing users still work
