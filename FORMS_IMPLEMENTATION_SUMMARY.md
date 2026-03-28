# Forms System Implementation Summary

## Overview
Implemented a complete dynamic forms system that allows creating multiple registration forms, each with unique registration links and dynamic table creation.

## Key Features

### 1. Multiple Forms Support
- Create unlimited registration forms
- Each form targets a specific table (e.g., Members, Students, Staff)
- Forms can be active or inactive
- Only one form can be "active" at a time (for `/register` endpoint)

### 2. Form-Specific Registration Links
Each form gets a unique registration URL:
```
/register/{formId}
```

Example:
- Form 1 (Members): `http://localhost:5173/register/1234567890-abc123`
- Form 2 (Students): `http://localhost:5173/register/0987654321-xyz789`

### 3. Dynamic Table Creation
When a form is created, the target table is automatically created with:
- `id` (auto-increment primary key)
- `uuid` (unique identifier for QR codes)
- All custom fields from the form (excluding email/password)
- `photoUrl` (for profile pictures)
- `created_at` (timestamp)

### 4. Copy Registration Link Feature
On the Forms page, each form has a "Copy Registration Link" button that:
- Copies the form-specific URL to clipboard
- Shows the full URL for easy sharing
- Works independently of the form's active status

## API Endpoints

### Backend Routes

#### Get Active Form (Public)
```
GET /api/onboarding
GET /api/onboarding/form
```
Returns the currently active form.

#### Get Specific Form (Public)
```
GET /api/onboarding/form/:formId
```
Returns a specific form by ID (for form-specific registration).

#### Register with Active Form (Public)
```
POST /api/onboarding/register
```
Registers a user with the currently active form.

#### Register with Specific Form (Public)
```
POST /api/onboarding/register/:formId
```
Registers a user with a specific form by ID.

#### Admin Endpoints (Requires Auth)
```
GET    /api/admin/forms          - List all forms
GET    /api/admin/forms/:id      - Get form by ID
POST   /api/admin/forms          - Create new form
PUT    /api/admin/forms/:id      - Update form
DELETE /api/admin/forms/:id      - Delete form
```

## Frontend Components

### FormsPage
- Lists all forms with their details
- Shows registration link for each form
- Copy link button with toast notification
- Create/Edit/Delete/Toggle active status

### RegisterPage
- Supports both `/register` and `/register/:formId` routes
- Dynamically loads form based on URL
- Renders form fields based on form definition
- Handles photo upload (camera/file)
- Submits to appropriate endpoint

### CreateFormModal
- Form name and description
- Target table (text input, not dropdown)
- Dynamic field builder
- Field types: text, email, password, number, date, textarea, select, file, camera
- Validation for required email and password fields

## Database Schema

### form_definitions
```sql
id TEXT PRIMARY KEY
form_name TEXT NOT NULL
target_table TEXT NOT NULL
description TEXT
is_active INTEGER DEFAULT 0
created_at TEXT
updated_at TEXT
```

### form_fields
```sql
id TEXT PRIMARY KEY
form_id TEXT
field_name TEXT NOT NULL
field_label TEXT NOT NULL
field_type TEXT NOT NULL
is_required INTEGER DEFAULT 0
is_email_field INTEGER DEFAULT 0
is_password_field INTEGER DEFAULT 0
order_index INTEGER
validation_rules TEXT
options TEXT
placeholder TEXT
created_at TEXT
```

### Dynamic Tables (e.g., Members, Students)
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
uuid TEXT UNIQUE
{custom_field_1} TEXT
{custom_field_2} INTEGER
...
photoUrl TEXT
created_at TEXT DEFAULT CURRENT_TIMESTAMP
```

## Usage Flow

### Admin Creates Form
1. Go to Forms page
2. Click "Create Form"
3. Fill in form details:
   - Form Name: "Church Registration"
   - Target Table: "Members"
   - Description: "Registration for church members"
4. Add fields:
   - Name (text, required)
   - Email (email, required, **check "Email Field"**)
   - Password (password, required, **check "Password Field"**)
   - Phone (text, optional)
5. Click "Create Form"
6. Table "Members" is automatically created
7. Copy registration link

### User Registers
1. Visit registration link: `/register/{formId}`
2. Fill out form fields
3. Upload photo (optional)
4. Submit registration
5. Core user created in `core_users` table
6. User data inserted into target table (e.g., Members)
7. Link created in `user_data_links` table
8. QR code generated
9. Redirect to login

### User Logs In
1. Visit `/login`
2. Enter email and password
3. System authenticates against `core_users` table
4. User can access member dashboard

## Key Implementation Details

### Dual Authentication
- Email/password stored in `core_users` table (hashed)
- User data stored in dynamic tables (Members, Students, etc.)
- `user_data_links` table connects core users to their data

### Form Validation
- At least one field must be marked as "Email Field"
- At least one field must be marked as "Password Field"
- Required fields enforced on frontend and backend

### Table Creation
- Tables created automatically when form is created
- If table already exists, it's reused
- Column types inferred from field types

## Files Modified

### Backend
- `backend/src/controllers/onboardingController.ts` - Added form-specific registration
- `backend/src/routes/onboarding.ts` - Added new routes
- `backend/src/services/formService.ts` - Added dynamic table creation

### Frontend
- `frontend/src/pages/FormsPage.tsx` - Added copy link button
- `frontend/src/pages/RegisterPage.tsx` - Added form-specific URL support
- `frontend/src/App.tsx` - Added route for `/register/:formId`

## Testing

### Test Form Creation
1. Login as admin (`admin@degas.com` / `admin123`)
2. Go to Forms page
3. Create a form with proper email/password fields
4. Verify table is created in database

### Test Registration
1. Copy registration link from Forms page
2. Open link in incognito/private window
3. Fill out form and submit
4. Verify user created in `core_users` table
5. Verify data inserted in target table
6. Verify link created in `user_data_links`

### Test Login
1. Go to `/login`
2. Login with registered email/password
3. Verify access to member dashboard

## Next Steps (Optional Enhancements)

1. **Form Analytics**: Track registration counts per form
2. **Form Expiration**: Set expiration dates for forms
3. **Custom Success Messages**: Per-form success messages
4. **Email Notifications**: Send welcome emails on registration
5. **Form Templates**: Pre-built form templates for common use cases
6. **Field Validation Rules**: Custom regex patterns per field
7. **Conditional Fields**: Show/hide fields based on other field values
8. **Multi-page Forms**: Split long forms into multiple pages
