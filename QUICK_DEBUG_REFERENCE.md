# Quick Debug Reference Guide

## Problem: Backend Shows "Not Ready"

### Symptom
```
GET /api/health → 503
Response: { "ready": false, "error": "..." }
```

### Debug Steps

1. **Check Logs for Error Message**
   ```
   Location: Render Dashboard → Backend Service → Logs
   Search for: "❌ Backend initialization failed"
   ```

2. **Identify Error Type**

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `DATABASE_URL is required for PostgreSQL` | DATABASE_TYPE=postgresql but no URL | Add DATABASE_URL to environment |
| `connect ECONNREFUSED` | Database not running | Check Neon dashboard (may be paused) |
| `Missing required table: tables` | Database doesn't have expected schema | Run database initialization |
| `EAGAIN: resource temporarily unavailable` | Too many connections | Check connection pool settings |
| `SYNTAX ERROR` | SQL query incompatible | Check query conversion in dbAdapter |

3. **Quick Fixes**
   ```bash
   # In Render Shell:
   
   # Check database URL
   echo $DATABASE_URL
   
   # Test connection
   psql $DATABASE_URL -c "SELECT version();"
   
   # Check tables exist
   psql $DATABASE_URL -c "\dt"
   ```

---

## Problem: ID Card Generation Fails

### Symptom
```
POST /api/tables/:id/users/:id/card/custom → 500
Response: {
  "success": false,
  "error": "Failed to generate custom ID card",
  "details": "[actual error message here]"
}
```

### Debug Steps

1. **Check Backend Logs for Full Error**
   ```
   Search for: "❌ Generate custom ID card error:"
   Look for: error message and stack trace
   ```

