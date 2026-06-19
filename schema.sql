-- LUSL MIS - Institutional Management System Schema
-- Limkokwing University Sierra Leone

-- 1. ROLE DEFINITIONS
CREATE TYPE user_role AS ENUM ('admin', 'finance', 'registry', 'student');

-- 2. PROFILES TABLE (Core Identity)
-- Admins can manage these, but not view specific financial/academic details linked to them.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL,
    identification_number TEXT UNIQUE NOT NULL, -- e.g., 'LUC/2026/001' or 'FIN-001'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security fields for OTP / Lockout
    failed_otp_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ
);

-- 3. FINANCIAL LEDGER (Finance Only)
-- STRICT RULE: Admins cannot view this table.
CREATE TABLE financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    total_balance DECIMAL(15, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'SLE',
    last_payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRANSACTIONS (Finance Only)
-- STRICT RULE: Admins cannot view this table.
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    reference_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACADEMIC RECORDS (Registry & Student Only)
CREATE TABLE academic_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    course_name TEXT NOT NULL,
    course_code TEXT NOT NULL,
    status TEXT DEFAULT 'Enrolled', -- 'Enrolled', 'Completed', 'Deferred'
    grade TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_records ENABLE ROW LEVEL SECURITY;

-- A. PROFILES POLICIES
-- Admin can manage all profiles
CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL TO authenticated
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT TO authenticated
    USING ( id = auth.uid() );

-- B. FINANCIAL POLICIES (THE BLIND SPOT)
-- Only Finance staff can manage financial records
CREATE POLICY "Finance staff can manage financial records" ON financial_records
    FOR ALL TO authenticated
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'finance' );

-- Students can view their own financial records
CREATE POLICY "Students can view own financial records" ON financial_records
    FOR SELECT TO authenticated
    USING ( student_id = auth.uid() );

-- ADMIN EXCLUSION: Explicitly ensure Admins have NO ACCESS (Even with RLS, we emphasize this)
-- This is handled by NOT including 'admin' in any "FOR ALL" or "FOR SELECT" policies for these tables.

-- C. TRANSACTION POLICIES
CREATE POLICY "Finance staff manage transactions" ON transactions
    FOR ALL TO authenticated
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'finance' );

CREATE POLICY "Students view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING ( student_id = auth.uid() );

-- D. ACADEMIC POLICIES
CREATE POLICY "Registry manage academic records" ON academic_records
    FOR ALL TO authenticated
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'registry' );

CREATE POLICY "Students view own courses" ON academic_records
    FOR SELECT TO authenticated
    USING ( student_id = auth.uid() );
    
-- ==========================================
-- SECURITY TRIGGERS
-- ==========================================

-- Function to handle failed OTP attempts
CREATE OR REPLACE FUNCTION handle_failed_otp()
RETURNS VOID AS $$
BEGIN
    UPDATE profiles 
    SET failed_otp_attempts = failed_otp_attempts + 1,
        locked_until = CASE WHEN failed_otp_attempts + 1 >= 3 THEN NOW() + INTERVAL '15 minutes' ELSE NULL END
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
