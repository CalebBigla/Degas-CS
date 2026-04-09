# ============================================================================
# SUPABASE MIGRATION - COMPLETE SETUP GUIDE
# ============================================================================

## 🚀 STEP 1: CREATE TABLES IN SUPABASE (5 MINUTES)

### Instructions:
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the **entire contents** of `SUPABASE_SETUP.sql`
5. Click "RUN" (top right button)
6. Wait for success message ✅

**Expected Result:** 5 green checkmarks for table creation

---

## 💻 STEP 2: UPDATE BACKEND ENVIRONMENT (3 MINUTES)

### Update backend/.env

Replace the database configuration section:

```bash
# OLD (SQLite)
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/degas.db

# NEW (Supabase - PostgreSQL)
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.eeoygtsrwaenbyroukxb.supabase.co:5432/postgres
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

**Where to find your connection string:**
- Log into Supabase dashboard
- Click your project
- Settings → Database → Connection String
- Select "PoolerJS" or "PostgreSQL"
- Copy the full string
- Replace `[YOUR-PASSWORD]` with your actual password

### Update backend/.env.production

For production (Render deployment):

```bash
# OLD
DATABASE_TYPE=sqlite
DATABASE_DIR=/opt/render/project/src/backend/data

# NEW
NODE_ENV=production
PORT=3001
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.eeoygtsrwaenbyroukxb.supabase.co:5432/postgres
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
```

---

## 🔑 STEP 3: VERIFY CONNECTION (2 MINUTES)

### In your backend directory, run:
```bash
cd backend
npm run build
```

No errors = ✅ Connection is configured correctly

---

## 🧪 STEP 4: TEST THE CONNECTION (5 MINUTES)

### Create a quick test script: `test-supabase-connection.js`

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

(async () => {
  try {
    const client = await pool.connect();
    
    // Test connection
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connection successful:', result.rows[0]);
    
    // Count tables
    const tables = await client.query(`
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('✅ Tables created:', tables.rows[0].count);
    
    // List all tables
    const tableList = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('✅ Tables found:', tableList.rows.map(t => t.table_name));
    
    client.release();
    pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
})();
```

### Run it:
```bash
node test-supabase-connection.js
```

**Expected Output:**
```
✅ Connection successful: { now: ... }
✅ Tables created: 5
✅ Tables found: [ 'access_logs', 'core_users', 'forms', 'qr_codes', 'users' ]
```

If you see "✅" for all three, Supabase is ready! 🎉

---

## 📱 STEP 5: OPTIONAL - UPDATE FRONTEND (If Deployed)

If your frontend is on Render and you've changed backends, restart it:

1. Go to Render dashboard
2. Select your frontend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Frontend will rebuild and use new backend

---

## ✅ VERIFICATION CHECKLIST

- [ ] SQL tables created in Supabase SQL Editor
- [ ] .env files updated with DATABASE_URL
- [ ] Backend builds without errors (`npm run build`)
- [ ] Connection test shows 5 tables created
- [ ] Super admin exists: admin@degas.com / admin123
- [ ] Default form "The Force of Grace Ministry" created

---

## 🔄 ROLLBACK TO NEON (If Needed)

If something doesn't work with Supabase, reverting is simple:

### Update backend/.env
```bash
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/degas.db
```

### Update backend/.env.production
```bash
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://[YOUR-NEON-CONNECTION-STRING]
```

Then rebuild and restart. You're back on Neon! ⏮️

---

## 🐛 TROUBLESHOOTING

### Error: "FATAL: password authentication failed"
- **Cause**: Wrong password in connection string
- **Fix**: Copy password again from Supabase dashboard
- **Verify**: Password has no special characters that need escaping

### Error: "relation 'users' does not exist"
- **Cause**: Tables weren't created in Supabase
- **Fix**: Run SUPABASE_SETUP.sql in Supabase SQL Editor again
- **Verify**: Run: `SELECT * FROM information_schema.tables WHERE table_schema = 'public'`

### Error: "SSL certificate problem"
- **Cause**: Supabase requires SSL (this is expected)
- **Fix**: Already set in .env: `DATABASE_SSL_REJECT_UNAUTHORIZED=false`
- **Verify**: Should work with the .env config we set

### Error: "Connection refused"
- **Cause**: Wrong host in connection string
- **Fix**: Copy connection string directly from Supabase dashboard
- **Verify**: String should contain: `db.eeoygtsrwaenbyroukxb.supabase.co`

### Tables showing but queries fail
- **Cause**: Missing FOREIGN KEY relationships
- **Fix**: Ensure all tables created (they should be in SUPABASE_SETUP.sql)
- **Verify**: Run: `SELECT * FROM forms LIMIT 1`

---

## 📊 SUPABASE PROJECT INFO

Your Supabase Project:
```
Project ID: eeoygtsrwaenbyroukxb
Host: db.eeoygtsrwaenbyroukxb.supabase.co
Database: postgres
User: postgres
Connection: 5432 (PostgreSQL)
```

---

## 💡 BEST PRACTICES

1. **Never commit .env files** - They contain sensitive credentials
2. **Rotate passwords regularly** - Change admin123 password immediately
3. **Enable Supabase backups** - Settings → Backups → Enable daily/weekly
4. **Monitor database** - Supabase Dashboard → Logs show all queries in development
5. **Use connection pooling** - Already configured in our connection string

---

## 🎯 NEXT STEPS AFTER MIGRATION

Once verified:
1. Deploy backend to Render
2. Update Render environment variables (copy from .env.production)
3. Redeploy frontend (if it cached old backend)
4. Test login with admin@degas.com / admin123
5. Register a test user
6. Verify profile image upload works (Cloudinary configured?)

---

## 📞 SUPPORT

**Something not working?**
- Check error message in: backend console logs
- Verify tables: Run verification queries in Supabase SQL Editor
- Check connection string: Ensure no typos in DATABASE_URL
- Enable debug logging: Set LOG_LEVEL=debug in .env

---

**You're ready to go! 🚀**
