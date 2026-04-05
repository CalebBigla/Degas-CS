# Viewing Logs on Render - Complete Guide

**Problem**: "I can't view the logs on Render"  
**Solution**: Here's how to access and troubleshoot log visibility

---

## Method 1: Render Dashboard (Web UI)

### Step 1: Navigate to Service Logs
1. Go to https://dashboard.render.com/
2. Select your service (e.g., "degas-backend")
3. Click the **"Logs"** tab (top of page)

### Step 2: View Live Logs
- Logs appear in real-time as your service runs
- Most recent messages at the bottom
- Scroll up to see older messages

### Step 3: Search Logs
- Use browser Ctrl+F to search
- Look for:
  - "error" / "ERROR" - Problem indicators
  - "✅" / "❌" - Application status markers
  - "[DB]" - Database messages
  - Your custom log prefixes

### Common Log Locations in Render:
```
✅ Server started successfully
❌ Error connecting to database
🔍 Starting form tables fetch
📊 Database type: sqlite
🚀 Backend initialized
```

---

## Method 2: Render CLI (Command Line)

### Prerequisites
```bash
# Install Render CLI (if not already installed)
npm install -g @render-com/render-cli

# Or use with npx
npx @render-com/render-cli logs --help
```

### View Live Logs
```bash
# View recent logs
render logs --service=degas-backend

# Follow logs in real-time (like tail -f)
render logs --service=degas-backend --follow

# View last 100 lines
render logs --service=degas-backend --lines=100

# View logs with timestamps
render logs --service=degas-backend --timestamps
```

### Find Your Service ID
```bash
# List all services
render services

# Get specific service info
render services --id=<service-id>
```

---

## Method 3: Backend Logging Configuration

### Ensure Logs Are Output to Console

**File**: `backend/src/config/logger.ts`

Make sure your logger outputs to `console` (stdout):

```typescript
// Good - outputs to console/stdout (Render captures this)
console.log('Application message');
logger.info('Application message');
process.stdout.write('Direct stdout message');

// Bad - only writes to file (Render doesn't capture)
fs.writeFileSync('app.log', 'message');
```

### Check Log Level Setting

**In `.env.production`**:
```env
# Must be set for logs to appear
LOG_LEVEL=info    # Shows info, warn, error
LOG_LEVEL=debug   # Shows debug, info, warn, error (verbose)
LOG_LEVEL=error   # Only shows errors (minimal)
```

**Lower log level = more messages**

---

## Method 4: Troubleshooting Log Visibility

### Issue: No logs appear in Render dashboard

**Check 1: Service is actually running**
```bash
# In Render dashboard:
# Services → degas-backend → Status should be "Live"
# If "Crashed" or "Building", service didn't start

# In CLI:
render services --id=degas-backend
```

**Check 2: Logs weren't output yet**
- New deployments take 30-60 seconds to start
- Wait a moment and refresh the Logs tab

**Check 3: Logger isn't outputting to stdout**
- Add this test log and redeploy:
  ```bash
  console.log('🔍 TEST LOG - If you see this, logging works!');
  ```
- Check if it appears in Render logs

**Check 4: Environment variables aren't set**
```bash
# In Render dashboard:
# Services → degas-backend → Environment
# Verify LOG_LEVEL=info exists
```

### Issue: Lots of logs but application isn't working

**Check the error pattern**:
```
❌ Error message: ECONNREFUSED
   → Database connection failed. Check DATABASE_URL

❌ Error message: SYNTAX_ERROR
   → SQL query has error. Check query format

❌ Error message: INSUFFICIENT_PRIVILEGE
   → Database user doesn't have permissions

🔥 [getFormTables] BACKEND ERROR: ...
   → API endpoint encountered error. Check details
```

---

## Real-Time Log Monitoring

### Via Render Dashboard
```
1. Go to https://dashboard.render.com/
2. Click your service
3. Click "Logs" tab
4. Page auto-refreshes every 5 seconds
```

### Via Command Line (Real-Time Streaming)
```bash
# Watch logs update in real-time
render logs --service=degas-backend --follow

# Press Ctrl+C to stop watching
```

### Tips:
- Open two terminals:
  - One for logs: `render logs --service=degas-backend --follow`
  - One for commands: `curl http://api.example.com/test`
- Watch how logs appear in response to requests

---

## Example: Debugging a Database Connection Issue

### What You'd See in Logs

**With good logs:**
```
✅ Connecting to database...
📊 Database type: postgresql
🔐 Creating PostgreSQL pool with SSL configuration
✅ PostgreSQL pool created and configured
🎉 PRODUCTION-SAFE MODE
📋 All routes registered
✅ Server started successfully on port 3001
```

