-- Database Optimization Script for Degas CS
-- Run this script to add indexes and optimize queries

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dynamic_users_table_id ON dynamic_users(table_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_users_uuid ON dynamic_users(uuid);
CREATE INDEX IF NOT EXISTS idx_dynamic_users_created_at ON dynamic_users(created_at);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_scan_timestamp ON access_logs(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_access_logs_scanner_location ON access_logs(scanner_location);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_granted ON access_logs(access_granted);

CREATE INDEX IF NOT EXISTS idx_tables_created_at ON tables(created_at);
CREATE INDEX IF NOT EXISTS idx_tables_name ON tables(name);

-- Add GIN index for JSONB data column for faster searches
CREATE INDEX IF NOT EXISTS idx_dynamic_users_data_gin ON dynamic_users USING GIN (data);

-- Add partial indexes for active users
CREATE INDEX IF NOT EXISTS idx_dynamic_users_active ON dynamic_users(table_id) 
WHERE (data->>'status') = 'active';

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_access_logs_location_timestamp ON access_logs(scanner_location, scan_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dynamic_users_table_created ON dynamic_users(table_id, created_at DESC);

-- Update table statistics
ANALYZE dynamic_users;
ANALYZE access_logs;
ANALYZE tables;

-- Add comments for documentation
COMMENT ON INDEX idx_dynamic_users_data_gin IS 'GIN index for fast JSONB searches on user data';
COMMENT ON INDEX idx_dynamic_users_active IS 'Partial index for active users only';
COMMENT ON INDEX idx_access_logs_location_timestamp IS 'Composite index for location-based log queries';