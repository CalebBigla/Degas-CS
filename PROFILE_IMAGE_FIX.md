# Profile Image Display Fix

## Issue
Profile images were not displaying in the admin dashboard tables view. Registration was working correctly and images were being uploaded, but the API wasn't properly mapping the image URLs in the response.

## Root Cause
The database column is `profileimageurl` (all lowercase in PostgreSQL), but the API responses weren't consistently mapping this to `profileImageUrl` (camelCase) for the frontend.

## Solution
Fixed field mapping in all API endpoints to ensure `profileimageurl` from the database is properly mapped to `profileImageUrl` in JSON responses.

### Files Fixed

1. **backend/src/controllers/formsTablesController.ts**
   - Line 208: Already correctly maps `user.profileimageurl` to `profileImageUrl`
   - This endpoint serves the admin dashboard tables view

2. **backend/src/controllers/fixedUserController.ts**
   - Fixed GET /api/users endpoint to map `profileimageurl` to `profileImageUrl`
   - Fixed login endpoint to map `user.profileimageurl` to `profileImageUrl`
   - Fixed update endpoint to use `user.profileimageurl` when reading existing image
   - Fixed update endpoint to use `user.profileimageurl` when deleting old image

### Key Changes
All database queries use lowercase `profileimageurl` (as stored in PostgreSQL), then map to camelCase `profileImageUrl` in API responses:

```typescript
// Database query uses lowercase
const users = await db.all(
  `SELECT id, name, email, profileimageurl FROM users WHERE formid = ?`,
  [formId]
);

// Map to camelCase for frontend
const mappedUsers = users.map(user => ({
  ...user,
  profileImageUrl: user.profileimageurl
}));
```

## Testing
After deploying these changes:
1. Register a new user with a profile photo
2. Check the admin dashboard tables view - profile images should now display
3. Verify existing users' images also appear
4. Test user login - profile image should be in the response
5. Test user update - existing images should be preserved

## Status
✅ Fixed - Ready for deployment

The backend now consistently maps `profileimageurl` (database) to `profileImageUrl` (API response) across all endpoints.

