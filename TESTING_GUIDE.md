# Testing Guide - Degas-CS New Features

This guide helps you test all newly implemented features to ensure they work correctly.

---

## 🧪 Test Environment Setup

1. **Start the Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Login as Admin:**
   - Navigate to http://localhost:5173
   - Login with admin credentials

---

## Test 1: CSV Import Validation Fix

### Objective
Verify that CSV files with realistic data (spaces, optional fields) can be imported successfully.

### Test Steps
1. Create a test CSV file with these characteristics:
   ```csv
   Full Name,Email Address,Department,Phone Number,Status
   John Doe,john@example.com,Engineering,,active
   Jane Smith,,Marketing,555-1234,
   Bob Johnson,bob@example.com,,,active
   ```
   Note: Some fields are empty (optional)

2. Navigate to Tables page
3. Click "Import CSV" or "Upload CSV"
4. Select your test CSV file
5. Review the preview

### Expected Results
- ✅ CSV should be parsed successfully
- ✅ Headers with spaces should be accepted
- ✅ Empty fields should not cause validation errors
- ✅ Preview should show all rows correctly
- ✅ Table should be created with all data

### Failure Indicators
- ❌ "Validation failed" error
- ❌ Headers rejected due to spaces
- ❌ Rows rejected due to empty fields

---

## Test 2: Table CRUD UI Improvements

### Objective
Verify that the new inline action icons work correctly.

### Test Steps
1. Navigate to any table detail page
2. Observe the action buttons for each user row

### Expected Results
- ✅ Three inline icon buttons visible:
  - Blue Edit icon
  - Green Download icon
  - Red Delete icon
- ✅ Hover states show colored backgrounds
- ✅ Tooltips appear on hover
- ✅ Clicking Edit opens edit modal
- ✅ Clicking Download generates ID card
- ✅ Clicking Delete prompts confirmation

### Failure Indicators
- ❌ 3-dot dropdown menu still present
- ❌ Icons not visible
- ❌ Actions don't work

---

## Test 3: Global ID Card Customization

### Objective
Verify that ID card settings can be customized and persist.

### Test Steps

#### Part A: Access Settings
1. Navigate to Tables page
2. Look for "Customize ID Card Design" button
3. Click the button

### Expected Results
- ✅ Settings modal opens
- ✅ Modal shows customization options:
  - Field selection checkboxes
  - Layout options (standard, compact, detailed)
  - Theme options (light, dark, corporate)
  - Font size dropdown
  - QR position selector
  - Preview panel

#### Part B: Modify Settings
1. Uncheck "Department" field
2. Select "Compact" layout
3. Choose "Dark" theme
4. Select "Large" font size
5. Click "Save Settings"

### Expected Results
- ✅ Success message appears
- ✅ Modal closes
- ✅ Settings saved to database

#### Part C: Verify Settings Persist
1. Refresh the page
2. Open settings modal again

### Expected Results
- ✅ Previously selected options are still selected
- ✅ Settings loaded from database

#### Part D: Test ID Card Generation
1. Navigate to any table detail page
2. Click Download icon for any user
3. Open the generated PDF

### Expected Results
- ✅ ID card reflects customization settings
- ✅ Department field is hidden (as unchecked)
- ✅ Layout is compact
- ✅ Theme is dark
- ✅ Font size is large

### Failure Indicators
- ❌ Settings button not visible
- ❌ Modal doesn't open
- ❌ Settings don't save
- ❌ Settings don't persist after refresh
- ❌ Generated ID cards don't reflect settings

---

## Test 4: Bulk ID Card Generation

### Objective
Verify that multiple ID cards can be generated and downloaded as a ZIP file.

### Test Steps

#### Part A: Selection UI
1. Navigate to any table detail page with multiple users
2. Observe the table header

### Expected Results
- ✅ Checkbox column added to table
- ✅ "Select All" checkbox in header
- ✅ Individual checkboxes for each user row

#### Part B: Select Users
1. Click individual checkboxes to select 3-5 users
2. Observe the header

### Expected Results
- ✅ Selected count appears in header: "X selected"
- ✅ Bulk generate button appears
- ✅ Button shows: "Generate X ID Cards"

#### Part C: Select All
1. Click "Select All" checkbox in header

### Expected Results
- ✅ All user checkboxes become checked
- ✅ Count updates to total users
- ✅ Button shows: "Generate [total] ID Cards"

#### Part D: Generate Bulk ID Cards
1. With users selected, click "Generate X ID Cards" button
2. Wait for processing

### Expected Results
- ✅ Button shows "Generating..." during processing
- ✅ Button is disabled during processing
- ✅ ZIP file downloads automatically after completion
- ✅ Success toast message appears
- ✅ Selections are cleared after download

