-- PHASE 1: Core User System (Non-Breaking Extension)
-- This adds a new authentication layer WITHOUT modifying existing dynamic tables

-- Core users table for authentication
CREATE TABLE IF NOT EXISTS core_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    qr_token TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- PHASE 2: Link core users to dynamic table records
CREATE TABLE IF NOT EXISTS user_data_links (
    id SERIAL PRIMARY KEY,
    core_user_id UUID NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(core_user_id, table_name, record_id)
);

-- PHASE 3: CMS-driven form definitions
CREATE TABLE IF NOT EXISTS form_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    target_table TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'password', 'number', 'date', 'file', 'camera', 'select', 'textarea')),
    is_required BOOLEAN DEFAULT false,
    is_email_field BOOLEAN DEFAULT false,
    is_password_field BOOLEAN DEFAULT false,
    options TEXT,
    placeholder TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- PHASE 6: Attendance system
CREATE TABLE IF NOT EXISTS attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    qr_code TEXT,
    created_by UUID REFERENCES core_users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    core_user_id UUID NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP DEFAULT NOW(),
    method TEXT DEFAULT 'qr_scan',
    location TEXT,
    ip_address TEXT,
    user_agent TEXT,
    UNIQUE(core_user_id, session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email);
CREATE INDEX IF NOT EXISTS idx_core_users_qr_token ON core_users(qr_token);
CREATE INDEX IF NOT EXISTS idx_user_data_links_core_user ON user_data_links(core_user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_links_table ON user_data_links(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON attendance_records(core_user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_active ON attendance_sessions(is_active);

-- Audit log for attendance (extends existing system)
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
    id SERIAL PRIMARY KEY,
    core_user_id UUID REFERENCES core_users(id),
    session_id UUID REFERENCES attendance_sessions(id),
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_user ON attendance_audit_logs(core_user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_session ON attendance_audit_logs(session_id);
