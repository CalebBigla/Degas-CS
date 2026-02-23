# Scanner JSON Parse Error - Fix Instructions

## Problem
The scanner is throwing "Failed to execute 'json' on 'Response': Unexpected end of JSON input" because the frontend is trying to connect to `http://localhost:3001/api` instead of the production backend.

## Root Cause
The `frontend/.env` file has `VITE_API_URL=http://localhost:3001/api` but this file is gitignored and not deployed to Render.

## Solution
Set the environment variable in Render for the frontend static site.

### Steps to Fix:

1. **Go to Render Dashboard**
   - Navigate to your frontend static site (degas-cs-frontend or similar)

2. **Add Environment Variable**
   - Go to "Environment" tab
   - Click "Add Environment Variable"
   - Add:
     ```
     Key: VITE_API_URL
     Value: https://degas-cs-backend-brmk.onrender.com/api
     ```

3. **Redeploy Frontend**
   - After saving the environment variable, Render should auto-redeploy
   - If not, click "Manual Deploy" → "Clear build cache & deploy"

4. **Verify the Fix**
   - Once deployed, open the scanner page
   - Open browser console (F12)
   - Try scanning a QR code
   - You should see the API request going to `https://degas-cs-backend-brmk.onrender.com/api/scanner/verify`
   - The JSON parse error should be gone

## Why This Happened
- Vite (the frontend build tool) only includes environment variables that are present at BUILD TIME
- Since `.env` files are gitignored, they don't get deployed to Render
- Render needs the environment variables set in its dashboard to inject them during the build process

## Verification
After the fix, the scanner should:
1. Successfully send requests to the production backend
2. Receive proper JSON responses
3. Display scan results correctly
4. No more "Unexpected end of JSON input" errors

## Additional Notes
- The backend is working correctly (all endpoints return proper JSON)
- The issue was purely a frontend configuration problem
- This same pattern applies to any other environment variables needed in production