2. **Identify Error Type**

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot read property 'photo_url' of undefined` | User data invalid | Data in dynamic_users corrupted |
| `Failed to embed image` | Photo format issue | Use JPEG/PNG, not WebP |
| `Cloudinary upload failed` | Cloudinary credentials wrong | Verify CLOUDINARY_* env vars |
| `ENOENT: no such file or directory, open '/tmp/uploads'` | Temp directory missing | Permissions issue with /tmp |
| `QR code generation failed` | QR_SECRET not set | Add QR_SECRET to environment |

3. **Check Each Step in Logs**
   ```
   Should see in order:
   🔍 Fetching table details for ID card generation
   📋 Fetching users from table
   📊 Found X users for ID card generation
   🎨 Generating ID card for user
   🔲 Generating QR code
   📄 Generating PDF
   ✅ PDF generated successfully
   
   If stops midway, that's the failing step
   ```

4. **Verify User Data**
   ```bash
   # In Render Shell:
   
   psql $DATABASE_URL -c "
     SELECT id, data FROM dynamic_users 
     WHERE id = 'YOUR_USER_ID'
     LIMIT 1;
   "
   ```

---

## Problem: "Failed to fetch" - Access Logs

### Symptom
```
GET /api/analytics/access-logs → 500
Response: { "error": "Failed to fetch access logs", "details": "..." }
```

### Debug Steps

1. **Check Error Details**
   ```
   Browser Console (F12)
   Look for response.data.details
   Or check Render logs for: "❌ Get access logs error:"
   ```

2. **Common Errors**

| Error | Cause | Fix |
|-------|-------|-----|
| `column "access_granted" does not exist` | Table schema not created | Run database initialization |
| `syntax error at or near "$"` | PostgreSQL placeholder conversion failed | Check dbAdapter conversion |
| `invalid input syntax for type boolean` | Comparing with number instead of boolean | Check SQL query |
| `join condition missing` | Missing LEFT JOIN columns | Check database schema |

3. **Verify Database State**
   ```bash
   # In Render Shell:
   
   # Check access_logs table structure
   psql $DATABASE_URL -c "\d access_logs"
   
   # Check if has data
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM access_logs;"
   
   # Check join works
   psql $DATABASE_URL -c "
     SELECT COUNT(*) FROM access_logs al
     LEFT JOIN dynamic_users du ON al.user_id = du.id;
   "
   ```

---

## Problem: "Failed to fetch" - Analytics

### Symptom
```
GET /api/analytics/logs → 500
Response: { "error": "Failed to fetch analytics logs", "details": "..." }
```

### Debug Steps

1. **Check Query Type**
   ```
   Should see in logs which query failed:
   "GET analytics logs"
   Look for: totalScans, successfulScans, uniqueUsers, dailyStats, topUsers, recentLogs
   ```

2. **Analytics-Specific Errors**

| Error | Cause | Fix |
|-------|-------|-----|
| `syntax error in WITH clause` | Date interval format wrong | Check dateFilter calculation |
| `invalid input syntax for interval` | PostgreSQL interval format | Should be `'7 days'`, not `-7 days` |
| `column "scan_timestamp" must appear in GROUP BY` | PostgreSQL strict grouping | Add column to GROUP BY clause |
| `aggregate function calls not allowed in WHERE clause` | COUNT in WHERE | Move to HAVING clause |

3. **Test Each Query**
   ```bash
   # In Render Shell - test basic queries:
   
   # Check access_logs exist
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM access_logs;"
   
   # Test date filtering (SQLite format)
   psql $DATABASE_URL -c "
     SELECT COUNT(*) FROM access_logs 
     WHERE scan_timestamp >= NOW() - INTERVAL '7 days';
   "
   
   # Test grouping (PostgreSQL requires GROUP BY)
   psql $DATABASE_URL -c "
     SELECT DATE(scan_timestamp), COUNT(*) 
     FROM access_logs 
     WHERE scan_timestamp >= NOW() - INTERVAL '7 days'
     GROUP BY DATE(scan_timestamp);
   "
   ```

---

## Problem: CORS Error

### Symptom
```
Browser Console:
Access to XMLHttpRequest at 'https://backend.onrender.com/api/tables'
No 'Access-Control-Allow-Origin' header is present
```

### Debug Steps

1. **Check FRONTEND_URL Setting**
   ```bash
   # In Render backend environment:
   echo $FRONTEND_URL
   
   # Compare with:
   # Browser URL bar (exactly)
   # Example: https://abc123.onrender.com (no path, no trailing slash)
   ```

2. **Verify CORS Configuration**
   ```
   Check logs for: "CORS blocked origin: https://..."
   Compare blocked origin with FRONTEND_URL
   They must match exactly
   ```

3. **Common CORS Issues**

| Issue | Solution |
|-------|----------|
| FRONTEND_URL=`https://abc.onrender.com/` | Remove trailing slash |
| FRONTEND_URL=`http://abc.onrender.com` | Use HTTPS in production |
| Frontend origin in browser: `https://abc.onrender.com` | FRONTEND_URL must be exactly this |

4. **Quick Fix**
   ```
   Go to Render Dashboard → Backend Service → Environment
   
   Update FRONTEND_URL to match exactly:
   Browser URL - /path - ?query = FRONTEND_URL
   
   Example:
   Browser: https://app-frontend-abc.onrender.com/dashboard
   FRONTEND_URL: https://app-frontend-abc.onrender.com
   
   Then click "Save Changes" (triggers redeploy)
   ```

---

## Problem: Database Connection Timeout

### Symptom
```
Logs show:
"Error: connect ETIMEDOUT"
OR
"Error: connect ECONNREFUSED"
```

### Debug Steps

1. **Check Connection String Format**
   ```bash
   # Should be:
   postgresql://user:password@host:5432/dbname?sslmode=require
   
   # In Render Shell:
   echo $DATABASE_URL | head -c 50
   ```

2. **Verify Database is Running**
   ```bash
   # For Neon PostgreSQL:
   # Go to Neon Dashboard → Project → Check if "Paused"
   # If paused, click "Resume"
   ```

3. **Test Connection Directly**
   ```bash
   # In Render Shell:
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Should return:
   #  ?column?
   # ----------
   #        1
   ```

4. **Check Connection Pool**
   ```
   Logs should show:
   "✅ PostgreSQL pool created and configured"
   
   If missing, pool creation failed
   ```

---

## Problem: SQL Syntax Error

### Symptom
```
Logs show:
"syntax error at or near..."
OR
"column ... does not exist"
```

### Debug Steps

1. **Verify Query Conversion**
   ```
   SQLite query gets converted to PostgreSQL
   Check dbAdapter.ts convertSQLiteToPostgreSQL()
   ```