#### Part E: Verify ZIP Contents
1. Extract the downloaded ZIP file
2. Open several PDF files

### Expected Results
- ✅ ZIP contains one PDF per selected user
- ✅ Each PDF is a valid ID card
- ✅ ID cards reflect global customization settings
- ✅ All selected users have ID cards in ZIP
- ✅ File names are meaningful (e.g., "John_Doe_id_card.pdf")

### Failure Indicators
- ❌ Checkboxes not visible
- ❌ Bulk button doesn't appear
- ❌ Generation fails or hangs
- ❌ ZIP file doesn't download
- ❌ ZIP is empty or corrupted
- ❌ ID cards don't match settings

---

## Test 5: Large Batch Processing

### Objective
Verify that bulk generation works with large numbers of users.

### Test Steps
1. Create or navigate to a table with 50+ users
2. Click "Select All"
3. Click "Generate X ID Cards"
4. Wait for processing (may take 30-60 seconds)

### Expected Results
- ✅ Processing completes without errors
- ✅ UI remains responsive
- ✅ ZIP file downloads successfully
- ✅ All users have ID cards in ZIP
- ✅ No memory errors or crashes

### Failure Indicators
- ❌ Browser freezes or crashes
- ❌ Generation fails with error
- ❌ Some users missing from ZIP
- ❌ Memory errors in console

---

## Test 6: Missing Image Handling

### Objective
Verify that ID card generation handles missing user photos gracefully.

### Test Steps
1. Create a user without uploading a photo
2. Generate ID card for that user
3. Open the PDF

### Expected Results
- ✅ ID card generates successfully
- ✅ Placeholder image or initials shown instead of photo
- ✅ No errors in console
- ✅ Rest of ID card displays correctly

### Failure Indicators
- ❌ Generation fails
- ❌ Broken image in PDF
- ❌ Error messages

---

## Test 7: Existing Features Still Work

### Objective
Verify that no existing functionality was broken.

### Test Steps
1. **QR Code Scanning:**
   - Generate an ID card
   - Scan the QR code with scanner
   - Verify user details appear

2. **Authentication:**
   - Logout
   - Login again
   - Verify access control works

3. **User Management:**
   - Create a new user manually
   - Edit an existing user
   - Delete a user
   - Verify all operations work

4. **Table Management:**
   - Create a new table manually
   - View table details
   - Delete a table
   - Verify all operations work

### Expected Results
- ✅ All existing features work as before
- ✅ No errors in console
- ✅ No broken functionality

### Failure Indicators
- ❌ Any existing feature broken
- ❌ Errors in console
- ❌ Authentication issues

---

## 🐛 Common Issues and Solutions

### Issue: "Settings not found" error
**Solution:** Restart backend to ensure database table is created

### Issue: ZIP file doesn't download
**Solution:** Check browser download settings, try different browser

### Issue: ID cards show default design despite customization
**Solution:** Clear browser cache, verify settings saved in database

### Issue: Bulk generation fails for large batches
**Solution:** Try smaller batches (10-20 users), check server logs

### Issue: Checkboxes not visible
**Solution:** Hard refresh browser (Ctrl+Shift+R), clear cache

---

## 📊 Performance Benchmarks

Expected performance for bulk generation:
- **5 users:** < 5 seconds
- **10 users:** < 10 seconds
- **25 users:** < 20 seconds
- **50 users:** < 40 seconds
- **100 users:** < 80 seconds

If generation takes significantly longer, check:
- Server resources (CPU, memory)
- Network speed
- Image file sizes

---

## ✅ Test Completion Checklist

Mark each test as complete:
- [ ] Test 1: CSV Import Validation Fix
- [ ] Test 2: Table CRUD UI Improvements
- [ ] Test 3: Global ID Card Customization
- [ ] Test 4: Bulk ID Card Generation
- [ ] Test 5: Large Batch Processing
- [ ] Test 6: Missing Image Handling
- [ ] Test 7: Existing Features Still Work

---

## 📝 Bug Report Template

If you find issues, report them with this format:

```
**Test:** [Test name]
**Step:** [Which step failed]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Browser:** [Chrome/Firefox/Safari/Edge]
**Console Errors:** [Any errors in browser console]
**Screenshots:** [If applicable]
```

---

## 🎯 Success Criteria

All tests pass when:
- ✅ CSV import works with realistic data
- ✅ Action icons work correctly
- ✅ Settings can be customized and persist
- ✅ Bulk generation works for small and large batches
- ✅ Missing images handled gracefully
- ✅ All existing features still work
- ✅ No console errors
- ✅ Performance is acceptable

---

**Happy Testing! 🚀**
