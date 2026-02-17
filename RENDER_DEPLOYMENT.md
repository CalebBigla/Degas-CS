# 🚀 Deploy to Render - Quick Guide

Deploying to Render will give you:
- ✅ Automatic HTTPS (camera will work!)
- ✅ Access from anywhere (not just local network)
- ✅ Free hosting for testing
- ✅ Automatic deployments from Git

## Prerequisites

1. GitHub account
2. Render account (free) - https://render.com
3. Git installed on your PC

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

```cmd
cd C:\Users\HP ELITEBOOK 840-G3\OneDrive\Desktop\creative

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Degas CS"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/degas-cs.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Deploy Backend

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `degas-cs-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Environment**: `Node`
   - **Build Command**: 
     ```
     npm install && cd shared && npm install && npm run build && cd ../backend && npm install && npm run build
     ```
   - **Start Command**: 
     ```
     cd backend && npm start
     ```
   - **Plan**: Free

4. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `JWT_SECRET` = (click "Generate" - Render will create a secure random value)
   - `QR_SECRET` = (click "Generate")
   - `FRONTEND_URL` = `https://degas-cs-frontend.onrender.com` (we'll update this after frontend is deployed)

5. Click "Create Web Service"

6. Wait for initial deployment (5-10 minutes)

7. **Add Persistent Disk (IMPORTANT - Do this after service is created):**
   - Once the service is created, go to your service dashboard
   - Scroll down to find the "Disks" section (left sidebar or in settings)
   - Click "Add Disk" or "New Disk"
   - **Name**: `degas-data`
   - **Mount Path**: `/opt/render/project/src/backend/data`
   - **Size**: 1 GB (free tier)
   - Click "Save"
   - The service will redeploy automatically

8. Note your backend URL: `https://degas-cs-backend.onrender.com`

### Step 4: Deploy Frontend

1. Click "New +" → "Static Site"
2. Connect same GitHub repository
3. Configure:
   - **Name**: `degas-cs-frontend`
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: 
     ```
     npm install && cd shared && npm install && npm run build && cd ../frontend && npm install && npm run build
     ```
   - **Publish Directory**: `frontend/dist`

4. Add Environment Variable:
   - `VITE_API_URL` = `https://degas-cs-backend.onrender.com/api`
   (Use your actual backend URL from Step 3)

5. Click "Create Static Site"

6. Wait for deployment (5-10 minutes)

7. Your frontend URL: `https://degas-cs-frontend.onrender.com`

### Step 5: Update Backend CORS

1. Go back to backend service settings
2. Update `FRONTEND_URL` environment variable to your actual frontend URL
3. Click "Save Changes" (this will redeploy)

### Step 6: Create Admin Account

1. Go to your backend URL: `https://degas-cs-backend.onrender.com/api/health`
2. You should see: `{"success":true,"message":"Degas CS API is running"...}`
3. Use the seed script or create admin manually via database

## 🎉 Test the Scanner!

1. On your phone, go to: `https://degas-cs-frontend.onrender.com/scanner`
2. Click "Start Scanner"
3. Grant camera permissions
4. The camera should work perfectly! 📸

## Important Notes

### Free Tier Limitations

- Backend spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- 750 hours/month free (enough for testing)
- Upgrade to paid plan ($7/month) for always-on service

### Database Persistence

- SQLite database is stored on persistent disk
- Data survives redeployments
- Backup regularly (download from Render dashboard)

### Custom Domain (Optional)

1. Go to Settings → Custom Domain
2. Add your domain
3. Update DNS records as instructed
4. Render provides free SSL certificate

## Troubleshooting

### Build Fails

Check build logs for errors:
- Missing dependencies
- TypeScript errors
- Path issues

Common fixes:
```json
// Ensure package.json has correct scripts
"scripts": {
  "build": "tsc",
  "start": "node dist/server.js"
}
```

### Backend Not Responding

- Check logs in Render dashboard
- Verify environment variables are set
- Check health endpoint: `/api/health`

### Frontend Can't Connect to Backend

- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Ensure `FRONTEND_URL` matches actual frontend URL

### Database Issues

- Check disk is mounted correctly
- Verify path: `/opt/render/project/src/backend/data/degas.db`
- Check disk usage in dashboard

## Updating Your App

After making changes:

```cmd
git add .
git commit -m "Your update message"
git push
```

Render will automatically redeploy!

## Monitoring

- View logs in real-time from Render dashboard
- Set up email alerts for deployment failures
- Monitor disk usage

## Cost Optimization

Free tier includes:
- 750 hours/month per service
- 100 GB bandwidth
- 1 GB disk storage

For production:
- Upgrade to Starter plan ($7/month per service)
- Add more disk storage as needed
- Consider PostgreSQL for better performance

## Next Steps

1. ✅ Deploy and test
2. ✅ Create admin account
3. ✅ Import users
4. ✅ Test scanner with phone
5. ✅ Set up custom domain (optional)
6. ✅ Configure backups
7. ✅ Monitor usage

---

Need help? Check Render docs: https://render.com/docs
