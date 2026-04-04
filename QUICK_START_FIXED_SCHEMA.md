# Quick Start - Fixed User Schema

## 🚀 Start Backend

```bash
cd Degas-CS-main/backend
npm run dev
```

## 📋 API Endpoints

### Create Form
```bash
POST /api/fixed-forms
Body: { "name": "Form Name" }
```

### Register User
```bash
POST /api/auth/register/:formId
Body: {
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "address": "123 Main St",
  "password": "password123"
}
```

### Login
```bash
POST /api/auth/login
Body: {
  "email": "john@example.com",
  "password": "password123"
}
```

### Get Users
```bash
GET /api/users/:formId
```

### Scan User
```bash
POST /api/scan
Body: {
  "userId": "uuid",
  "formId": "uuid"
}
```

### Get Analytics
```bash
GET /api/analytics/:formId
```

## 🎨 Frontend - Fixed Columns

```tsx
// Registration Form
<input name="name" required />
<input name="phone" required />
<input name="email" type="email" required />
<input name="address" required />
<input name="password" type="password" required />

// User Table
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
      <tr>
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

## ✅ Status

- ✅ Backend implemented
- ✅ Database cleaned
- ✅ Tests passing
- ⏳ Backend restart needed
- ⏳ Frontend update needed

## 📚 Full Documentation

See `FIXED_SCHEMA_IMPLEMENTATION.md` for complete API docs and examples.
