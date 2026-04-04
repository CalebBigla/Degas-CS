# 🔄 Trigger Render Redeploy

The setup endpoint isn't available yet because Render hasn't redeployed with the new code.

## Option 1: Manual Redeploy (Fastest)

1. Go to: https://dashboard.render.com
2. Click on **degas-cs-backend-brmk** service
3. Click **Manual Deploy** button (top right)
4. Select **Deploy latest commit**
5. Wait 2-3 minutes for deployment to complete

Once deployed, the setup endpoint will be available at:
```
https://degas-cs-backend-brmk.onrender.com/api/setup/initialize
```

## Option 2: Use Neon SQL Editor (Works Now)

While waiting for redeploy, you can set up the database directly:

1. Go to: https://console.neon.tech
2. Open **SQL Editor**
3. Copy the SQL script from `NEON_SQL_SETUP.md`
4. Run it
5. Try logging in

## Option 3: Wait for Auto-Deploy

Render should auto-deploy within 5-10 minutes of the GitHub push. Check the deployment status in Render Dashboard.

## How to Check if Redeploy is Complete

Visit this URL:
```
https://degas-cs-backend-brmk.onrender.com/api/health
```

If you see `"ready": true`, the backend is deployed and ready.

Then try the setup endpoint:
```
https://degas-cs-backend-brmk.onrender.com/api/setup/initialize
```

## Recommended: Do Both

1. **Now**: Run the SQL script in Neon (takes 1 minute)
2. **Then**: Trigger manual redeploy for future use

This way you can login immediately while the new code deploys.
