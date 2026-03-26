# User Onboarding API Guide

Complete guide for implementing user registration with the dynamic form system.

## 🎯 Overview

The onboarding system allows users to self-register using dynamically configured forms. The system:
- Validates input against form definitions
- Creates authenticated user accounts
- Links users to dynamic tables
- Generates QR codes for attendance
- Supports image uploads

## 📋 Prerequisites

1. Admin must create an active onboarding form via `/api/admin/forms`
2. Form must have at least one email field and one password field
3. Form must target a valid table (Staff, Students, Visitors, Contractors)

## 🔌 API Endpoints

### 1. Get Active Onboarding Form

**Endpoint**: `GET /api/onboarding/form`  
**Authentication**: None (public)  
**Description**: Retrieve the currently active onboarding form

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "form-id",
    "form_name": "Student Registration",
    "target_table": "Students",
    "description": "Registration form for new students",
    "is_active": true,
    "fields": [
      {
        "id": "field-id",
        "field_name": "email",
        "field_label": "Email Address",
        "field_type": "email",
        "is_required": true,
        "is_email_field": true,
        "is_password_field": false,
        "field_order": 1,
        "placeholder": "student@example.com",
        "validation_rules": null
      },
      {
        "id": "field-id",
        "field_name": "password",
        "field_label": "Password",
        "field_type": "password",
        "is_required": true,
        "is_email_field": false,
        "is_password_field": true,
        "field_order": 2,
        "placeholder": "Enter a secure password",
        "validation_rules": "{\"minLength\":8}"
      },
      {
        "id": "field-id",
        "field_name": "fullName",
        "field_label": "Full Name",
        "field_type": "text",
        "is_required": true,
        "is_email_field": false,
        "is_password_field": false,
        "field_order": 3,
        "placeholder": "John Doe"
      }
      // ... more fields
    ]
  }
}
```

### 2. Register New User

**Endpoint**: `POST /api/onboarding/register`  
**Authentication**: None (public)  
**Content-Type**: `application/json` OR `multipart/form-data`

#### Option A: JSON Registration (No Image)

**Request**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "studentId": "STU-12345",
  "phone": "+1234567890",
  "grade": "10th Grade"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "coreUserId": "core-user-id",
    "email": "student@example.com",
    "userId": "uuid-of-user",
    "table": "Students",
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "qrToken": "signed-jwt-token"
  }
}
```

#### Option B: JSON with Base64 Image

**Request**:
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "studentId": "STU-12345",
  "photo": "data:image/png;base64,iVBORw0KGgoAAAANS..."
}
```

#### Option C: Multipart Form Data (File Upload)

**Request** (FormData):
```
email: student@example.com
password: SecurePass123!
fullName: John Doe
studentId: STU-12345
photo: [File object]
```

**JavaScript Example**:
```javascript
const formData = new FormData();
formData.append('email', 'student@example.com');
formData.append('password', 'SecurePass123!');
formData.append('fullName', 'John Doe');
formData.append('studentId', 'STU-12345');
formData.append('photo', fileInput.files[0]);

const response = await fetch('/api/onboarding/register', {
  method: 'POST',
  body: formData
});
```

## 🎨 Frontend Implementation

### Step 1: Fetch Form Definition

```typescript
async function getOnboardingForm() {
  const response = await fetch('/api/onboarding/form');
  const { data } = await response.json();
  return data;
}
```

### Step 2: Render Dynamic Form

```typescript
function renderForm(formDefinition) {
  const form = document.createElement('form');
  
  // Sort fields by field_order
  const sortedFields = formDefinition.fields.sort(
    (a, b) => a.field_order - b.field_order
  );
  
  sortedFields.forEach(field => {
    const input = createInput(field);
    form.appendChild(input);
  });
  
  return form;
}

