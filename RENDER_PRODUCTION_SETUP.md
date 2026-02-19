# Render Production Setup Guide

## Current Issues
1. ❌ ID Card generation failing (file system access)
2. ❌ Access Logs failing to fetch
3. ❌ Analytics failing to fetch
4. ❌ Frontend not connecting to backend properly

## Root Causes
- Backend CORS not allowing Render frontend domain
- Frontend `.env` pointing to localhost instead of production backend
- Database configuration may need PostgreSQL (Neon) instead of SQLite
- File uploads/temp storage on ephemeral Render filesystem

---

## Backend Configuration (Render)

### Environment Variables Required

```bash
# Database - Use Neon PostgreSQL
DATABASE_TYPE=postgresql
DATABASE_URL=<your-neon-connection-string>

# JWT & Security
JWT_SECRET=<your-secure-jwt-secret>
QR_SECRET=<your-secure-qr-secret>

# Server
PORT=3001
NODE_ENV=production

# File Upload (Render has ephemeral storage)
UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=10485760

# CORS - Your Frontend URL
FRONTEND_URL=<your-render-frontend-url>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Mock Mode (MUST be false in production)
DEV_MOCK=false
```

### Backend Build Settings
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node dist/server.js`

---

## Frontend Configuration (Render)

### Environment Variables Required

```bash
# Point to your Render backend
VITE_API_URL=https://degas-cs-backend-brmk.onrender.com/api
```

### Frontend Build Settings
- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

---

## Neon Database Setup

1. **Get Neon Connection String**
   - Go to your Neon dashboard
   - Copy the connection string (format: `postgresql://user:password@host/database?sslmode=require`)

2. **Add to Backend Environment Variables**
   ```bash
   DATABASE_TYPE=postgresql
   DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/degas_cs?sslmode=require
   ```

3. **Database will auto-initialize** on first backend startup

---

## File Storage Issue (ID Cards)

Render uses ephemeral storage - files are deleted on restart. Solutions:

### Option 1: Use Cloudinary (Recommended)
```bash
# Add to backend .env
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

### Option 2: Use AWS S3
```bash
# Add to backend .env
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_REGION=us-east-1
AWS_S3_BUCKET=degas-cs-uploads
```

### Option 3: Temporary Fix (Not Recommended)
Use `/tmp` directory for temporary storage:
```bash
UPLOAD_DIR=/tmp/uploads
```
**Warning**: Files will be deleted on dyno restart

---

## Deployment Steps

### 1. Update Backend on Render

1. Go to Render Dashboard → Backend Service
2. Add/Update Environment Variables:
   ```
   DATABASE_TYPE=postgresql
   DATABASE_URL=<neon-connection-string>
   FRONTEND_URL=<your-frontend-url>
   UPLOAD_DIR=/tmp/uploads
   ```
3. Trigger Manual Deploy or push to GitHub

### 2. Update Frontend on Render

1. Go to Render Dashboard → Frontend Static Site
2. Add/Update Environment Variable:
   ```
   VITE_API_URL=https://degas-cs-backend-brmk.onrender.com/api
   ```
3. Trigger Manual Deploy

### 3. Test the System

1. **Health Check**: Visit `https://degas-cs-backend-brmk.onrender.com/api/health`
   - Should return `{"success": true, "ready": true}`

2. **Login**: Try logging in with admin credentials

3. **Dashboard**: Check if numbers show up

4. **Access Logs**: Verify data loads

5. **ID Card Generation**: Test creating a user and generating ID card

---

## Troubleshooting

### Backend Not Ready
- Check Render logs for database connection errors
- Verify Neon connection string is correct
- Ensure `DATABASE_TYPE=postgresql`

### CORS Errors
- Verify `FRONTEND_URL` matches your frontend URL exactly
- Check backend logs for "CORS blocked origin" messages

### Access Logs/Analytics Failing
- Check browser console for API errors
- Verify backend health endpoint returns `ready: true`
- Check if database has data

### ID Cards Not Generating
- Check backend logs for file system errors
- Verify `UPLOAD_DIR=/tmp/uploads` is set
- Consider implementing Cloudinary/S3 for persistent storage

---

## Quick Fix Commands

### Check Backend Health
```bash
curl https://degas-cs-backend-brmk.onrender.com/api/health
```

### Check Database Connection
```bash
# In Render Shell
node -e "require('./dist/config/database').testDatabaseConnection()"
```

### View Backend Logs
```bash
# In Render Dashboard → Backend Service → Logs
```

---

## Next Steps After Deployment

1. ✅ Verify backend health endpoint
2. ✅ Test login functionality
3. ✅ Check dashboard metrics
4. ✅ Test Access Logs page
5. ✅ Test Analytics page
6. ✅ Test ID card generation
7. ✅ Test QR scanner
8. ✅ Implement persistent file storage (Cloudinary/S3)

---

## Important Notes

- **Ephemeral Storage**: Render's free tier has ephemeral storage. Files uploaded will be deleted on restart.
- **Cold Starts**: Free tier services spin down after inactivity. First request may be slow.
- **Database**: Use Neon PostgreSQL for persistent data storage.
- **CORS**: Backend now allows all `.onrender.com` domains automatically.
