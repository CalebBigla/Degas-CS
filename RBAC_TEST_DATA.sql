-- ============================================================================
-- RBAC TEST DATA SETUP
-- Insert test users for FOLLOW_UP and GREETER roles
-- Run this after the main database schema is created
-- ============================================================================

-- NOTE: Passwords should be hashed with bcrypt in production
-- For testing, use a password hashing tool or your app's registration system
-- Example password hashing in Node.js:
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('password123', 10, (err, hash) => console.log(hash));

-- ============================================================================
-- FOLLOW_UP ROLE TEST USER
-- Permissions: Dashboard + Access Logs only
-- ============================================================================
INSERT INTO core_users (email, password, full_name, phone, role, status)
VALUES (
  'followup@fgm.com',
  -- Replace with actual bcrypt hash of 'followup123'
  '$2a$10$8qE5Bi.dYZ7RZ6Hl5yqfneLdIsHXRPV3.ZYrBLlXHMqaXGyKyNAi2',
  'Follow-Up Coordinator',
  '+1-XXX-XXX-XXXX',
  'follow_up',
  'active'
);

-- ============================================================================
-- GREETER ROLE TEST USER
-- Permissions: Scanner only
-- ============================================================================
INSERT INTO core_users (email, password, full_name, phone, role, status)
VALUES (
  'greeter@fgm.com',
  '$2a$10$ZCMY3tdoNc/fESCUTXbYuu3pNxRKbmv8f3vzwNQE8EO4Zak.x/1fy',
  'Greeter Team Member',
  '+1-XXX-XXX-XXXX',
  'greeter',
  'active'
);

-- ============================================================================
-- ADDITIONAL TEST DATA (Optional)
-- Create more greeters for testing team scenario
-- ============================================================================

INSERT INTO core_users (email, password, full_name, phone, role, status)
VALUES (
  'greeter2@fgm.com',
  '$2a$10$ZCMY3tdoNc/fESCUTXbYuu3pNxRKbmv8f3vzwNQE8EO4Zak.x/1fy',
  'Greeter - Team Lead',
  '+1-XXX-XXX-XXXX',
  'greeter',
  'active'
);

INSERT INTO core_users (email, password, full_name, phone, role, status)
VALUES (
  'followup2@fgm.com',
  '$2a$10$8qE5Bi.dYZ7RZ6Hl5yqfneLdIsHXRPV3.ZYrBLlXHMqaXGyKyNAi2',
  'Follow-Up Manager',
  '+1-XXX-XXX-XXXX',
  'follow_up',
  'active'
);

-- ============================================================================
-- QUERY: Verify all users with their roles
-- ============================================================================
-- SELECT id, email, full_name, role, status FROM core_users ORDER BY role;

-- ============================================================================
-- NOTES FOR TESTING
-- ============================================================================
-- 
-- Test Users Created:
-- 1. followup@fgm.com (follow_up role)
--    - Can access: Dashboard, Access Logs
--    - Cannot access: Tables, Forms, Scanner, Analytics
--    - Default redirect: /admin/dashboard
--
-- 2. greeter@fgm.com (greeter role)
--    - Can access: Scanner only
--    - Cannot access: Dashboard, Tables, Forms, Access Logs, Analytics
--    - Default redirect: /scanner
--
-- 3. Admin users (existing)
--    - Full access to all modules
--
-- 4. Regular users (existing)
--    - Limited to user dashboard and user scanner
--
-- ============================================================================
-- PASSWORD HASHING INSTRUCTIONS
-- ============================================================================
--
-- If you need to update passwords, use this Node.js code:
--
-- const bcrypt = require('bcryptjs');
-- 
-- async function hashPassword(password) {
--   const hash = await bcrypt.hash(password, 10);
--   console.log(`\`${hash}\``);
-- }
--
-- hashPassword('followup123');
-- hashPassword('greeter123');
--
-- ============================================================================