2. **Common Conversion Issues**

| SQLite | PostgreSQL | Issue |
|--------|-----------|-------|
| `?` placeholders | `$1, $2, $3` | Should be auto-converted |
| `datetime('now')` | `NOW()` | Should be auto-converted |
| `json_extract(col, '$.key')` | `(col->>'key')` | Should be auto-converted |
| `access_granted = 1` | `access_granted = true` | May not convert (depends on context) |

3. **Check Database Schema**
   ```bash
   # In Render Shell:
   psql $DATABASE_URL -c "\d tables"
   psql $DATABASE_URL -c "\d dynamic_users"
   psql $DATABASE_URL -c "\d access_logs"
   
   # Every table should exist
   ```

---

## Problem: High Memory/CPU Usage

### Symptom
```
Backend getting slower
Render service keeps restarting
Logs show: "Out of memory" or "Killed"
```

### Debug Steps

1. **Check Query Performance**
   ```bash
   # In Render Shell:
   
   # Slow query test
   psql $DATABASE_URL -c "EXPLAIN ANALYZE
     SELECT * FROM access_logs
     WHERE scan_timestamp >= NOW() - INTERVAL '1 day'
   ;"
   ```

2. **Monitor Connection Pool**
   ```
   Check logs for:
   "✅ PostgreSQL pool - new client connected"
   
   If too many, pool may be saturated
   ```

3. **Check Log File Size**
   ```bash
   # Clear logs if they're huge
   # (Winston logs shouldn't grow indefinitely)
   ```

---

## Interpretation of Healthy Logs

### Startup Sequence (First Deployment)
```
✅ Environment variables validated
✅ PostgreSQL database initialized
✅ Database connectivity verified
✅ Database schema verified
✅ All API routes registered
🎯 System ready to accept requests
```

### Request Handling
```
🔍 Fetching table details for ID card generation
📋 Fetching users from table
✅ Found 5 users for ID card generation
🎨 Generating ID card for user
🔲 Generating QR code
📄 Generating PDF
✅ PDF generated successfully
```

### Normal Errors (No Action Needed)
```
⚠️ Image processing failed, continuing without photo
⚠️ Cloudinary not configured - using local storage
⚠️ CORS blocked origin: https://localhost:3000
(These are handled gracefully)
```

### Critical Errors (Action Needed)
```
❌ Backend initialization failed
❌ PostgreSQL query error
❌ Failed to generate ID card
❌ Database connection failed
(These require debugging and fixes)
```

---

## Quick Checklist for Debugging

### When something fails:

- [ ] Check `/api/health` endpoint
  ```bash
  curl https://your-backend.onrender.com/api/health | jq .
  ```

- [ ] Read backend logs for error details
  - Render Dashboard → Logs
  - Search for `❌` symbols

- [ ] Check environment variables
  - Render Dashboard → Environment
  - Verify all required vars are set

- [ ] Test database connection
  ```bash
  # In Render Shell
  psql $DATABASE_URL -c "SELECT 1;"
  ```

- [ ] Check frontend console (F12)
  - Look for CORS errors
  - Check API URL is correct

- [ ] Look for error details in response
  ```
  Response includes "details" field with actual error
  ```

---

## Getting Help

### What to Include in Bug Report

1. **Error Message**
   - Full text from logs
   - Include full error details

2. **Reproduction Steps**
   - What you were doing when error occurred
   - Your user data (if relevant)

3. **Environment**
   - DATABASE_TYPE
   - NODE_ENV
   - FRONTEND_URL

4. **Logs**
   - Backend logs (search for error)
   - Frontend console errors (F12)
   - Last 50 lines of log output

5. **Database State**
   ```bash
   # Attach output of:
   psql $DATABASE_URL -c "\dt"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM dynamic_users;"
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM access_logs;"
   ```

---

## Emergency Rollback

If something is critically broken:

```bash
# Option 1: Revert code
git revert HEAD
git push origin main
# Render auto-deploys

# Option 2: In Render
# Dashboard → Backend Service → Deploy History
# Click previous working deploy → Redeploy
```

---

**Last Updated:** 2026-02-22  
**File:** Quick reference for common issues and solutions