**With connection error:**
```
❌ PostgreSQL pool error: connect ECONNREFUSED
   code: ECONNREFUSED
   message: Connection refused

🔥 [getTables] Database query error:
   message: connect ECONNREFUSED
   code: ECONNREFUSED
   dbType: postgresql

❌ Failed to get tables
   Status: 500
```

### How to Fix
1. Note the error details from logs
2. Check DATABASE_URL environment variable
3. Verify PostgreSQL server is running
4. Update environment variable and redeploy

---

## Searching Logs Effectively

### Find Database Errors
```
Search: "database"
Shows: All database-related messages
```

### Find API Errors
```
Search: "🔥"  or "❌"
Shows: All error-level messages
```

### Find Specific Endpoint
```
Search: "getFormTables"  or  "/api/admin/forms-tables"
Shows: All logs related to that endpoint
```

### Find PostgreSQL Issues
```
Search: "postgresql"  or  "pg:"
Shows: All PostgreSQL-related logs
```

---

## Log Export & Analysis

### Export logs from Render CLI
```bash
# Save logs to file
render logs --service=degas-backend > backend-logs.txt

# Export with specific date range
# (requires Render subscription)
render logs --service=degas-backend --from="2026-04-01"
```

### View full log with more context
```bash
# Get last 200 lines and save
render logs --service=degas-backend --lines=200 > logs.txt

# Then search locally
grep "error" logs.txt
grep "database" logs.txt
```

---

## Common Log Messages Explained

| Log | Meaning | Action |
|-----|---------|--------|
| `✅ Server started successfully` | Backend is running | OK - system working |
| `❌ Error opening database` | Database connection failed | Check DATABASE_URL/DATABASE_TYPE |
| `📊 Database type: sqlite` | Using SQLite | Check if should be postgresql |
| `🔍 Starting form tables fetch` | API endpoint called | Normal operation |
| `✅ Fetched N forms` | Data retrieved successfully | OK - query worked |
| `🔥 BACKEND ERROR: ...` | API error occurred | Check error details |
| `🗑️ Cleaning existing data` | Database seeding in progress | Normal for testing |
| `✅ Seeding completed` | Test data loaded | DB ready for testing |

---

## Advanced: Custom Log Filtering

### Create a log filter script (PowerShell)
```powershell
# View only errors in Render logs
render logs --service=degas-backend --follow | Select-String "ERROR|error|❌|🔥"

# View database logs only
render logs --service=degas-backend --follow | Select-String "database|DB|sql|SQL"

# View last error context (10 lines before/after)
render logs --service=degas-backend --lines=500 | Select-String -Context 5 "ERROR"
```

### Create a log filter script (Bash/Linux)
```bash
# View only errors
render logs --service=degas-backend --follow | grep -E "ERROR|error|❌|🔥"

# View database logs only
render logs --service=degas-backend --follow | grep -iE "database|db|sql"

# View with timestamp
render logs --service=degas-backend --follow | grep -v "DEBUG"
```

---

## Still Can't See Logs?

### Nuclear Option: Restart Service
```bash
# Restart via Render dashboard:
# Services → degas-backend → More Options → Restart

# Or via CLI:
render services --id=<service-id> --restart
```

### Check Service Status
```bash
# Via Render dashboard:
# Services → Select service → Status indicator (should be "Live")

# Via CLI:
render services | grep degas-backend
```

### Contact Render Support
If logs are completely unavailable:
1. Check https://status.render.com for outages
2. Contact support@render.com with:
   - Service ID
   - Screenshot of dashboard
   - Description of issue

---

## Quick Verification Checklist

After deployment, verify logging is working:

- [ ] Go to Render Dashboard → Logs tab
- [ ] See `✅ Server started successfully` message
- [ ] See port number (usually 3001 or 3000)
- [ ] See database type (sqlite or postgresql)
- [ ] No `❌` error messages in startup logs
- [ ] Make a test API call and see logs update
- [ ] Use Ctrl+F to search for "error" or "❌"
- [ ] If you see errors, check error details

**If all checks pass: Logging is working correctly!**

---

## Summary

### To View Logs:
1. **Fastest**: Render Dashboard → Logs tab
2. **Best for automation**: `render logs --service=degas-backend --follow`
3. **For debugging**: Search for error keywords in either method

### To Enable Logs:
1. Ensure `LOG_LEVEL=info` in `.env.production`
2. Ensure logger outputs to console/stdout
3. Application must be running (status = "Live")

### To Troubleshoot:
1. Check service status is "Live"
2. Verify LOG_LEVEL environment variable
3. Look for error messages with 🔥 or ❌ prefix
4. Search for specific keywords (database, error, etc.)

**Logs should now be visible in Render dashboard!**
