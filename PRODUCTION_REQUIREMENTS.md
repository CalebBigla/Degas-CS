# Production Requirements - Degas-CS

## Critical Changes Needed

### ❌ REMOVE: Global ID Card Customization
**Current (Wrong):**
- "Customize ID Card Design" button on Tables page
- One setting for all tables
- Stored in `id_card_settings` table

**Why Wrong:**
- Each table has different columns
- Staff table might have: Name, Department, Role
- Visitor table might have: Name, Company, Visit Date
- One global setting doesn't work for different table structures

### ✅ IMPLEMENT: Per-Table ID Card Customization
**Required (Correct):**
- Each table has its own ID card settings
- Settings based on that table's actual columns
- Stored in the `tables` table as `id_card_config` JSON field
- When viewing Table Detail page, show "Customize ID Cards for This Table" button
- Modal shows only columns from THAT table
- Admin selects which columns to show on ID cards

**Example:**
```
Staff Table Columns: [Name, Employee ID, Department, Role, Email]
Admin Customizes: Show [Name, Employee ID, Department] on ID cards

Visitor Table Columns: [Name, Company, Purpose, Visit Date]
Admin Customizes: Show [Name, Company, Visit Date] on ID cards
```

### ✅ VERIFY: No Demo/Hardcoded Data
**Check These:**
- ✅ No hardcoded tables in database initialization
- ✅ No demo users in seed scripts (only admin accounts)
- ✅ Access Log shows only real QR scans
- ✅ CSV import creates real tables from uploaded files
- ✅ Manual table creation uses admin input

### ✅ MAINTAIN: Existing Functionality
**Don't Touch:**
- CSV import and table creation
- Manual table creation
- CRUD operations on tables/users
- QR code generation and scanning
- Authentication system
- Access logging

## Implementation Steps

### Step 1: Update Database Schema
Add `id_card_config` column to `tables` table:
```sql
ALTER TABLE tables ADD COLUMN id_card_config TEXT DEFAULT NULL;
```

### Step 2: Remove Global Customization
- Remove "Customize ID Card Design" button from TablesPage
- Remove `IDCardSettingsModal` component (or repurpose it)
- Keep `id_card_settings` table for backward compatibility but don't use it

### Step 3: Add Per-Table Customization
- Add "Customize ID Cards" button to TableDetailPage
- Create new modal that shows columns from current table
- Save settings to `tables.id_card_config` field
- Update PDF generation to use table-specific settings

### Step 4: Update ID Card Generation
- Fetch table's `id_card_config` when generating cards
- Use only selected columns from that table
- Fall back to showing all columns if no config exists

### Step 5: Update Bulk Generation
- Use table-specific settings for bulk generation
- Each table's bulk download uses its own customization

## Database Changes

### tables table
```sql
CREATE TABLE tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  schema TEXT NOT NULL,  -- JSON array of columns
  id_card_config TEXT,   -- NEW: JSON config for ID cards
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### id_card_config JSON structure
```json
{
  "visibleFields": ["Name", "Employee ID", "Department"],
  "layout": "standard",
  "theme": "light",
  "fontSize": "medium",
  "qrPosition": "bottom-right",
  "showPhoto": true
}
```

## Files to Modify

### Backend
1. `backend/src/config/sqlite.ts` - Add id_card_config column
2. `backend/src/controllers/tableController.ts` - Add endpoint to save/get table config
3. `backend/src/services/pdfService.ts` - Use table-specific config

### Frontend
1. `frontend/src/pages/TablesPage.tsx` - REMOVE global customize button
2. `frontend/src/pages/TableDetailPage.tsx` - ADD per-table customize button
3. `frontend/src/components/settings/IDCardSettingsModal.tsx` - Repurpose for per-table use

## Testing Checklist

- [ ] Create table from CSV
- [ ] Customize ID cards for that table
- [ ] Generate single ID card - uses table settings
- [ ] Generate bulk ID cards - uses table settings
- [ ] Create another table
- [ ] Customize differently - settings are independent
- [ ] Verify no demo data anywhere
- [ ] Verify Access Log shows only real scans

## Production Readiness

- [ ] No hardcoded data
- [ ] No demo/sample data
- [ ] Each table independent
- [ ] Settings persist correctly
- [ ] Existing features still work
- [ ] QR scanning works
- [ ] Authentication works

---

**Status:** Ready to implement
**Priority:** HIGH - Production blocker
**Impact:** Per-table customization is core requirement
