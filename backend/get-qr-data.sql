-- Get the most recent QR code data for testing
-- Copy the qr_data value and paste it in the scanner's manual entry

SELECT 
    qc.id as qr_id,
    qc.user_id,
    du.uuid as employee_id,
    du.data as user_info,
    qc.qr_data,
    qc.created_at,
    qc.scan_count,
    t.name as table_name
FROM qr_codes qc
JOIN dynamic_users du ON qc.user_id = du.id
JOIN tables t ON qc.table_id = t.id
WHERE qc.is_active = 1
ORDER BY qc.created_at DESC
LIMIT 5;
