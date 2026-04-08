# Image Upload Testing Guide

## Quick Diagnosis: Is the 409 Error a Bug?

**NO** - The 409 error is working as designed. It prevents duplicate user registrations.

### Why You're Seeing 409 Errors:

1. **Email already exists** - Most common cause
2. **Phone number already exists** - Also checked
3. **Testing with same data** - Using test@example.com multiple times

### How to Verify:

```bash
# Check if an email exists in the database
cd backend
node check-user-exists.js test@example.com

# Check if a phone exists
node check-user-exists.js +1234567890
```

## Testing Scenarios

### Test 1: Fresh Registration (Should Work)

```bash
# 1. Start the system
cd backend && npm run dev
cd frontend && npm run dev

# 2. Register with UNIQUE data:
Email: unique-test-$(date +%s)@example.com
Phone: +1555$(date +%s | tail -c 8)
Name: Test User
Address: 123 Test St
Photo: Upload any image

# Expected: ✅ Success - User registered
```

### Test 2: Duplicate Email (Should Fail with 409)

```bash
# 1. Register user with: test@example.com
# 2. Try to register again with: test@example.com

# Expected: ❌ 409 Error
# Message: "This email is already registered. Please try logging in instead."
```

### Test 3: Duplicate Phone (Should Fail with 409)

```bash
# 1. Register user with phone: +1234567890
# 2. Try to register again with same phone

# Expected: ❌ 409 Error
# Message: "Phone number already registered"
```

### Test 4: Missing Photo (Should Fail with 400)

```bash
# 1. Fill all fields EXCEPT photo
# 2. Try to submit

# Expected: ❌ 400 Error
# Message: "Profile image is required. Please upload or capture a photo."
```

### Test 5: Admin Dashboard Image Display

```bash
# 1. Register a user with photo
# 2. Login as admin
# 3. Go to Forms & Tables
# 4. Click on the form
# 5. Check the table

# Expected: ✅ Photo appears in "Photo" column
# - Thumbnail (12x12 rounded)
# - Click to view full size
# - "No Photo" placeholder if missing
```

### Test 6: Admin Add User with Photo

```bash
# 1. Login as admin
# 2. Go to Forms & Tables > Select Form
# 3. Click "Add User" button
# 4. Fill all fields
# 5. Upload photo
# 6. Submit

# Expected: ✅ User created with photo
# Photo appears in table immediately
```

## Common Issues and Solutions

### Issue 1: "409 Conflict" Error

**Diagnosis:**
```bash
cd backend
node check-user-exists.js your-email@example.com
```

**Solutions:**
- Use a different email address
- Use a different phone number
- Delete the existing user from admin dashboard
- Clear the database (development only)

### Issue 2: Images Not Persisting After Deployment

**Cause:** Cloudinary not configured

**Solution:**
```bash
# Add to backend/.env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Get Cloudinary credentials:**
1. Sign up at https://cloudinary.com
2. Go to Dashboard
3. Copy credentials
4. Add to .env file
5. Restart backend

### Issue 3: Images Not Showing in Admin Dashboard

**Check:**
1. Does the user have a `profileImageUrl` in database?
   ```bash
   cd backend
   node check-user-exists.js user@example.com
   # Look for "Profile Image" field
   ```

2. Is the image URL accessible?
   - Cloudinary URL: Should start with `https://res.cloudinary.com/`
   - Local URL: Should start with `/uploads/`

3. Check browser console for errors

**Solution:**
- If using local storage, ensure `backend/uploads/` directory exists
- If using Cloudinary, verify credentials are correct
- Check image URL in database matches actual location

### Issue 4: Photo Upload Button Not Working

**Check:**
1. Browser console for JavaScript errors
2. File input accepts images: `accept="image/*"`
3. File size (should be < 5MB)

**Solution:**
- Try different image format (JPG, PNG, WebP)
- Reduce image size
- Check browser permissions for file access

## Database Queries for Debugging

### Check All Users with Images
```sql
SELECT id, name, email, profileImageUrl 
FROM users 
WHERE profileImageUrl IS NOT NULL;
```

### Check Users Without Images
```sql
SELECT id, name, email 
FROM users 
WHERE profileImageUrl IS NULL;
```

