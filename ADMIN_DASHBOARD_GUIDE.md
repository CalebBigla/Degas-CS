# Admin Dashboard Login Guide

## ✅ Super Admin User (core_users)

The super admin account exists in `core_users` table and has access to ALL dashboard modules:

```
Email: admin@degas.com
Password: admin123
Role: super_admin
Status: active
```

**Why core_users?** The `core_users` authentication provides full access to all dashboard modules without breaking. The old `admins` table authentication caused module access issues.

---

## Admin Login

### Endpoint
```
POST http://localhost:3001/api/core-auth/login
```

### Request Body
```json
{
  "email": "admin@degas.com",
  "password": "admin123"
}
```

**IMPORTANT:** Use the `/api/core-auth/login` endpoint, not `/api/auth/login`!

### Response
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "3f44a04a-105c-404a-8a51-eb2331201330",
      "email": "admin@degas.com",
      "role": "super_admin",
      "status": "active",
      "full_name": "Super Admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Frontend Implementation

### Login Form

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/core-auth/login', {
        email,
        password
      });

      if (response.data.success) {
        // Store token
        localStorage.setItem('degas_token', response.data.data.token);
        
        // Store admin info
        localStorage.setItem('degas_user', JSON.stringify(response.data.data.user));
        
        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6">Admin Login</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Protected Admin Route

```tsx
import { Navigate } from 'react-router-dom';

export function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('degas_token');
  const userStr = localStorage.getItem('degas_user');
  
  if (!token || !userStr) {
    return <Navigate to="/admin/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'super_admin' && user.role !== 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
  } catch {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
```

### Using in Routes

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## API Requests with Authentication

Once logged in, include the token in all API requests:

```tsx
// In your api.ts file
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api'
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('degas_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## Admin Dashboard Features

Once logged in, the admin can access:

### 1. Form Management
```
GET    /api/fixed-forms           - List all forms
POST   /api/fixed-forms           - Create new form
GET    /api/fixed-forms/:formId   - Get form details
PUT    /api/fixed-forms/:formId   - Update form
DELETE /api/fixed-forms/:formId   - Delete form
```

### 2. User Management
```
GET    /api/users/:formId         - List users for a form
```

### 3. Analytics
```
GET    /api/analytics/:formId     - Get attendance statistics
```

### 4. Scanning
```
POST   /api/scan                  - Mark user as scanned
```

---

## Testing Admin Login

### Using curl (PowerShell)
```powershell
$body = @{ email = 'admin@degas.com'; password = 'admin123' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3001/api/core-auth/login' -Method Post -Body $body -ContentType 'application/json'
```

### Using Postman
1. Method: POST
2. URL: `http://localhost:3001/api/core-auth/login`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "email": "admin@degas.com",
  "password": "admin123"
}
```

---

## Important Notes

### Port Configuration
- Backend is running on **port 3001** (not 10000)
- Update your frontend API base URL to: `http://localhost:3001/api`

### Authentication Differences
- **Super Admin Login**: `/api/core-auth/login` - uses `email` + `password` (core_users table)
- **Regular User Login**: `/api/auth/login` (fixed schema) - uses `email` + `password` (users table)
- **Old Admin Login**: `/api/auth/login` - uses `username` + `password` (admins table - deprecated)

### Token Storage
- Store `token` in localStorage as `degas_token`
- Store user info in localStorage as `degas_user`

### Token Expiry
- Tokens are JWT-based and expire after a set time
- User will need to login again when token expires
- No refresh token for core_users authentication

---

## Security Best Practices

1. **HTTPS in Production**: Always use HTTPS in production
2. **Token Expiry**: Tokens expire after a set time (check JWT_SECRET config)
3. **Secure Storage**: Consider using httpOnly cookies instead of localStorage in production
4. **Role Checking**: Always verify user role on both frontend and backend
5. **Logout**: Clear all tokens and admin data on logout

---

## Troubleshooting

### Login fails with "Invalid email or password"
- Make sure you're using `email`, not `username`
- Check that email is "admin@degas.com"
- Verify password is "admin123"
- Ensure you're using `/api/core-auth/login` endpoint

### Admin not found
- Run: `node create-super-admin.js` in backend folder
- This will create or update the super admin in core_users

### Token not working
- Check token is stored in localStorage
- Verify Authorization header format: `Bearer <token>`
- Check token hasn't expired

### Wrong port
- Backend is on port 3001
- Update frontend API base URL
- Check backend logs for actual port

---

## Summary

✅ Super admin exists in core_users table
✅ Credentials: admin@degas.com / admin123
✅ Login endpoint: POST /api/core-auth/login
✅ Backend running on port 3001
✅ Role: super_admin
✅ Has access to ALL dashboard modules (no breaking)

Ready to implement admin dashboard!