function createInput(field) {
  const container = document.createElement('div');
  
  // Label
  const label = document.createElement('label');
  label.textContent = field.field_label;
  if (field.is_required) {
    label.textContent += ' *';
  }
  
  // Input
  let input;
  if (field.field_type === 'textarea') {
    input = document.createElement('textarea');
  } else if (field.field_type === 'select') {
    input = document.createElement('select');
    const options = JSON.parse(field.options || '[]');
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      input.appendChild(option);
    });
  } else {
    input = document.createElement('input');
    input.type = field.field_type;
  }
  
  input.name = field.field_name;
  input.placeholder = field.placeholder || '';
  input.required = field.is_required;
  
  // Validation rules
  if (field.validation_rules) {
    const rules = JSON.parse(field.validation_rules);
    if (rules.minLength) input.minLength = rules.minLength;
    if (rules.maxLength) input.maxLength = rules.maxLength;
    if (rules.pattern) input.pattern = rules.pattern;
  }
  
  container.appendChild(label);
  container.appendChild(input);
  
  return container;
}
```

### Step 3: Handle Form Submission

```typescript
async function handleSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  
  // Option 1: Submit as JSON
  const data = Object.fromEntries(formData.entries());
  const response = await fetch('/api/onboarding/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  // Option 2: Submit as FormData (if file upload)
  // const response = await fetch('/api/onboarding/register', {
  //   method: 'POST',
  //   body: formData
  // });
  
  const result = await response.json();
  
  if (result.success) {
    // Show success message
    alert('Registration successful!');
    
    // Display QR code
    displayQRCode(result.data.qrCode);
    
    // Optionally redirect to login
    window.location.href = '/login';
  } else {
    // Show error message
    alert(result.message);
    if (result.errors) {
      result.errors.forEach(error => console.error(error));
    }
  }
}
```

### Step 4: Handle Camera Capture

```typescript
async function capturePhoto() {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  
  // Get camera stream
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: true 
  });
  
  video.srcObject = stream;
  await video.play();
  
  // Capture frame
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  
  // Convert to base64
  const base64Image = canvas.toDataURL('image/png');
  
  // Stop camera
  stream.getTracks().forEach(track => track.stop());
  
  return base64Image;
}

// Usage in form
async function handleCameraCapture() {
  const base64Image = await capturePhoto();
  
  // Add to form data
  const photoInput = document.querySelector('input[name="photo"]');
  photoInput.value = base64Image;
}
```

## 🔒 Validation

### Client-Side Validation

```typescript
function validateForm(formData, formDefinition) {
  const errors = [];
  
  formDefinition.fields.forEach(field => {
    const value = formData[field.field_name];
    
    // Required check
    if (field.is_required && !value) {
      errors.push(`${field.field_label} is required`);
      return;
    }
    
    if (!value) return;
    
    // Type validation
    if (field.field_type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errors.push(`${field.field_label} must be a valid email`);
      }
    }
    
    // Custom validation rules
    if (field.validation_rules) {
      const rules = JSON.parse(field.validation_rules);
      
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(
          `${field.field_label} must be at least ${rules.minLength} characters`
        );
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(
          `${field.field_label} must be at most ${rules.maxLength} characters`
        );
      }
      
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        errors.push(`${field.field_label} format is invalid`);
      }
    }
  });
  
  return errors;
}
```

### Server-Side Validation

The server automatically validates:
- Required fields
- Field types (email, number, tel)
- Custom validation rules
- Email uniqueness
- Password strength (if rules defined)

## 🎫 QR Code Display

```typescript
function displayQRCode(qrCodeData) {
  const img = document.createElement('img');
  img.src = qrCodeData; // Base64 data URL
  img.alt = 'Your QR Code';
  
  // Add download button
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download QR Code';
  downloadBtn.onclick = () => {
    const link = document.createElement('a');
    link.href = qrCodeData;
    link.download = 'my-qr-code.png';
    link.click();
  };
  
  document.body.appendChild(img);
  document.body.appendChild(downloadBtn);
}
```

## ⚠️ Error Handling

### Common Errors

**400 Bad Request** - Validation failed
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Full Name is required",
    "Password must be at least 8 characters"
  ]
}
```

**404 Not Found** - No active form
```json
{
  "success": false,
  "message": "No active onboarding form available"
}
```

**409 Conflict** - Email already exists
```json
{
  "success": false,
  "message": "Email already registered"
}
```

**500 Internal Server Error** - Server error
```json
{
  "success": false,
  "message": "Registration failed",
  "error": "Error details (dev mode only)"
}
```

## 🧪 Testing

### Manual Testing

1. Create a form via admin panel
2. Visit onboarding page
3. Fill out form
4. Submit registration
5. Verify QR code is displayed
6. Try logging in with credentials

### Automated Testing

```bash
cd backend
node test-phase4-5.js
```

## 📱 Mobile Considerations

### Camera Access
```javascript
// Check if camera is available
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  // Camera available
} else {
  // Fallback to file upload
}
```

### Responsive Form
```css
.onboarding-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.form-field {
  margin-bottom: 15px;
}

input, textarea, select {
  width: 100%;
  padding: 10px;
  font-size: 16px; /* Prevents zoom on iOS */
}
```

## 🔗 Related Endpoints

After registration, users can:
- Login: `POST /api/core-auth/login`
- Get profile: `GET /api/core-auth/me`
- View dashboard: `GET /api/user/dashboard` (Phase 9)

---

**Last Updated**: Phase 4 & 5 Complete  
**Status**: ✅ Production Ready