### Count Users by Form
```sql
SELECT formId, COUNT(*) as user_count 
FROM users 
GROUP BY formId;
```

### Find Duplicate Emails
```sql
SELECT email, COUNT(*) as count 
FROM users 
GROUP BY email 
HAVING count > 1;
```

## API Endpoint Testing

### Test Registration Endpoint
```bash
curl -X POST http://localhost:3001/api/form/register/YOUR_FORM_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone": "+1234567890",
    "email": "test@example.com",
    "address": "123 Test St",
    "password": "password123",
    "photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }'
```

### Test Get Users Endpoint
```bash
curl http://localhost:3001/api/form/users/YOUR_FORM_ID
```

### Test Login Endpoint
```bash
curl -X POST http://localhost:3001/api/form/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Expected Behavior Summary

| Scenario | Expected Result | Status Code |
|----------|----------------|-------------|
| New user with photo | Success | 201 |
| Duplicate email | Error: "Email already registered" | 409 |
| Duplicate phone | Error: "Phone already registered" | 409 |
| Missing photo | Error: "Profile image required" | 400 |
| Missing required field | Error: "All fields required" | 400 |
| Invalid image format | Error: "Invalid image format" | 400 |
| Admin view users | List with photos | 200 |
| Admin add user | Success with photo | 201 |

## Cloudinary Setup (Production)

### Step 1: Create Account
1. Go to https://cloudinary.com
2. Sign up (free tier available)
3. Verify email

### Step 2: Get Credentials
1. Login to Cloudinary
2. Go to Dashboard
3. Copy:
   - Cloud Name
   - API Key
   - API Secret

### Step 3: Configure Backend
```bash
# Edit backend/.env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### Step 4: Restart Backend
```bash
cd backend
npm run dev
```

### Step 5: Verify
Check backend logs for:
```
✅ Cloudinary configured for persistent file storage
```

### Step 6: Test Upload
1. Register a new user with photo
2. Check Cloudinary dashboard
3. Go to Media Library > degas-cs/user-photos
4. Verify image appears

## Performance Testing

### Test Image Processing Speed
```bash
# Time a registration with photo
time curl -X POST http://localhost:3001/api/form/register/FORM_ID \
  -H "Content-Type: application/json" \
  -d @test-registration.json

# Expected: < 2 seconds with Cloudinary
# Expected: < 1 second with local storage
```

### Test Image Load Speed
1. Open admin dashboard
2. Open browser DevTools > Network
3. Filter by "Img"
4. Check load times

**Expected:**
- Cloudinary: < 500ms (CDN cached)
- Local: < 200ms (same server)

## Troubleshooting Checklist

- [ ] Backend is running on port 3001
- [ ] Frontend is running on port 5173
- [ ] Database file exists: `backend/data/degas.db`
- [ ] Uploads directory exists: `backend/uploads/`
- [ ] Cloudinary credentials are correct (if using)
- [ ] No CORS errors in browser console
- [ ] Image file is valid (JPG, PNG, WebP)
- [ ] Image size is < 5MB
- [ ] Email is unique (not already registered)
- [ ] Phone is unique (not already registered)
- [ ] All required fields are filled

## Success Indicators

✅ **Registration Working:**
- User can upload photo
- Photo preview shows
- Registration succeeds (201)
- User redirected to success page

✅ **Admin Dashboard Working:**
- Photo column visible
- Thumbnails display
- Click to view full size
- "No Photo" fallback for missing images

✅ **Image Storage Working:**
- Images persist after server restart (Cloudinary)
- OR images exist in `backend/uploads/` (Local)
- Image URLs are accessible
- Images load quickly

## Next Steps After Testing

1. **If everything works:**
   - Configure Cloudinary for production
   - Deploy to production environment
   - Test end-to-end in production

2. **If 409 errors persist:**
   - Use `check-user-exists.js` to verify duplicates
   - Clear test data from database
   - Use unique emails for each test

3. **If images don't persist:**
   - Configure Cloudinary
   - Verify credentials
   - Check Cloudinary dashboard

4. **If admin dashboard doesn't show images:**
   - Check `profileImageUrl` in database
   - Verify image URLs are accessible
   - Check browser console for errors

---

**Remember:** The 409 error is NOT a bug. It's the system correctly preventing duplicate registrations. Use unique emails and phone numbers for each test.
