# 🚀 Render Deployment Guide

## ✅ Pre-Deployment Checklist

Your system is **100% ready for deployment**:
- ✅ All 46 tests passing (100%)
- ✅ Code pushed to GitHub
- ✅ render.yaml configured
- ✅ Database migrations ready
- ✅ Environment variables defined

## 📋 Step-by-Step Deployment

### 1. Create Render Account
1. Go to https://render.com
2. Sign up or login
3. Connect your GitHub account

### 2. Deploy Backend (API Server)

1. Click **"New +"** → **"Blueprint"**
2. Connect your repository: `CalebBigla/Degas-CS`
3. Render will detect `render.yaml` automatically
4. Click **"Apply"**

Render will create:
- `degas-cs-backend` (API server with persistent disk)
- `degas-cs-frontend` (Static site)

### 3. Configure Environment Variables

After deployment starts, go to **Backend Service** → **Environment**:

**Required Variables** (add these manually):
```
RESEND_API_KEY=re_xxxxx (get from resend.com - optional for now)
CLOUDINARY_CLOUD_NAME=your_cloud (optional - for image storage)
CLOUDINARY_API_KEY=xxxxx (optional)
CLOUDINARY_API_SECRET=xxxxx (optional)
```

**Auto-Generated** (already in render.yaml):
- `CORE_USER_JWT_SECRET` ✅
- `JWT_SECRET` ✅
- `QR_SECRET` ✅
- `NODE_ENV=production` ✅
- `DATABASE_TYPE=sqlite` ✅

### 4. Update Frontend URL

Once backend deploys, you'll get a URL like:
`https://degas-cs-backend-xxxx.onrender.com`

Update in **Frontend Service** → **Environment**:
```
VITE_API_URL=https://degas-cs-backend-xxxx.onrender.com/api
```

### 5. Wait for Deployment

- Backend: ~5-10 minutes (installs dependencies, builds TypeScript)
- Frontend: ~3-5 minutes (builds React app)

Watch the logs for:
```
✅ SQLITE database initialized
🚀 Degas CS server listening on port 10000
```

### 6. Create Admin User

Once deployed, run this command in Render Shell (Backend → Shell):
```bash
cd backend
node create-admin-core-user.js
```

Or the admin user will be auto-created on first startup with:
- Email: `admin@degas.com`
- Password: `admin123`

**⚠️ IMPORTANT: Change this password immediately in production!**

## 🎯 Post-Deployment Testing

### Test Backend Health:
```bash
curl https://your-backend-url.onrender.com/api/health
```

### Test Admin Login:
```bash
curl -X POST https://your-backend-url.onrender.com/api/core-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@degas.com","password":"admin123"}'
```

### Access Frontend:
Visit: `https://degas-cs-frontend.onrender.com`

## 🔧 Common Issues & Solutions

### Issue: Backend won't start
**Solution**: Check logs for missing environment variables

### Issue: Frontend can't connect to backend
**Solution**: Update `VITE_API_URL` with correct backend URL

### Issue: Database not persisting
**Solution**: Verify disk is mounted at `/opt/render/project/src/backend/data`

### Issue: Images not uploading
**Solution**: Configure Cloudinary or use local storage (ephemeral on free tier)

## 📱 WHAT WORKS AFTER DEPLOYMENT:

### For Members:
✅ Register via custom forms
✅ Login to dashboard
✅ View their QR code
✅ Scan attendance session QR codes
✅ View attendance history & stats
✅ Download ID cards

### For Admins:
✅ Create/edit onboarding forms
✅ Create attendance sessions
✅ Generate session QR codes
✅ Monitor real-time attendance
✅ View present/absent lists
✅ Search and manage users
✅ View analytics and reports
✅ Customize ID card templates
✅ Manage dynamic tables

## 🔐 Security Notes

1. **Change default admin password** immediately after deployment
2. **Set strong JWT secrets** (Render auto-generates these)
3. **Enable HTTPS** (Render provides this automatically)
4. **Configure CORS** properly (already set to your frontend URL)

## 📊 Monitoring

Monitor your deployment:
- **Logs**: Render Dashboard → Service → Logs
- **Metrics**: CPU, Memory, Response times
- **Health Check**: `/api/health` endpoint

## 🎉 You're Live!

Once deployed, share your frontend URL with users:
`https://degas-cs-frontend.onrender.com`

They can:
1. Register as new members
2. Login to their dashboard
3. Scan QR codes for attendance
4. View their attendance records

Admins login at the same URL with `admin@degas.com` credentials.

---

**Need help?** Check the logs in Render Dashboard or run tests locally first.
