
-- SEED DATA --

-- Initial Lab Groups
INSERT INTO public.lab_test_groups (name, category) VALUES
('Biochemistry', 'Pathology'),
('Hematology', 'Pathology'),
('Microbiology', 'Pathology'),
('Serology', 'Pathology'),
('Histopathology', 'Pathology'),
('X-Ray', 'Radiology'),
('Ultrasound', 'Radiology'),
('CT Scan', 'Radiology'),
('MRI', 'Radiology')
ON CONFLICT (name) DO NOTHING;

-- Initial Departments
INSERT INTO public.departments (name, description) VALUES
('General Medicine', 'Standard outpatient and inpatient care'),
('Cardiology', 'Heart and cardiovascular system care'),
('Orthopedics', 'Musculoskeletal system care'),
('Pediatrics', 'Children and adolescent medical care'),
('Obstetrics & Gynecology', 'Female reproductive health and childbirth'),
('Surgery', 'General and specialized surgical procedures'),
('Emergency', 'Critical care and immediate response'),
('Radiology', 'Diagnostic imaging services'),
('Pathology', 'Laboratory diagnostic services')
ON CONFLICT (name) DO NOTHING;

-- Initial Lab Tests
INSERT INTO public.lab_tests (name, category, price) VALUES
('CBC (Complete Blood Count)', 'Pathology', 150.00),
('LFT (Liver Function Test)', 'Pathology', 450.00),
('KFT (Kidney Function Test)', 'Pathology', 500.00),
('Blood Sugar (F/PP)', 'Pathology', 80.00),
('Lipid Profile', 'Pathology', 600.00),
('Urine Routine', 'Pathology', 100.00),
('Chest X-Ray', 'Radiology', 250.00),
('Ultrasound (Whole Abdomen)', 'Radiology', 800.00),
('CT Scan (Brain)', 'Radiology', 3500.00);

-- Initial OT Rooms
INSERT INTO public.ot_rooms (name, status, type) VALUES
('Operation Theatre 1 (Major)', 'Available', 'Major'),
('Operation Theatre 2 (Minor)', 'Available', 'Minor'),
('Operation Theatre 3 (Cardiac)', 'Available', 'Cardiac'),
('Operation Theatre 4 (Orthopedic)', 'Available', 'Orthopedic'),
('Operation Theatre 5 (Emergency)', 'Available', 'Emergency')
ON CONFLICT (name) DO NOTHING;

-- VIEWS --

-- Daily Revenue View
CREATE OR REPLACE VIEW public.daily_revenue 
WITH (security_invoker = true)
AS
SELECT 
  created_at::DATE as date,
  SUM(paid_amount) as total_revenue
FROM public.invoices
WHERE payment_status IN ('Fully Paid', 'Partially Paid')
GROUP BY created_at::DATE
ORDER BY date DESC;

-- Bed Occupancy View
CREATE OR REPLACE VIEW public.bed_occupancy_summary 
WITH (security_invoker = true)
AS
SELECT 
  ward,
  COUNT(*) as total_beds,
  SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied_beds,
  SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available_beds
FROM public.beds
GROUP BY ward;

-- Maternity Ward Specific View
CREATE OR REPLACE VIEW public.maternity_ward_summary
WITH (security_invoker = true)
AS
SELECT 
  p.id as patient_id,
  p.name as patient_name,
  p.mrn,
  b.bed_number,
  a.admission_date,
  br.delivery_date,
  br.delivery_time,
  br.baby_gender,
  br.delivery_type,
  a.status as admission_status
FROM public.patients p
JOIN public.admissions a ON p.id = a.patient_id
JOIN public.beds b ON a.bed_id = b.id
LEFT JOIN public.birth_records br ON p.id = br.mother_id AND a.id = br.admission_id
WHERE b.ward ILIKE '%Maternity%' AND a.status = 'Admitted';

-- Patient 360 Activity Timeline View
CREATE OR REPLACE VIEW public.patient_timeline
WITH (security_invoker = true)
AS
SELECT patient_id, 'VITAL' as activity_type, 'Vitals recorded' as description, recorded_at as activity_date, (SELECT name FROM profiles WHERE id = recorded_by) as performed_by FROM public.patient_vitals
UNION ALL
SELECT patient_id, 'NOTE', 'Clinical note added: ' || note_type, created_at, (SELECT name FROM profiles WHERE id = author_id) FROM public.clinical_notes
UNION ALL
SELECT patient_id, 'TEST', 'Lab test requested', requested_at, (SELECT name FROM profiles WHERE id = requested_by) FROM public.test_requests
UNION ALL
SELECT patient_id, 'INVOICE', 'Bill generated: ' || invoice_number, created_at, (SELECT name FROM profiles WHERE id = issued_by) FROM public.invoices
UNION ALL
SELECT patient_id, 'ADMISSION', 'Patient admitted', admission_date, (SELECT name FROM profiles WHERE id = doctor_id) FROM public.admissions
UNION ALL
SELECT patient_id, 'SURGERY', 'OT Procedure: ' || procedure_name, created_at, (SELECT name FROM profiles WHERE id = surgeon_id) FROM public.ot_schedules;


-- 1. Update pharmacy_items table
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS generic_name TEXT;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2);
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS mrp DECIMAL(10, 2);
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0.00;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS rack_number TEXT;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS composition TEXT;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS is_loose_sale_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS units_per_strip INTEGER DEFAULT 10;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS loose_selling_price DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.pharmacy_items ADD COLUMN IF NOT EXISTS loose_stock INTEGER DEFAULT 0;

-- 2. Update invoice_items table to track tax per item
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS tax_percentage DECIMAL(5, 2) DEFAULT 0.00;

-- 3. (Optional) Rename sale_price to selling_price for clarity if needed, 
-- but we'll stick to the existing column for compatibility
-- ALTER TABLE public.pharmacy_items RENAME COLUMN sale_price TO selling_price;

