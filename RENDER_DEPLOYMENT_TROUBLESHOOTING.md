# Render Deployment Troubleshooting

## Error: "Could not resolve host: github.com"

### Error Details
```
fatal: unable to access 'https://github.com/CalebBigla/Degas-CS/': Could not resolve host: github.com
==> Unable to clone https://github.com/CalebBigla/Degas-CS
```

This error means Render cannot access your GitHub repository during deployment.

## Solutions

### Solution 1: Reconnect GitHub Repository (Recommended)

1. **Go to Render Dashboard**
   - Navigate to https://dashboard.render.com

2. **Select Your Service**
   - Click on your frontend service (degas-cs-frontend)

3. **Go to Settings**
   - Click "Settings" in the left sidebar

4. **Reconnect Repository**
   - Scroll to "Source Code" section
   - Click "Disconnect" if connected
   - Click "Connect Repository"
   - Authorize Render to access your GitHub account
   - Select the repository: `CalebBigla/Degas-CS`
   - Select branch: `main`

5. **Save Changes**
   - Click "Save Changes"

6. **Trigger Manual Deploy**
   - Go to "Manual Deploy" section
   - Click "Deploy latest commit"

### Solution 2: Check Repository Visibility

1. **Verify Repository is Public**
   - Go to https://github.com/CalebBigla/Degas-CS
   - Check if it shows "Public" badge
   - If private, either:
     - Make it public, OR
     - Ensure Render has proper OAuth access

2. **If Repository is Private**
   - Go to GitHub Settings → Applications → Authorized OAuth Apps
   - Find "Render"
   - Click "Grant" to give access to the repository
   - Revoke and re-authorize if needed

### Solution 3: Check Render GitHub Integration

1. **Go to Render Account Settings**
   - Click your profile icon → Account Settings
   - Click "GitHub" in the left sidebar

2. **Verify Connection**
   - Check if GitHub is connected
   - If not, click "Connect GitHub Account"
   - Authorize Render

3. **Check Repository Access**
   - Ensure Render has access to your repositories
   - You may need to grant access to specific organizations

### Solution 4: Wait and Retry (Temporary Issue)

Sometimes this is a temporary connectivity issue between Render and GitHub:

1. **Wait 5-10 minutes**
2. **Try manual deploy again**
3. **Check Render Status Page**: https://status.render.com

### Solution 5: Use render.yaml (Already Done ✓)

Your `render.yaml` is already configured correctly. Render should auto-detect it once the connection is restored.

## Verification Steps

After reconnecting:

1. **Check Service Settings**
   - Repository: `CalebBigla/Degas-CS`
   - Branch: `main`
   - Root Directory: (leave empty or set to root)

2. **Verify Build Settings**
   - Build Command: Should be auto-detected from render.yaml
   - Publish Directory: Should be auto-detected from render.yaml

3. **Trigger Deploy**
   - Manual deploy should now work
   - Auto-deploy on push should be enabled

## Common Mistakes to Avoid

❌ **Wrong repository URL format**
- Render uses: `CalebBigla/Degas-CS`
- Not: `https://github.com/CalebBigla/Degas-CS`

❌ **Wrong branch name**
- Use: `main`
- Not: `master` (unless that's your default branch)

❌ **Repository not accessible**
- Private repos need proper OAuth permissions
- Public repos should work immediately

## Expected Behavior After Fix

Once fixed, you should see:
```
==> Cloning from https://github.com/CalebBigla/Degas-CS
Cloning into '/opt/render/project/src'...
==> Checked out main
==> Using render.yaml for configuration
```

## Alternative: Manual Deploy via Render Dashboard

If GitHub connection continues to fail:

1. **Use Render's Git Integration**
   - Disconnect GitHub
   - Use Render's built-in Git hosting
   - Push directly to Render's Git URL

2. **Or Deploy via Docker** (Advanced)
   - Build Docker image locally
   - Push to Docker Hub
   - Deploy from Docker Hub on Render

## Need More Help?

1. **Check Render Logs**
   - Go to your service → Logs
   - Look for more detailed error messages

2. **Contact Render Support**
   - Dashboard → Help → Contact Support
   - Mention: "Cannot clone GitHub repository"

3. **Check GitHub Status**
   - https://www.githubstatus.com
   - Ensure GitHub is operational

## Quick Fix Checklist

- [ ] Repository is public or Render has OAuth access
- [ ] Render GitHub integration is connected
- [ ] Repository URL is correct in Render settings
- [ ] Branch name is correct (main)
- [ ] Waited 5-10 minutes for temporary issues to resolve
- [ ] Tried manual deploy after reconnecting
- [ ] Checked Render and GitHub status pages

## Current Configuration (Correct ✓)

Your `render.yaml` is properly configured:
```yaml
services:
  - type: web
    name: degas-cs-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

Once the GitHub connection is restored, this will work automatically.
