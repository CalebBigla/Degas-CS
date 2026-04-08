# Complete Image Upload Flow - Backend to Admin UI

## Overview
This document maps the complete flow of profile image uploads from user registration to display in the admin dashboard.

---

## 📁 Key Folders & Files

### Backend Structure

```
backend/
├── src/
│   ├── services/
│   │   └── imageService.ts          ⭐ MAIN IMAGE HANDLER
│   ├── controllers/
│   │   ├── fixedUserController.ts   ⭐ Registration & User Management
│   │   └── formsTablesController.ts ⭐ Admin Dashboard Data
│   └── config/
│       └── database.ts              Database configuration
└── uploads/                         ⭐ IMAGE STORAGE FOLDER
    └── [uploaded images stored here]
```

### Frontend Structure

```
frontend/
└── src/
    └── pages/
        ├── RegisterPage.tsx          User registration with camera
        ├── FormTableDetailPage.tsx   ⭐ Admin UI - displays images
        └── TablesPage.tsx            Tables list view
```

---

## 🔄 Complete Flow

### 1. User Registration (Upload)

**File:** `frontend/src/pages/RegisterPage.tsx`
- User captures photo with camera or uploads file
- Image converted to base64 string
- Sent to backend via POST `/api/users/register`

**File:** `backend/src/controllers/fixedUserController.ts`
```typescript
// Line ~189
profileImageUrl = await ImageService.saveBase64Image(photo);
```

**File:** `backend/src/services/imageService.ts` ⭐
```typescript
// Line ~145
static async saveBase64Image(base64Data: string): Promise<string>
```

**What it does:**
1. Validates base64 image data
2. Decodes base64 to buffer
3. Processes image (resize, optimize)
4. Generates unique filename
5. Saves to `backend/uploads/` folder
6. Returns URL path (e.g., `/uploads/image-123.jpg`)

**Storage:** `backend/uploads/[filename].jpg`

**Database:** Saves URL to `users.profileimageurl` column

---

### 2. Image Storage

**Folder:** `backend/uploads/` ⭐

**Environment Variable:**
```env
UPLOAD_DIR=uploads
```

**Image Processing:**
- Max width: 400px (maintains aspect ratio)
- Format: JPEG
- Quality: 80%
- Naming: `profile-[timestamp]-[random].jpg`

---

### 3. Admin Dashboard (Display)

**File:** `frontend/src/pages/FormTableDetailPage.tsx` ⭐

**API Call:**
```typescript
// Line ~59
const response = await api.get(`/admin/forms-tables/${formId}/users`);
```

**Backend Endpoint:** `backend/src/controllers/formsTablesController.ts`
```typescript
// Line ~177: getFormTableUsers()
// Line ~193: SELECT query
SELECT id, name, phone, email, address, scanned, scannedat, 
       profileimageurl, createdat, updatedat
FROM users
WHERE formid = ?

// Line ~208: Map to camelCase
profileImageUrl: user.profileimageurl
```

**Frontend Display:**
```tsx
// Line ~507
{record.profileImageUrl ? (
  <img
    src={record.profileImageUrl}
    alt="Profile"
    className="w-12 h-12 rounded-full object-cover"
  />
) : (
  <div className="w-12 h-12 rounded-full bg-gray-200">
    No Photo
  </div>
)}
```

---

## 🔧 Key Service: ImageService

**Location:** `backend/src/services/imageService.ts` ⭐

### Main Methods:

1. **saveBase64Image(base64Data: string)**
   - Saves base64 encoded images
   - Used for: Camera captures, data URLs
   - Returns: URL path string

2. **processAndSaveImage(file: Express.Multer.File)**
   - Saves uploaded file objects
   - Used for: File uploads
   - Returns: URL path string

3. **deleteImage(imageUrl: string)**
   - Deletes image from uploads folder
   - Used when: Updating/deleting users

4. **Image Processing:**
   - Resizes to max 400px width
   - Converts to JPEG
   - Optimizes quality (80%)
   - Generates unique filenames

---

## 📊 Database Schema

**Table:** `users`

**Column:** `profileimageurl` (TEXT, lowercase)

**Example Value:** `/uploads/profile-1234567890-abc123.jpg`

**Important:** 
- Database stores lowercase: `profileimageurl`
- API returns camelCase: `profileImageUrl`
- Mapping happens in controllers

---

## 🔌 API Endpoints

### Registration (Upload)
```
POST /api/users/register
Body: { name, email, phone, address, password, photo: "data:image/jpeg;base64,..." }
Response: { success: true, profileImageUrl: "/uploads/..." }
```

### Get Users (Display)
```
GET /api/admin/forms-tables/:formId/users
Response: {
  data: {
    records: [
      { id, name, email, profileImageUrl: "/uploads/..." }
    ]
  }
}
```

### Update User
```
PUT /api/users/:userId
Body: { name, email, photo: "data:image/jpeg;base64,..." }
Response: { success: true, profileImageUrl: "/uploads/..." }
```

---

## 🎯 Critical Files for Image Display

### Backend (3 files):
1. **`backend/src/services/imageService.ts`** - Image processing & storage
2. **`backend/src/controllers/fixedUserController.ts`** - Registration & updates
3. **`backend/src/controllers/formsTablesController.ts`** - Admin data retrieval

### Frontend (1 file):
1. **`frontend/src/pages/FormTableDetailPage.tsx`** - Admin UI display

### Storage:
1. **`backend/uploads/`** - Physical image files

---

## 🐛 Common Issues & Fixes

### Images not displaying in admin UI:

**Issue:** Database column name mismatch
**Fix:** Ensure queries use `profileimageurl` (lowercase) and map to `profileImageUrl`

**Issue:** Missing uploads folder
**Fix:** Create `backend/uploads/` folder with write permissions

**Issue:** Wrong API endpoint
**Fix:** Admin UI should call `/admin/forms-tables/:formId/users`

**Issue:** CORS or static file serving
**Fix:** Ensure backend serves `/uploads` as static files

---

## 📝 Environment Variables

```env
# Backend .env
UPLOAD_DIR=uploads
MAX_IMAGE_WIDTH=400
IMAGE_QUALITY=80
```

---

## 🔒 Security Notes

1. Images validated before saving (type, size)
2. Unique filenames prevent overwrites
3. Images resized to prevent large uploads
4. Only JPEG/PNG formats accepted
5. Base64 validation prevents malicious data

---

## 🚀 Deployment Checklist

- [ ] `backend/uploads/` folder exists
- [ ] Folder has write permissions
- [ ] Static file serving configured for `/uploads`
- [ ] Environment variables set
- [ ] Database has `profileimageurl` column
- [ ] API endpoints return `profileImageUrl` (camelCase)

---

## Summary

**Upload Flow:**
RegisterPage → fixedUserController → ImageService → uploads/ folder → Database

**Display Flow:**
FormTableDetailPage → formsTablesController → Database → Map to camelCase → Frontend

**Key Folder:** `backend/uploads/` stores all profile images
**Key Service:** `backend/src/services/imageService.ts` handles all image operations
**Key Controller:** `backend/src/controllers/formsTablesController.ts` serves admin UI data