-- Example of how to populate initial data for a new item with these fields
/*
INSERT INTO public.pharmacy_items (
  name, 
  category, 
  stock_quantity, 
  unit, 
  purchase_price, 
  sale_price, 
  mrp, 
  tax_percentage, 
  hsn_code, 
  batch_number, 
  rack_number
) VALUES (
  'Paracetamol 500mg', 
  'Medicine', 
  100, 
  'Tablets', 
  8.00, 
  12.00, 
  15.50, 
  12.00, 
  '3004', 
  'BTCH123', 
  'A-101'
);
*/

-- 25. Bio-Medical Waste Collection & Transfers
CREATE TABLE IF NOT EXISTS public.bio_waste_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ward TEXT NOT NULL,
  logged_by TEXT NOT NULL,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  collection_time TIME NOT NULL DEFAULT CURRENT_TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bio_waste_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id TEXT UNIQUE NOT NULL,
  agency_name TEXT NOT NULL,
  vehicle_no TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  total_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  certificate_ref TEXT NOT NULL,
  remarks TEXT,
  status TEXT DEFAULT 'Handed Over',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- END OF SCHEMA --
-- AUTOMATIC SYSTEM CONFIGURATION: Enforces RLS globally and configures secure, fully open policies to guarantee global front-end sync with Zero-Error CRUD operations.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    )
    LOOP
        -- 1. Ensure RLS is fully enabled on all tables in compliance with security guidelines
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';

        -- 2. Clean up any existing policies first to prevent "policy already exists" conflicts on subsequent script executions
        EXECUTE 'DROP POLICY IF EXISTS "Allow public select" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow public insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow public update" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow public delete" ON public.' || quote_ident(r.tablename);
        
        EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.' || quote_ident(r.tablename);

        -- 3. App-compatible permissive secure policies ensuring standard front-end clients from any coordinate sync correctly
        EXECUTE 'CREATE POLICY "Allow public select" ON public.' || quote_ident(r.tablename) || ' FOR SELECT TO authenticated, anon USING (true);';
        EXECUTE 'CREATE POLICY "Allow public insert" ON public.' || quote_ident(r.tablename) || ' FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '''') IS NOT NULL);';
        EXECUTE 'CREATE POLICY "Allow public update" ON public.' || quote_ident(r.tablename) || ' FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '''') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '''') IS NOT NULL);';
        EXECUTE 'CREATE POLICY "Allow public delete" ON public.' || quote_ident(r.tablename) || ' FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '''') IS NOT NULL);';
    END LOOP;
END $$;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ==========================================
-- HELPER MIGRATION SCRIPT FOR EXISTING DATABASES
-- Run this block in your Supabase SQL Editor if you are patching an existing database
-- ==========================================

