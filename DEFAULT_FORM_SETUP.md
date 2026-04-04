# Default Form: The Force of Grace Ministry

## ✅ Setup Complete

"The Force of Grace Ministry" form has been added as a permanent, default form in the system.

---

## Form Details

```
Name: The Force of Grace Ministry
ID: 06aa4b67-76fe-411a-a1e0-682871e8506f
Registration Link: http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f
QR Code: Generated (base64, stored in database)
Status: Active
Table: forms
```

---

## How It Works

### 1. Database Initialization
The form is automatically created when the database initializes:
- Checks if "The Force of Grace Ministry" exists
- If not, creates it with a unique ID and QR code
- Happens on every backend startup (idempotent)

### 2. Location in Code
File: `backend/src/config/sqlite.ts`
- Added to the `initializeDatabase()` function
- Runs after the `forms` table is created
- Uses QRCode library to generate base64 QR code

---

## API Endpoints

### Get Form Details
```bash
GET http://localhost:3001/api/fixed-forms/06aa4b67-76fe-411a-a1e0-682871e8506f
```

### Register User
```bash
POST http://localhost:3001/api/auth/register/06aa4b67-76fe-411a-a1e0-682871e8506f

Body:
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "address": "123 Main St",
  "password": "password123"
}
```

### Get Registered Users
```bash
GET http://localhost:3001/api/users/06aa4b67-76fe-411a-a1e0-682871e8506f
```

### Get Analytics
```bash
GET http://localhost:3001/api/analytics/06aa4b67-76fe-411a-a1e0-682871e8506f
```

---

## Frontend Integration

### Registration Page
Users can register at:
```
http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f
```

### Display QR Code
```tsx
// Fetch form details
const response = await api.get('/fixed-forms/06aa4b67-76fe-411a-a1e0-682871e8506f');
const form = response.data.data;

// Display QR code
<img src={form.qrCode} alt="Registration QR Code" />
```

### List Users
```tsx
// Fetch users
const response = await api.get('/users/06aa4b67-76fe-411a-a1e0-682871e8506f');
const users = response.data.data;

// Display in table
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Phone</th>
      <th>Email</th>
      <th>Address</th>
      <th>Scanned</th>
    </tr>
  </thead>
  <tbody>
    {users.map(user => (
      <tr key={user.id}>
        <td>{user.name}</td>
        <td>{user.phone}</td>
        <td>{user.email}</td>
        <td>{user.address}</td>
        <td>{user.scanned ? '✅' : '❌'}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## Manual Creation Script

If you need to manually create or recreate the form:

```bash
cd backend
node create-grace-form.js
```

This script:
- Checks if form exists
- Creates if doesn't exist
- Generates new QR code
- Returns form ID and registration link

---

## Verification

### Check if form exists
```bash
# PowerShell
Invoke-RestMethod -Uri 'http://localhost:3001/api/fixed-forms' -Method Get
```

### Expected output
```json
{
  "success": true,
  "data": [
    {
      "id": "06aa4b67-76fe-411a-a1e0-682871e8506f",
      "name": "The Force of Grace Ministry",
      "link": "http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f",
      "qrCode": "data:image/png;base64,...",
      "isActive": 1,
      "userCount": 0,
      "createdAt": "2026-04-04T14:00:00.000Z",
      "updatedAt": "2026-04-04T14:00:00.000Z"
    }
  ]
}
```

---

## Database Schema

### forms table
```sql
CREATE TABLE forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  link TEXT NOT NULL UNIQUE,
  qrCode TEXT DEFAULT NULL,
  isActive BOOLEAN DEFAULT 1,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### users table (linked via formId)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  password TEXT NOT NULL,
  formId TEXT NOT NULL,  -- Links to forms.id
  scanned BOOLEAN DEFAULT 0,
  scannedAt DATETIME DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (formId) REFERENCES forms(id) ON DELETE CASCADE
)
```

---

## Important Notes

1. **Permanent Form**: This form is created automatically on database initialization
2. **Not Dynamic**: Unlike other forms, this one is hardcoded and always present
3. **Unique ID**: The form ID is generated once and stays the same
4. **QR Code**: Generated automatically with the registration link
5. **Active by Default**: The form is always active (isActive = 1)

---

## Testing

### Test Registration
```bash
# PowerShell
$body = @{
  name = "Test User"
  phone = "+1234567890"
  email = "test@test.com"
  address = "123 Test St"
  password = "password123"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/register/06aa4b67-76fe-411a-a1e0-682871e8506f' -Method Post -Body $body -ContentType 'application/json'
```

### Test User Retrieval
```bash
Invoke-RestMethod -Uri 'http://localhost:3001/api/users/06aa4b67-76fe-411a-a1e0-682871e8506f' -Method Get
```

---

## Files Created/Modified

### New Files
- `backend/create-grace-form.js` - Manual creation script
- `DEFAULT_FORM_SETUP.md` - This documentation

### Modified Files
- `backend/src/config/sqlite.ts` - Added default form creation to initialization

---

## Status

✅ Form created in database
✅ QR code generated
✅ Auto-creation added to database initialization
✅ API endpoints working
✅ Manual creation script available
✅ Documentation complete

The form is now permanent and will always be available in the system!
