# 🚀 SUPABASE MIGRATION - QUICK START

## FILES READY FOR YOU:

1. **SUPABASE_SETUP.sql** - Complete SQL code to run in Supabase
2. **SUPABASE_MIGRATION_GUIDE.md** - Full step-by-step guide
3. **backend/.env** - Updated for Supabase (development)
4. **backend/.env.production** - Updated for Supabase (production)

---

## ⚡ QUICK STEPS (15 MINUTES):

### STEP 1: Replace Your Password
In both `.env` and `.env.production`, replace:
```
[YOUR-PASSWORD]
```
With your actual Supabase password.

Find your password:
- Supabase Dashboard → Settings → Database → Password (or scroll to see it)

### STEP 2: Create Tables in Supabase
1. Open Supabase Dashboard
2. Click "SQL Editor"
3. Click "New Query"
4. Copy **entire** `SUPABASE_SETUP.sql` content
5. Paste into Supabase editor
6. Click "RUN"
7. Wait for "✅ Success"

### STEP 3: Test Backend Connection
```bash
cd backend
npm run build
```
If no errors → ✅ Ready!

### STEP 4: Deploy (Optional)
```bash
git add -A
git commit -m "migrate: switch to Supabase PostgreSQL"
git push
```

---

## ✅ CHECKLIST BEFORE RUNNING:

- [ ] Your Supabase password copied
- [ ] Updated `[YOUR-PASSWORD]` in .env files
- [ ] Saved .env files
- [ ] Ready to paste SQL into Supabase

---

## 🆘 IF SOMETHING BREAKS:

Revert instantly - Just change back to:
```bash
DATABASE_TYPE=sqlite
DATABASE_PATH=./data/degas.db
```

---

**Everything is configured. Just update the password and run the SQL! 🎉**
