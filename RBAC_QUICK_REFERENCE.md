# RBAC Quick Reference Guide

## TL;DR - For Developers

### Protect a New Route

**Backend (Node.js/Express):**
```typescript
import { authenticateCoreUser } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';

router.get('/admin/my-feature',
  authenticateCoreUser,           // Check token is valid
  requireModuleAccess('module-name'), // Check role has access
  myFeatureHandler                // Your handler
);
```

**Frontend (React):**
```typescript
import { canAccessModule } from '../lib/rbac';
import { useAuth } from '../hooks/useAuth';

export function MyComponent() {
  const { userRole } = useAuth();
  
  // Hide if no access
  if (!canAccessModule(userRole as any, 'module-name')) {
    return <Unauthorized />;
  }
  
  return <MyFeature />;
}
```

---

## Roles & Modules Cheat Sheet

### 5 Roles
| Role | Default Path | Modules |
|------|--------------|---------|
| SUPER_ADMIN | /admin/dashboard | All |
| ADMIN | /admin/dashboard | All |
| FOLLOW_UP | /admin/dashboard | dashboard, access-logs |
| GREETER | /scanner | scanner |
| USER | /user/dashboard | user-*, scanner |

### Module Names
- dashboard
- tables
- forms
- scanner
- access-logs
- analytics
- settings
- users

---

## Common Tasks

### Add New Role
1. Add to database: `role TEXT CHECK (role IN (..., 'new_role'))`
2. Add to `backend/src/config/rbac.ts` ROLE_PERMISSIONS
3. Add to `frontend/src/lib/rbac.ts` ROLE_PERMISSIONS
4. Update `frontend/src/hooks/useAuth.tsx` User type
5. Handle routing in `frontend/src/App.tsx`

### Protect New Route with RBAC
1. Import: `requireModuleAccess` middleware
2. Add to route: `requireModuleAccess('module-name')`
3. Test with different roles using RBAC_TESTING_GUIDE.md

### Create New Module Access Group
1. Pick module names (e.g., 'reports', 'settings')
2. Add to ROLE_PERMISSIONS['role_name'].modules array
3. Use `requireModuleAccess('reports')` on routes
4. Filter frontend navigation with `canAccessModule(role, 'reports')`

### Test Module Access
```javascript
// Browser console
const token = localStorage.getItem('degas_core_token');
fetch('/api/protected/route', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
// Should return 403 if no access, 200 if yes
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `backend/src/config/rbac.ts` | Role-permission mapping |
| `backend/src/middleware/authorizationMiddleware.ts` | Module access enforcement |
| `frontend/src/lib/rbac.ts` | Frontend permission utilities |
| `frontend/src/hooks/useAuth.tsx` | User role type definitions |
| `frontend/src/App.tsx` | Role-based routing |
| `frontend/src/components/Layout.tsx` | Navigation filtering |

---

## Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 401 | No valid token | Login required |
| 403 | Token valid, but module access denied | Check role permissions |
| 500 | Server error | Check backend logs |

---

## Common Issues

### Module not accessible after adding it
- [ ] Updated backend ROLE_PERMISSIONS
- [ ] Updated frontend ROLE_PERMISSIONS
- [ ] Hard refreshed frontend (Ctrl+Shift+R)
- [ ] Restarted backend server

### User sees module in sidebar but API returns 403
- [ ] RBAC definitions out of sync
- [ ] User role hasn't been assigned properly
- [ ] Token expired (logout and login again)

### Route redirects but shouldn't
- [ ] Check App.tsx routing logic
- [ ] Verify role is in getDefaultRedirectPath
- [ ] Check userRole state is set correctly

---

## Testing Checklist

```
Before deploying role changes:
☐ Test login with all roles
☐ Verify sidebar shows correct modules
☐ Try API calls with unauthorized role (expect 403)
☐ Try API calls with authorized role (expect 200)
☐ Test manual URL access (should redirect)
☐ Check browser logs for no console errors
☐ Check backend logs for proper access logging
```

---

## Performance Tips

1. **Don't check permissions repeatedly** - Store in state
2. **Batch API calls** - Reduce authentication checks
3. **Cache module lists** - Don't recalculate per render
4. **Use lazy loading** - Load modules only when accessible

---

## Security Reminders

⚠️ **Never:**
- Trust frontend permission checks alone
- Store sensitive data in localStorage plaintext
- Allow direct role change from frontend
- Bypass backend authorization checks

✅ **Always:**
- Verify token on every API call
- Check module access on backend
- Log authorization failures
- Test with actual restricted roles

---

## Deployment Checklist

Before deploying to production:
- [ ] All env variables configured
- [ ] Database migrated with new schema
- [ ] Test users created with proper roles
- [ ] Backend and frontend RBAC in sync
- [ ] All routes tested with each role
- [ ] Logging configured and working
- [ ] Backup database before changes
- [ ] Run RBAC_TESTING_GUIDE.md tests

---

## Support Resources

1. **Implementation:** See RBAC_IMPLEMENTATION_GUIDE.md
2. **Testing:** See RBAC_TESTING_GUIDE.md
3. **Full Details:** See RBAC_IMPLEMENTATION_SUMMARY.md
4. **Database:** See RBAC_TEST_DATA.sql

---

## Quick Command Reference

```bash
# Hash a password for test users
node -e "require('bcryptjs').hash('password123', 10, (err, hash) => console.log(hash))"

# Check user roles in database
sqlite3 db.sqlite "SELECT email, role, status FROM core_users;"

# Monitor access denials in logs
grep "MODULE ACCESS DENIED" logs/*.log

# Reset user to active status
sqlite3 db.sqlite "UPDATE core_users SET status='active' WHERE email='user@test.com';"
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-10 | Initial RBAC implementation with FOLLOW_UP and GREETER roles |

---

**Last Updated:** April 10, 2026
**Maintained By:** Development Team