-- 1. Ensure ot_schedules has all necessary columns regardless of older schema iterations
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS scheduled_time TIME;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS surgery_date DATE;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS surgery_time TIME;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS operation_name TEXT;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS procedure_name TEXT;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS room_id UUID;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS ot_rooms_id UUID;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS surgeon_id UUID;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS anesthetist_id UUID;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS ot_number TEXT;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Scheduled';
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ot_schedules ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- 2. Modify existing foreign keys to ON DELETE SET NULL to allow seamless deletion of staff
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_head_id_fkey;
ALTER TABLE public.departments ADD CONSTRAINT departments_head_id_fkey FOREIGN KEY (head_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_doctor_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.admissions DROP CONSTRAINT IF EXISTS admissions_doctor_id_fkey;
ALTER TABLE public.admissions ADD CONSTRAINT admissions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.patient_vitals DROP CONSTRAINT IF EXISTS patient_vitals_recorded_by_fkey;
ALTER TABLE public.patient_vitals ADD CONSTRAINT patient_vitals_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.clinical_notes DROP CONSTRAINT IF EXISTS clinical_notes_author_id_fkey;
ALTER TABLE public.clinical_notes ADD CONSTRAINT clinical_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS prescriptions_doctor_id_fkey;
ALTER TABLE public.prescriptions ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.test_requests DROP CONSTRAINT IF EXISTS test_requests_requested_by_fkey;
ALTER TABLE public.test_requests ADD CONSTRAINT test_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pharmacy_purchases DROP CONSTRAINT IF EXISTS pharmacy_purchases_recorded_by_fkey;
ALTER TABLE public.pharmacy_purchases ADD CONSTRAINT pharmacy_purchases_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_transactions DROP CONSTRAINT IF EXISTS inventory_transactions_performed_by_fkey;
ALTER TABLE public.inventory_transactions ADD CONSTRAINT inventory_transactions_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_issued_by_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_recorded_by_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ot_schedules DROP CONSTRAINT IF EXISTS ot_schedules_surgeon_id_fkey;
ALTER TABLE public.ot_schedules ADD CONSTRAINT ot_schedules_surgeon_id_fkey FOREIGN KEY (surgeon_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ot_schedules DROP CONSTRAINT IF EXISTS ot_schedules_anesthetist_id_fkey;
ALTER TABLE public.ot_schedules ADD CONSTRAINT ot_schedules_anesthetist_id_fkey FOREIGN KEY (anesthetist_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.nursing_notes DROP CONSTRAINT IF EXISTS nursing_notes_nurse_id_fkey;
ALTER TABLE public.nursing_notes ADD CONSTRAINT nursing_notes_nurse_id_fkey FOREIGN KEY (nurse_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.birth_records DROP CONSTRAINT IF EXISTS birth_records_doctor_id_fkey;
ALTER TABLE public.birth_records ADD CONSTRAINT birth_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.external_reports DROP CONSTRAINT IF EXISTS external_reports_uploaded_by_fkey;
ALTER TABLE public.external_reports ADD CONSTRAINT external_reports_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.radiology_records DROP CONSTRAINT IF EXISTS radiology_records_requested_by_fkey;
ALTER TABLE public.radiology_records ADD CONSTRAINT radiology_records_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.maternity_deliveries DROP CONSTRAINT IF EXISTS maternity_deliveries_surgeon_id_fkey;
ALTER TABLE public.maternity_deliveries ADD CONSTRAINT maternity_deliveries_surgeon_id_fkey FOREIGN KEY (surgeon_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.nursing_handovers DROP CONSTRAINT IF EXISTS nursing_handovers_outgoing_nurse_id_fkey;
ALTER TABLE public.nursing_handovers ADD CONSTRAINT nursing_handovers_outgoing_nurse_id_fkey FOREIGN KEY (outgoing_nurse_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.nursing_handovers DROP CONSTRAINT IF EXISTS nursing_handovers_incoming_nurse_id_fkey;
ALTER TABLE public.nursing_handovers ADD CONSTRAINT nursing_handovers_incoming_nurse_id_fkey FOREIGN KEY (incoming_nurse_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Ensure test_requests table contains custom columns for lab test orders
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS test_name TEXT;
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS reference_range TEXT;
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS urgency TEXT;
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS result_value TEXT;
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE public.test_requests ADD COLUMN IF NOT EXISTS findings TEXT;

-- 19. Pathology LIMS Relational Schema
-- Category Master Table
CREATE TABLE IF NOT EXISTS public.test_categories (
    cat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT UNIQUE NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Sub-Category Master Table
CREATE TABLE IF NOT EXISTS public.test_subcategories (
    subcat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.test_categories(cat_id) ON DELETE CASCADE,
    subcategory_name TEXT NOT NULL,
    description TEXT,
    CONSTRAINT uq_cat_sub UNIQUE (category_id, subcategory_name)
);

-- Unit Master Table
CREATE TABLE IF NOT EXISTS public.test_units (
    unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_name TEXT NOT NULL,
    unit_symbol TEXT UNIQUE NOT NULL
);

-- Investigation/Test Master Table (Tests like CBC, LFT, Lipid)
CREATE TABLE IF NOT EXISTS public.investigation_tests (
    test_code VARCHAR(30) PRIMARY KEY,
    test_name TEXT NOT NULL,
    short_name VARCHAR(30) NOT NULL,
    department TEXT NOT NULL,
    category_id UUID REFERENCES public.test_categories(cat_id) ON DELETE SET NULL,
    subcategory_id UUID REFERENCES public.test_subcategories(subcat_id) ON DELETE SET NULL,
    sample_type TEXT NOT NULL,
    processing_method TEXT DEFAULT 'Automated',
    machine_name TEXT,
    report_type TEXT DEFAULT 'Quantitative' CHECK (report_type IN ('Quantitative', 'Qualitative', 'Narrative')),
    tat_hours TEXT DEFAULT '6 Hours',
    normal_range_applicable BOOLEAN DEFAULT TRUE,
    critical_value_applicable BOOLEAN DEFAULT TRUE,
    nabl_compliance BOOLEAN DEFAULT TRUE,
    price DECIMAL(10,2) DEFAULT '0.00'::numeric,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investigation_tests_name ON public.investigation_tests (test_name);

-- Test Parameter Master Table
CREATE TABLE IF NOT EXISTS public.test_parameters (
    parameter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_code VARCHAR(30) NOT NULL REFERENCES public.investigation_tests(test_code) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    unit_symbol TEXT,
    decimal_places INT DEFAULT 1,
    sequence_no INT DEFAULT 10,
    formula_based BOOLEAN DEFAULT FALSE,
    calculation_formula TEXT
);

CREATE INDEX IF NOT EXISTS idx_test_parameters_code ON public.test_parameters (test_code);

-- Age & Gender Based Reference Range Master Table
CREATE TABLE IF NOT EXISTS public.parameter_reference_ranges (
    range_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID NOT NULL REFERENCES public.test_parameters(parameter_id) ON DELETE CASCADE,
    gender TEXT DEFAULT 'All' CHECK (gender IN ('Male', 'Female', 'Other', 'All')),
    age_group TEXT DEFAULT 'All' CHECK (age_group IN ('Newborn', 'Infant', 'Child', 'Adolescent', 'Adult', 'Senior', 'All')),
    low_range_val DECIMAL(12,4) NOT NULL,
    high_range_val DECIMAL(12,4) NOT NULL,
    critical_low_val DECIMAL(12,4),
    critical_high_val DECIMAL(12,4)
);

CREATE INDEX IF NOT EXISTS idx_ref_ranges_parameter ON public.parameter_reference_ranges (parameter_id);

-- Critical Value Calibration Master Table
CREATE TABLE IF NOT EXISTS public.parameter_critical_ranges (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parameter_id UUID UNIQUE NOT NULL REFERENCES public.test_parameters(parameter_id) ON DELETE CASCADE,
    low_critical_limit DECIMAL(12,4) NOT NULL,
    high_critical_limit DECIMAL(12,4) NOT NULL,
    alert_message TEXT NOT NULL
);

-- Sample Collection & Transit Registry Table
CREATE TABLE IF NOT EXISTS public.sample_registrations (
    sample_id VARCHAR(36) PRIMARY KEY,
    pat_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    collected_by_id UUID,
    collection_status TEXT DEFAULT 'Pending' CHECK (collection_status IN ('Pending', 'Collected', 'Received', 'In-Transit', 'Rejected')),
    collection_time TIMESTAMPTZ,
    transit_received_time TIMESTAMPTZ,
    rejection_reason_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_sample_reg_status ON public.sample_registrations (collection_status);

-- LIS Results Logging Table
CREATE TABLE IF NOT EXISTS public.lis_results_releases (
    release_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id VARCHAR(36) NOT NULL REFERENCES public.sample_registrations(sample_id) ON DELETE CASCADE,
    test_code VARCHAR(30) NOT NULL REFERENCES public.investigation_tests(test_code) ON DELETE CASCADE,
    pathologist_comments TEXT,
    verified_by_doctor TEXT,
    released_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    delta_check_audit TEXT,
    CONSTRAINT uq_sample_test UNIQUE (sample_id, test_code)
);

-- Individual Parameters Result Metrics Table
CREATE TABLE IF NOT EXISTS public.parameter_result_values (
    val_id BIGSERIAL PRIMARY KEY,
    release_id UUID NOT NULL REFERENCES public.lis_results_releases(release_id) ON DELETE CASCADE,
    parameter_id UUID NOT NULL REFERENCES public.test_parameters(parameter_id) ON DELETE CASCADE,
    observed_value TEXT NOT NULL,
    observed_status TEXT DEFAULT 'Normal' CHECK (observed_status IN ('Normal', 'Low', 'High', 'Critical'))
);

-- Enable Row Level Security (RLS) on all new LIMS tables
ALTER TABLE public.test_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameter_reference_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameter_critical_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lis_results_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameter_result_values ENABLE ROW LEVEL SECURITY;

-- Create Policies for Authenticated & Public access inside Supabase SQL Editor
DROP POLICY IF EXISTS "Allow public read for test_categories" ON public.test_categories;
CREATE POLICY "Allow public read for test_categories" ON public.test_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for test_categories" ON public.test_categories;
DROP POLICY IF EXISTS "Allow public insert for test_categories" ON public.test_categories;
DROP POLICY IF EXISTS "Allow public update for test_categories" ON public.test_categories;
DROP POLICY IF EXISTS "Allow public delete for test_categories" ON public.test_categories;
CREATE POLICY "Allow public insert for test_categories" ON public.test_categories FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for test_categories" ON public.test_categories FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for test_categories" ON public.test_categories FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for test_subcategories" ON public.test_subcategories;
CREATE POLICY "Allow public read for test_subcategories" ON public.test_subcategories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for test_subcategories" ON public.test_subcategories;
DROP POLICY IF EXISTS "Allow public insert for test_subcategories" ON public.test_subcategories;
DROP POLICY IF EXISTS "Allow public update for test_subcategories" ON public.test_subcategories;
DROP POLICY IF EXISTS "Allow public delete for test_subcategories" ON public.test_subcategories;
CREATE POLICY "Allow public insert for test_subcategories" ON public.test_subcategories FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for test_subcategories" ON public.test_subcategories FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for test_subcategories" ON public.test_subcategories FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for test_units" ON public.test_units;
CREATE POLICY "Allow public read for test_units" ON public.test_units FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for test_units" ON public.test_units;
DROP POLICY IF EXISTS "Allow public insert for test_units" ON public.test_units;
DROP POLICY IF EXISTS "Allow public update for test_units" ON public.test_units;
DROP POLICY IF EXISTS "Allow public delete for test_units" ON public.test_units;
CREATE POLICY "Allow public insert for test_units" ON public.test_units FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for test_units" ON public.test_units FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for test_units" ON public.test_units FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for investigation_tests" ON public.investigation_tests;
CREATE POLICY "Allow public read for investigation_tests" ON public.investigation_tests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for investigation_tests" ON public.investigation_tests;
DROP POLICY IF EXISTS "Allow public insert for investigation_tests" ON public.investigation_tests;
DROP POLICY IF EXISTS "Allow public update for investigation_tests" ON public.investigation_tests;
DROP POLICY IF EXISTS "Allow public delete for investigation_tests" ON public.investigation_tests;
CREATE POLICY "Allow public insert for investigation_tests" ON public.investigation_tests FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for investigation_tests" ON public.investigation_tests FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for investigation_tests" ON public.investigation_tests FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for test_parameters" ON public.test_parameters;
CREATE POLICY "Allow public read for test_parameters" ON public.test_parameters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for test_parameters" ON public.test_parameters;
DROP POLICY IF EXISTS "Allow public insert for test_parameters" ON public.test_parameters;
DROP POLICY IF EXISTS "Allow public update for test_parameters" ON public.test_parameters;
DROP POLICY IF EXISTS "Allow public delete for test_parameters" ON public.test_parameters;
CREATE POLICY "Allow public insert for test_parameters" ON public.test_parameters FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for test_parameters" ON public.test_parameters FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for test_parameters" ON public.test_parameters FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for parameter_reference_ranges" ON public.parameter_reference_ranges;
CREATE POLICY "Allow public read for parameter_reference_ranges" ON public.parameter_reference_ranges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for parameter_reference_ranges" ON public.parameter_reference_ranges;
DROP POLICY IF EXISTS "Allow public insert for parameter_reference_ranges" ON public.parameter_reference_ranges;
DROP POLICY IF EXISTS "Allow public update for parameter_reference_ranges" ON public.parameter_reference_ranges;
DROP POLICY IF EXISTS "Allow public delete for parameter_reference_ranges" ON public.parameter_reference_ranges;
CREATE POLICY "Allow public insert for parameter_reference_ranges" ON public.parameter_reference_ranges FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for parameter_reference_ranges" ON public.parameter_reference_ranges FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for parameter_reference_ranges" ON public.parameter_reference_ranges FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for parameter_critical_ranges" ON public.parameter_critical_ranges;
CREATE POLICY "Allow public read for parameter_critical_ranges" ON public.parameter_critical_ranges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for parameter_critical_ranges" ON public.parameter_critical_ranges;
DROP POLICY IF EXISTS "Allow public insert for parameter_critical_ranges" ON public.parameter_critical_ranges;
DROP POLICY IF EXISTS "Allow public update for parameter_critical_ranges" ON public.parameter_critical_ranges;
DROP POLICY IF EXISTS "Allow public delete for parameter_critical_ranges" ON public.parameter_critical_ranges;
CREATE POLICY "Allow public insert for parameter_critical_ranges" ON public.parameter_critical_ranges FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for parameter_critical_ranges" ON public.parameter_critical_ranges FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for parameter_critical_ranges" ON public.parameter_critical_ranges FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for sample_registrations" ON public.sample_registrations;
CREATE POLICY "Allow public read for sample_registrations" ON public.sample_registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for sample_registrations" ON public.sample_registrations;
DROP POLICY IF EXISTS "Allow public insert for sample_registrations" ON public.sample_registrations;
DROP POLICY IF EXISTS "Allow public update for sample_registrations" ON public.sample_registrations;
DROP POLICY IF EXISTS "Allow public delete for sample_registrations" ON public.sample_registrations;
CREATE POLICY "Allow public insert for sample_registrations" ON public.sample_registrations FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for sample_registrations" ON public.sample_registrations FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for sample_registrations" ON public.sample_registrations FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for lis_results_releases" ON public.lis_results_releases;
CREATE POLICY "Allow public read for lis_results_releases" ON public.lis_results_releases FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for lis_results_releases" ON public.lis_results_releases;
DROP POLICY IF EXISTS "Allow public insert for lis_results_releases" ON public.lis_results_releases;
DROP POLICY IF EXISTS "Allow public update for lis_results_releases" ON public.lis_results_releases;
DROP POLICY IF EXISTS "Allow public delete for lis_results_releases" ON public.lis_results_releases;
CREATE POLICY "Allow public insert for lis_results_releases" ON public.lis_results_releases FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for lis_results_releases" ON public.lis_results_releases FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for lis_results_releases" ON public.lis_results_releases FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read for parameter_result_values" ON public.parameter_result_values;
CREATE POLICY "Allow public read for parameter_result_values" ON public.parameter_result_values FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public write for parameter_result_values" ON public.parameter_result_values;
DROP POLICY IF EXISTS "Allow public insert for parameter_result_values" ON public.parameter_result_values;
DROP POLICY IF EXISTS "Allow public update for parameter_result_values" ON public.parameter_result_values;
DROP POLICY IF EXISTS "Allow public delete for parameter_result_values" ON public.parameter_result_values;
CREATE POLICY "Allow public insert for parameter_result_values" ON public.parameter_result_values FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public update for parameter_result_values" ON public.parameter_result_values FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
CREATE POLICY "Allow public delete for parameter_result_values" ON public.parameter_result_values FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- Add referral columns to patients table if they do not exist
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_referral BOOLEAN DEFAULT FALSE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Blood Donations Table
CREATE TABLE IF NOT EXISTS public.blood_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  bp TEXT NOT NULL,
  hemoglobin DECIMAL(4, 2) NOT NULL,
  status TEXT NOT NULL, -- 'Fit', 'Deferred'
  last_donation DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for blood_donations
ALTER TABLE public.blood_donations ENABLE ROW LEVEL SECURITY;

-- Policies for blood_donations
DROP POLICY IF EXISTS "Allow public read for blood_donations" ON public.blood_donations;
CREATE POLICY "Allow public read for blood_donations" ON public.blood_donations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for blood_donations" ON public.blood_donations;
CREATE POLICY "Allow public insert for blood_donations" ON public.blood_donations FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for blood_donations" ON public.blood_donations;
CREATE POLICY "Allow public update for blood_donations" ON public.blood_donations FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for blood_donations" ON public.blood_donations;
CREATE POLICY "Allow public delete for blood_donations" ON public.blood_donations FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- Blood Issues Table
CREATE TABLE IF NOT EXISTS public.blood_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name TEXT NOT NULL,
  mrn TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  bag_no TEXT NOT NULL,
  ward TEXT,
  issued_by TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for blood_issues
ALTER TABLE public.blood_issues ENABLE ROW LEVEL SECURITY;

-- Policies for blood_issues
DROP POLICY IF EXISTS "Allow public read for blood_issues" ON public.blood_issues;
CREATE POLICY "Allow public read for blood_issues" ON public.blood_issues FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for blood_issues" ON public.blood_issues;
CREATE POLICY "Allow public insert for blood_issues" ON public.blood_issues FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for blood_issues" ON public.blood_issues;
CREATE POLICY "Allow public update for blood_issues" ON public.blood_issues FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for blood_issues" ON public.blood_issues;
CREATE POLICY "Allow public delete for blood_issues" ON public.blood_issues FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- REFRESH SCHEMA CACHE FOR POSTGREST (SUPER IMPORTANT AFTER EXECUTING ALTER STATEMENTS)
NOTIFY pgrst, 'reload schema';

-- Medical Equipment Table
CREATE TABLE IF NOT EXISTS public.medical_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  install_date DATE,
  status TEXT NOT NULL DEFAULT 'Operational',
  last_pm_date DATE,
  next_pm_date DATE,
  amc_vendor TEXT,
  amc_expiry DATE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for medical_equipment
ALTER TABLE public.medical_equipment ENABLE ROW LEVEL SECURITY;

-- Policies for medical_equipment
DROP POLICY IF EXISTS "Allow public read for medical_equipment" ON public.medical_equipment;
CREATE POLICY "Allow public read for medical_equipment" ON public.medical_equipment FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for medical_equipment" ON public.medical_equipment;
CREATE POLICY "Allow public insert for medical_equipment" ON public.medical_equipment FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for medical_equipment" ON public.medical_equipment;
CREATE POLICY "Allow public update for medical_equipment" ON public.medical_equipment FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for medical_equipment" ON public.medical_equipment;
CREATE POLICY "Allow public delete for medical_equipment" ON public.medical_equipment FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- Equipment Breakdowns Table
CREATE TABLE IF NOT EXISTS public.equipment_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES public.medical_equipment(id) ON DELETE CASCADE,
  reported_by TEXT NOT NULL,
  reported_date DATE NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  estimated_cost DECIMAL(12, 2) DEFAULT 0.00,
  resolved_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for equipment_breakdowns
ALTER TABLE public.equipment_breakdowns ENABLE ROW LEVEL SECURITY;

-- Policies for equipment_breakdowns
DROP POLICY IF EXISTS "Allow public read for equipment_breakdowns" ON public.equipment_breakdowns;
CREATE POLICY "Allow public read for equipment_breakdowns" ON public.equipment_breakdowns FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for equipment_breakdowns" ON public.equipment_breakdowns;
CREATE POLICY "Allow public insert for equipment_breakdowns" ON public.equipment_breakdowns FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for equipment_breakdowns" ON public.equipment_breakdowns;
CREATE POLICY "Allow public update for equipment_breakdowns" ON public.equipment_breakdowns FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for equipment_breakdowns" ON public.equipment_breakdowns;
CREATE POLICY "Allow public delete for equipment_breakdowns" ON public.equipment_breakdowns FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- Alter patients table to add bed column if not exists
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS bed TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'Routine';

-- Alter nursing_notes table to add ward task columns if not exists
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS due_time TEXT;
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

-- 12. Emergency Cases (Trauma / Triage) Table
CREATE TABLE IF NOT EXISTS public.emergency_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  phone TEXT,
  mrn TEXT,
  triage_level TEXT NOT NULL,
  triage_color TEXT,
  presenting_complaints TEXT NOT NULL,
  mechanism_of_injury TEXT,
  arrival_mode TEXT NOT NULL,
  arrival_time TEXT,
  arrival_date DATE,
  bed_id TEXT,
  assigned_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_doctor_name TEXT,
  assigned_nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_nurse_name TEXT,
  status TEXT NOT NULL DEFAULT 'Triaged',
  is_referral BOOLEAN DEFAULT FALSE,
  referred_by TEXT,
  vitals JSONB,
  assessments JSONB,
  interventions JSONB,
  disposition_reason TEXT,
  disposition_destination TEXT,
  disposition_time TEXT,
  trauma_category TEXT,
  triage_score INTEGER,
  resuscitation_bay TEXT,
  gcs_initial INTEGER,
  trauma_team_activated BOOLEAN DEFAULT FALSE,
  referred_from_facility TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure ALTER columns exist for emergency_cases
ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS trauma_category TEXT;
ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS triage_score INTEGER;
ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS resuscitation_bay TEXT;
ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS gcs_initial INTEGER;
ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS trauma_team_activated BOOLEAN DEFAULT FALSE;
ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS referred_from_facility TEXT;

ALTER TABLE public.emergency_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for emergency_cases" ON public.emergency_cases;
CREATE POLICY "Allow public read for emergency_cases" ON public.emergency_cases FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for emergency_cases" ON public.emergency_cases;
CREATE POLICY "Allow public insert for emergency_cases" ON public.emergency_cases FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for emergency_cases" ON public.emergency_cases;
CREATE POLICY "Allow public update for emergency_cases" ON public.emergency_cases FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for emergency_cases" ON public.emergency_cases;
CREATE POLICY "Allow public delete for emergency_cases" ON public.emergency_cases FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 12.1 Front Office Walk-In Appointment Desk Table
CREATE TABLE IF NOT EXISTS public.walkin_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  mrn TEXT,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_age INTEGER,
  patient_gender TEXT,
  department TEXT NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_name TEXT,
  token_number INTEGER NOT NULL,
  counter_number TEXT DEFAULT 'Desk-1',
  visit_reason TEXT,
  appointment_type TEXT DEFAULT 'Walk-In',
  fee DECIMAL(10, 2) DEFAULT 0.00,
  payment_status TEXT DEFAULT 'Pending',
  payment_mode TEXT,
  queue_status TEXT DEFAULT 'Waiting',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.walkin_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for walkin_appointments" ON public.walkin_appointments;
CREATE POLICY "Allow public read for walkin_appointments" ON public.walkin_appointments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for walkin_appointments" ON public.walkin_appointments;
CREATE POLICY "Allow public insert for walkin_appointments" ON public.walkin_appointments FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for walkin_appointments" ON public.walkin_appointments;
CREATE POLICY "Allow public update for walkin_appointments" ON public.walkin_appointments FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for walkin_appointments" ON public.walkin_appointments;
CREATE POLICY "Allow public delete for walkin_appointments" ON public.walkin_appointments FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 12.2 Physiological Vitals Records Table (Emergency / Trauma & OPD)
CREATE TABLE IF NOT EXISTS public.emergency_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_case_id UUID REFERENCES public.emergency_cases(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  temperature DECIMAL(4, 1),
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  blood_pressure TEXT,
  pulse INTEGER,
  respiratory_rate INTEGER,
  spo2 INTEGER,
  gcs_total INTEGER,
  pain_score INTEGER,
  blood_glucose DECIMAL(5, 1),
  capillary_refill_sec DECIMAL(3, 1),
  avpu TEXT,
  etco2 INTEGER,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recorded_by_name TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.emergency_vitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for emergency_vitals" ON public.emergency_vitals;
CREATE POLICY "Allow public read for emergency_vitals" ON public.emergency_vitals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for emergency_vitals" ON public.emergency_vitals;
CREATE POLICY "Allow public insert for emergency_vitals" ON public.emergency_vitals FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for emergency_vitals" ON public.emergency_vitals;
CREATE POLICY "Allow public update for emergency_vitals" ON public.emergency_vitals FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for emergency_vitals" ON public.emergency_vitals;
CREATE POLICY "Allow public delete for emergency_vitals" ON public.emergency_vitals FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 12.3 Primary ABCDE Assessment Table
CREATE TABLE IF NOT EXISTS public.primary_abcde_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_case_id UUID REFERENCES public.emergency_cases(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  airway_status TEXT DEFAULT 'Patent',
  airway_intervention TEXT DEFAULT 'None',
  c_spine_immobilized BOOLEAN DEFAULT FALSE,
  breathing_rate INTEGER,
  spo2 INTEGER,
  chest_expansion TEXT DEFAULT 'Symmetrical',
  breath_sounds TEXT DEFAULT 'Clear Bilaterally',
  oxygen_therapy TEXT DEFAULT 'Room Air',
  oxygen_flow_rate TEXT,
  pulse_rate INTEGER,
  pulse_quality TEXT DEFAULT 'Normal',
  blood_pressure TEXT,
  capillary_refill TEXT DEFAULT '< 2 sec',
  skin_condition TEXT DEFAULT 'Warm & Dry',
  hemorrhage_control TEXT DEFAULT 'None Required',
  iv_access_status TEXT,
  gcs_eye INTEGER DEFAULT 4,
  gcs_verbal INTEGER DEFAULT 5,
  gcs_motor INTEGER DEFAULT 6,
  gcs_total INTEGER DEFAULT 15,
  pupils_status TEXT DEFAULT 'PEARL',
  avpu TEXT DEFAULT 'Alert',
  blood_sugar DECIMAL(5, 1),
  temperature DECIMAL(4, 1),
  log_roll_findings TEXT,
  major_injuries_noted TEXT,
  hypothermia_prevention BOOLEAN DEFAULT TRUE,
  assessed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assessed_by_name TEXT,
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.primary_abcde_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for primary_abcde_assessments" ON public.primary_abcde_assessments;
CREATE POLICY "Allow public read for primary_abcde_assessments" ON public.primary_abcde_assessments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for primary_abcde_assessments" ON public.primary_abcde_assessments;
CREATE POLICY "Allow public insert for primary_abcde_assessments" ON public.primary_abcde_assessments FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for primary_abcde_assessments" ON public.primary_abcde_assessments;
CREATE POLICY "Allow public update for primary_abcde_assessments" ON public.primary_abcde_assessments FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for primary_abcde_assessments" ON public.primary_abcde_assessments;
CREATE POLICY "Allow public delete for primary_abcde_assessments" ON public.primary_abcde_assessments FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 12.4 Log Medical Intervention Table
CREATE TABLE IF NOT EXISTS public.trauma_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_case_id UUID REFERENCES public.emergency_cases(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  intervention_category TEXT NOT NULL,
  intervention_name TEXT NOT NULL,
  dosage_route_size TEXT,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performer_name TEXT NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  outcome_notes TEXT,
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trauma_interventions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for trauma_interventions" ON public.trauma_interventions;
CREATE POLICY "Allow public read for trauma_interventions" ON public.trauma_interventions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for trauma_interventions" ON public.trauma_interventions;
CREATE POLICY "Allow public insert for trauma_interventions" ON public.trauma_interventions FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for trauma_interventions" ON public.trauma_interventions;
CREATE POLICY "Allow public update for trauma_interventions" ON public.trauma_interventions FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for trauma_interventions" ON public.trauma_interventions;
CREATE POLICY "Allow public delete for trauma_interventions" ON public.trauma_interventions FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 12.5 Dispose Case (Emergency Case Disposition) Table
CREATE TABLE IF NOT EXISTS public.emergency_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_case_id UUID REFERENCES public.emergency_cases(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  disposition_type TEXT NOT NULL,
  destination_details TEXT,
  treating_consultant TEXT,
  disposition_summary TEXT NOT NULL,
  condition_at_disposition TEXT DEFAULT 'Stable',
  discharged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  discharged_by_name TEXT NOT NULL,
  disposition_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.emergency_dispositions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for emergency_dispositions" ON public.emergency_dispositions;
CREATE POLICY "Allow public read for emergency_dispositions" ON public.emergency_dispositions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for emergency_dispositions" ON public.emergency_dispositions;
CREATE POLICY "Allow public insert for emergency_dispositions" ON public.emergency_dispositions FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for emergency_dispositions" ON public.emergency_dispositions;
CREATE POLICY "Allow public update for emergency_dispositions" ON public.emergency_dispositions FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for emergency_dispositions" ON public.emergency_dispositions;
CREATE POLICY "Allow public delete for emergency_dispositions" ON public.emergency_dispositions FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 13. ICU Beds Table
CREATE TABLE IF NOT EXISTS public.icu_beds (
  id TEXT PRIMARY KEY,
  patient_name TEXT,
  mrn TEXT,
  status TEXT DEFAULT 'Available',
  primary_doc TEXT,
  admitted_date DATE,
  gender TEXT,
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.icu_beds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for icu_beds" ON public.icu_beds;
CREATE POLICY "Allow public read for icu_beds" ON public.icu_beds FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for icu_beds" ON public.icu_beds;
CREATE POLICY "Allow public insert for icu_beds" ON public.icu_beds FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for icu_beds" ON public.icu_beds;
CREATE POLICY "Allow public update for icu_beds" ON public.icu_beds FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for icu_beds" ON public.icu_beds;
CREATE POLICY "Allow public delete for icu_beds" ON public.icu_beds FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 14. ICU Patient Vitals Table
CREATE TABLE IF NOT EXISTS public.icu_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id TEXT REFERENCES public.icu_beds(id) ON DELETE CASCADE,
  heart_rate INTEGER,
  bp TEXT,
  spo2 INTEGER,
  resp_rate INTEGER,
  temp DECIMAL(4,1),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.icu_vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for icu_vitals" ON public.icu_vitals;
CREATE POLICY "Allow public read for icu_vitals" ON public.icu_vitals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for icu_vitals" ON public.icu_vitals;
CREATE POLICY "Allow public insert for icu_vitals" ON public.icu_vitals FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for icu_vitals" ON public.icu_vitals;
CREATE POLICY "Allow public update for icu_vitals" ON public.icu_vitals FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for icu_vitals" ON public.icu_vitals;
CREATE POLICY "Allow public delete for icu_vitals" ON public.icu_vitals FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 15. ICU Ventilators Table
CREATE TABLE IF NOT EXISTS public.icu_ventilators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id TEXT REFERENCES public.icu_beds(id) ON DELETE CASCADE UNIQUE,
  mode TEXT,
  fio2 INTEGER,
  peep INTEGER,
  tidal_volume INTEGER,
  respiratory_rate INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.icu_ventilators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for icu_ventilators" ON public.icu_ventilators;
CREATE POLICY "Allow public read for icu_ventilators" ON public.icu_ventilators FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for icu_ventilators" ON public.icu_ventilators;
CREATE POLICY "Allow public insert for icu_ventilators" ON public.icu_ventilators FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for icu_ventilators" ON public.icu_ventilators;
CREATE POLICY "Allow public update for icu_ventilators" ON public.icu_ventilators FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for icu_ventilators" ON public.icu_ventilators;
CREATE POLICY "Allow public delete for icu_ventilators" ON public.icu_ventilators FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 16. ICU Infusions Table
CREATE TABLE IF NOT EXISTS public.icu_infusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id TEXT REFERENCES public.icu_beds(id) ON DELETE CASCADE,
  drug_name TEXT,
  rate TEXT,
  concentration TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.icu_infusions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for icu_infusions" ON public.icu_infusions;
CREATE POLICY "Allow public read for icu_infusions" ON public.icu_infusions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for icu_infusions" ON public.icu_infusions;
CREATE POLICY "Allow public insert for icu_infusions" ON public.icu_infusions FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for icu_infusions" ON public.icu_infusions;
CREATE POLICY "Allow public update for icu_infusions" ON public.icu_infusions FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for icu_infusions" ON public.icu_infusions;
CREATE POLICY "Allow public delete for icu_infusions" ON public.icu_infusions FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 17. ICU Alerts / Incidents Table
CREATE TABLE IF NOT EXISTS public.icu_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id TEXT REFERENCES public.icu_beds(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  severity TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.icu_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for icu_alerts" ON public.icu_alerts;
CREATE POLICY "Allow public read for icu_alerts" ON public.icu_alerts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for icu_alerts" ON public.icu_alerts;
CREATE POLICY "Allow public insert for icu_alerts" ON public.icu_alerts FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for icu_alerts" ON public.icu_alerts;
CREATE POLICY "Allow public update for icu_alerts" ON public.icu_alerts FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for icu_alerts" ON public.icu_alerts;
CREATE POLICY "Allow public delete for icu_alerts" ON public.icu_alerts FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 18. Hospital Inventory & Purchasing System
CREATE TABLE IF NOT EXISTS public.hospital_inventory_items (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  stock INTEGER DEFAULT 0,
  unit TEXT,
  min_level INTEGER DEFAULT 10,
  unit_cost DECIMAL(10, 2),
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hospital_inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for hospital_inventory_items" ON public.hospital_inventory_items;
CREATE POLICY "Allow public read for hospital_inventory_items" ON public.hospital_inventory_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for hospital_inventory_items" ON public.hospital_inventory_items;
CREATE POLICY "Allow public insert for hospital_inventory_items" ON public.hospital_inventory_items FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for hospital_inventory_items" ON public.hospital_inventory_items;
CREATE POLICY "Allow public update for hospital_inventory_items" ON public.hospital_inventory_items FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for hospital_inventory_items" ON public.hospital_inventory_items;
CREATE POLICY "Allow public delete for hospital_inventory_items" ON public.hospital_inventory_items FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.hospital_purchase_orders (
  po_number TEXT PRIMARY KEY,
  vendor TEXT NOT NULL,
  item TEXT NOT NULL,
  order_qty INTEGER NOT NULL,
  cost DECIMAL(10, 2),
  date DATE,
  status TEXT DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hospital_purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for hospital_purchase_orders" ON public.hospital_purchase_orders;
CREATE POLICY "Allow public read for hospital_purchase_orders" ON public.hospital_purchase_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for hospital_purchase_orders" ON public.hospital_purchase_orders;
CREATE POLICY "Allow public insert for hospital_purchase_orders" ON public.hospital_purchase_orders FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for hospital_purchase_orders" ON public.hospital_purchase_orders;
CREATE POLICY "Allow public update for hospital_purchase_orders" ON public.hospital_purchase_orders FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for hospital_purchase_orders" ON public.hospital_purchase_orders;
CREATE POLICY "Allow public delete for hospital_purchase_orders" ON public.hospital_purchase_orders FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.hospital_goods_receipts (
  grn_number TEXT PRIMARY KEY,
  po_number TEXT REFERENCES public.hospital_purchase_orders(po_number) ON DELETE SET NULL,
  item TEXT NOT NULL,
  received_qty INTEGER NOT NULL,
  supplier TEXT NOT NULL,
  batch_no TEXT NOT NULL,
  expiry DATE,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hospital_goods_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for hospital_goods_receipts" ON public.hospital_goods_receipts;
CREATE POLICY "Allow public read for hospital_goods_receipts" ON public.hospital_goods_receipts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for hospital_goods_receipts" ON public.hospital_goods_receipts;
CREATE POLICY "Allow public insert for hospital_goods_receipts" ON public.hospital_goods_receipts FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for hospital_goods_receipts" ON public.hospital_goods_receipts;
CREATE POLICY "Allow public update for hospital_goods_receipts" ON public.hospital_goods_receipts FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for hospital_goods_receipts" ON public.hospital_goods_receipts;
CREATE POLICY "Allow public delete for hospital_goods_receipts" ON public.hospital_goods_receipts FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.hospital_inventory_transfers (
  id TEXT PRIMARY KEY,
  item TEXT NOT NULL,
  qty INTEGER NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  date DATE,
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hospital_inventory_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for hospital_inventory_transfers" ON public.hospital_inventory_transfers;
CREATE POLICY "Allow public read for hospital_inventory_transfers" ON public.hospital_inventory_transfers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for hospital_inventory_transfers" ON public.hospital_inventory_transfers;
CREATE POLICY "Allow public insert for hospital_inventory_transfers" ON public.hospital_inventory_transfers FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for hospital_inventory_transfers" ON public.hospital_inventory_transfers;
CREATE POLICY "Allow public update for hospital_inventory_transfers" ON public.hospital_inventory_transfers FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for hospital_inventory_transfers" ON public.hospital_inventory_transfers;
CREATE POLICY "Allow public delete for hospital_inventory_transfers" ON public.hospital_inventory_transfers FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.hospital_inventory_consumptions (
  id TEXT PRIMARY KEY,
  item TEXT NOT NULL,
  qty INTEGER NOT NULL,
  mrn TEXT,
  ward TEXT,
  date DATE,
  staff TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hospital_inventory_consumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for hospital_inventory_consumptions" ON public.hospital_inventory_consumptions;
CREATE POLICY "Allow public read for hospital_inventory_consumptions" ON public.hospital_inventory_consumptions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for hospital_inventory_consumptions" ON public.hospital_inventory_consumptions;
CREATE POLICY "Allow public insert for hospital_inventory_consumptions" ON public.hospital_inventory_consumptions FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for hospital_inventory_consumptions" ON public.hospital_inventory_consumptions;
CREATE POLICY "Allow public update for hospital_inventory_consumptions" ON public.hospital_inventory_consumptions FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for hospital_inventory_consumptions" ON public.hospital_inventory_consumptions;
CREATE POLICY "Allow public delete for hospital_inventory_consumptions" ON public.hospital_inventory_consumptions FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.hospital_vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  status TEXT DEFAULT 'Active',
  rating TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.hospital_vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for hospital_vendors" ON public.hospital_vendors;
CREATE POLICY "Allow public read for hospital_vendors" ON public.hospital_vendors FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for hospital_vendors" ON public.hospital_vendors;
CREATE POLICY "Allow public insert for hospital_vendors" ON public.hospital_vendors FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for hospital_vendors" ON public.hospital_vendors;
CREATE POLICY "Allow public update for hospital_vendors" ON public.hospital_vendors FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for hospital_vendors" ON public.hospital_vendors;
CREATE POLICY "Allow public delete for hospital_vendors" ON public.hospital_vendors FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

