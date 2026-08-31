-- Supabase SQL Schema for Hospital Management System
-- Run this in your Supabase SQL Editor
--
-- === MIGRATION/UPDATE FOR INSTALLED DATABASES ===
-- If you already ran this schema previously, please execute the following statements to update patients, invoices, profiles, staff and clinical tables:
-- ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS attending_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT;
-- ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_remarks TEXT;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10, 2) DEFAULT 0.00;
-- ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10, 2) DEFAULT 0.00;
-- ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS trauma_category TEXT;
-- ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS triage_score INTEGER;
-- ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS resuscitation_bay TEXT;
-- ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS gcs_initial INTEGER;
-- ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS trauma_team_activated BOOLEAN DEFAULT FALSE;
-- ALTER TABLE public.emergency_cases ADD COLUMN IF NOT EXISTS referred_from_facility TEXT;
-- CREATE TABLE IF NOT EXISTS public.mrd_records (...);
-- CREATE TABLE IF NOT EXISTS public.ipd_medication_orders (...);
-- CREATE TABLE IF NOT EXISTS public.ipd_iv_fluids (...);
-- CREATE TABLE IF NOT EXISTS public.counter_payments (...);
-- CREATE TABLE IF NOT EXISTS public.advance_payments (...);
-- ===============================================

-- 1. Profiles / Users (Optional reference to auth.users handled manually without FK block constraint)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'SURGEON', 'NURSE', 'RECEPTIONIST', 'ACCOUNTANT', 'LAB_TECHNICIAN', 'PHARMACIST')),
  department TEXT,
  designation TEXT,
  phone TEXT,
  degree TEXT,
  specialization TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'ACTIVE',
  consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop the foreign key constraint if it exists to allow inserting staff/profiles seamlessly from the client side
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 1.1 Staff (Dedicated table for staff employee records synchronized with profiles)
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  department TEXT,
  designation TEXT,
  phone TEXT,
  degree TEXT,
  specialization TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'ACTIVE',
  consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Functions and Triggers to synchronize profiles and staff bidirectionally
CREATE OR REPLACE FUNCTION public.sync_profiles_to_staff()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO public.staff (id, name, email, role, department, designation, phone, degree, specialization, avatar_url, status, consultation_fee, created_at, updated_at)
  VALUES (NEW.id, NEW.name, NEW.email, NEW.role, NEW.department, NEW.designation, NEW.phone, NEW.degree, NEW.specialization, NEW.avatar_url, NEW.status, NEW.consultation_fee, NEW.created_at, NEW.updated_at)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    designation = EXCLUDED.designation,
    phone = EXCLUDED.phone,
    degree = EXCLUDED.degree,
    specialization = EXCLUDED.specialization,
    avatar_url = EXCLUDED.avatar_url,
    status = EXCLUDED.status,
    consultation_fee = EXCLUDED.consultation_fee,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_profiles_to_staff_trigger ON public.profiles;
CREATE TRIGGER sync_profiles_to_staff_trigger
AFTER INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_to_staff();

-- Revoke execute from public roles as it is not meant to be callable by users
REVOKE EXECUTE ON FUNCTION public.sync_profiles_to_staff() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_staff_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, name, email, role, department, designation, phone, degree, specialization, avatar_url, status, consultation_fee, created_at, updated_at)
    VALUES (NEW.id, NEW.name, NEW.email, NEW.role, NEW.department, NEW.designation, NEW.phone, NEW.degree, NEW.specialization, NEW.avatar_url, NEW.status, NEW.consultation_fee, NEW.created_at, NEW.updated_at)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      department = EXCLUDED.department,
      designation = EXCLUDED.designation,
      phone = EXCLUDED.phone,
      degree = EXCLUDED.degree,
      specialization = EXCLUDED.specialization,
      avatar_url = EXCLUDED.avatar_url,
      status = EXCLUDED.status,
      consultation_fee = EXCLUDED.consultation_fee,
      updated_at = EXCLUDED.updated_at;
  EXCEPTION
    WHEN OTHERS THEN
      -- Handle gracefully if profiles table constraint (e.g. auth.users reference) throws an error
      NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_staff_to_profiles_trigger ON public.staff;
CREATE TRIGGER sync_staff_to_profiles_trigger
AFTER INSERT OR UPDATE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.sync_staff_to_profiles();

-- Revoke execute from public roles as it is not meant to be callable by users
REVOKE EXECUTE ON FUNCTION public.sync_staff_to_profiles() FROM PUBLIC, anon, authenticated;

-- Sync deletes
CREATE OR REPLACE FUNCTION public.sync_profiles_to_staff_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.staff WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_profiles_to_staff_delete_trigger ON public.profiles;
CREATE TRIGGER sync_profiles_to_staff_delete_trigger
AFTER DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profiles_to_staff_delete();

-- Revoke execute from public roles as it is not meant to be callable by users
REVOKE EXECUTE ON FUNCTION public.sync_profiles_to_staff_delete() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_staff_to_profiles_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_staff_to_profiles_delete_trigger ON public.staff;
CREATE TRIGGER sync_staff_to_profiles_delete_trigger
AFTER DELETE ON public.staff
FOR EACH ROW EXECUTE FUNCTION public.sync_staff_to_profiles_delete();

-- Revoke execute from public roles as it is not meant to be callable by users
REVOKE EXECUTE ON FUNCTION public.sync_staff_to_profiles_delete() FROM PUBLIC, anon, authenticated;

-- 2. Hospital Information
CREATE TABLE IF NOT EXISTS public.hospital_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  tagline TEXT,
  registration_number TEXT,
  tax_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.0.1 Tax Slabs & GST Configuration
CREATE TABLE IF NOT EXISTS public.tax_slabs (
  id TEXT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  type VARCHAR(50) NOT NULL DEFAULT 'GST',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults standard GST Slabs
INSERT INTO public.tax_slabs (id, name, rate, type, description, is_active) VALUES
('tax-ex', 'GST Zero (Exempt)', 0.00, 'GST', 'Medical services and select life-saving medicines', true),
('tax-5', 'GST 5%', 5.00, 'GST', 'Standard pharmaceutical drugs, injectables, and diagnostic test kits', true),
('tax-12', 'GST 12%', 12.00, 'GST', 'Syringes, medical instruments, and specialised diabetic medicines', true),
('tax-18', 'GST 18%', 18.00, 'GST', 'Capital healthcare machinery, monitors, and dental care fixtures', true),
('tax-28', 'GST 28%', 28.00, 'GST', 'Aesthetic improvements and luxury cosmetic treatments', true)
ON CONFLICT (id) DO NOTHING;

-- 2.0.2 IPD Bed Rates Configuration
CREATE TABLE IF NOT EXISTS public.bed_rates (
  type VARCHAR(100) PRIMARY KEY,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.bed_rates (type, rate) VALUES
('General', 1500.00),
('Semi-Private', 3000.00),
('Private', 5000.00),
('ICU', 8000.00),
('Maternity', 4000.00)
ON CONFLICT (type) DO NOTHING;

-- 2.0.3 OT Rates Configuration
CREATE TABLE IF NOT EXISTS public.ot_rates (
  type VARCHAR(100) PRIMARY KEY,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.ot_rates (type, rate) VALUES
('Minor', 5000.00),
('Major', 15000.00),
('Cardiac', 45000.00),
('Neuro', 55000.00)
ON CONFLICT (type) DO NOTHING;

-- 2.0.4 Material Rates Configuration
CREATE TABLE IF NOT EXISTS public.material_rates (
  name VARCHAR(255) PRIMARY KEY,
  price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  category VARCHAR(100) NOT NULL DEFAULT 'Disposable',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.material_rates (name, price, category) VALUES
('Surgical Gloves', 150.00, 'Disposable'),
('Syringes (Pack of 10)', 100.00, 'Disposable'),
('IV Fluid Set', 450.00, 'Disposable'),
('Cotton / Bandage Kit', 200.00, 'Material'),
('Disinfectant Solution', 350.00, 'Material'),
('Catheter Set', 850.00, 'Disposable')
ON CONFLICT (name) DO NOTHING;

-- 2.0.5 OPD consultation and registration charges Configuration
CREATE TABLE IF NOT EXISTS public.opd_charges (
  key VARCHAR(50) PRIMARY KEY,
  value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.opd_charges (key, value) VALUES
('reg', 200.00),
('appt', 200.00),
('consult', 500.00)
ON CONFLICT (key) DO NOTHING;

-- 2.1 Pharmacy & Billing Settings
CREATE TABLE IF NOT EXISTS public.pharmacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT,
  pharmacy_name TEXT,
  address TEXT,
  phone TEXT,
  tagline TEXT,
  gstin TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_acc_no TEXT,
  bank_ifsc TEXT,
  upi_id TEXT,
  terms_and_conditions TEXT[] DEFAULT ARRAY[
    'Subject to Maharashtra Jurisdiction.',
    'Our Responsibility Ceases as soon as goods leave our Premises.',
    'Goods once sold will not be taken back.',
    'Delivery Ex-Premises.'
  ],
  additional_footer TEXT DEFAULT 'Thanks for your order! We look forward to working with you again soon.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  head_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.1 Specialties
CREATE TABLE IF NOT EXISTS public.specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Patients
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT UNIQUE NOT NULL, 
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  dob DATE,
  age INTEGER,
  gender TEXT,
  blood_group TEXT,
  address TEXT,
  guardian_name TEXT,
  mother_name TEXT,
  mother_phone TEXT,
  father_name TEXT,
  father_phone TEXT,
  husband_name TEXT,
  husband_phone TEXT,
  tpa_id TEXT,
  tpa_validity DATE,
  status TEXT DEFAULT 'Active',
  registration_type TEXT DEFAULT 'OPD',
  needs_admission BOOLEAN DEFAULT FALSE,
  attending_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_referral BOOLEAN DEFAULT FALSE,
  referred_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Beds & Wards
CREATE TABLE IF NOT EXISTS public.beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_number TEXT NOT NULL,
  ward TEXT NOT NULL,
  bed_type TEXT NOT NULL,
  status TEXT DEFAULT 'Available',
  daily_rate DECIMAL(10, 2) DEFAULT 0.00,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Appointments (OPD)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  token_number INTEGER,
  urgency TEXT DEFAULT 'Routine',
  status TEXT DEFAULT 'Scheduled',
  fee DECIMAL(10, 2) DEFAULT 0.00,
  payment_status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.1 Quick Registrations (Maintains separate database table for Quick Patient Registrations)
CREATE TABLE IF NOT EXISTS public.quick_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  gender TEXT,
  facility TEXT DEFAULT 'OPD', -- OPD, Lab, Pharmacy, Radiology, Emergency
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 Live Queue (Maintains separate database table for the Live Consultation Queue)
CREATE TABLE IF NOT EXISTS public.live_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number INTEGER,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Waiting', -- Waiting, In-Consultation, Completed, Absent
  urgency TEXT DEFAULT 'Routine',
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. IPD Admissions
CREATE TABLE IF NOT EXISTS public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  bed_id UUID REFERENCES public.beds(id),
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admission_date TIMESTAMPTZ DEFAULT NOW(),
  discharge_date TIMESTAMPTZ,
  reason TEXT,
  initial_deposit DECIMAL(10, 2) DEFAULT 0.00,
  status TEXT DEFAULT 'Admitted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Clinical Notes & Vitals
CREATE TABLE IF NOT EXISTS public.patient_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  temperature DECIMAL(5, 2),
  blood_pressure TEXT,
  pulse INTEGER,
  respiration INTEGER,
  spo2 INTEGER,
  weight DECIMAL(5, 2),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note_type TEXT CHECK (note_type IN ('DOCTOR', 'NURSE')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.1 Prescriptions
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_name TEXT,
  prescription_date TIMESTAMPTZ DEFAULT NOW(),
  diagnosis TEXT,
  advice TEXT,
  medicines JSONB DEFAULT '[]'::jsonb,
  medications JSONB DEFAULT '[]'::jsonb,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Investigations & Lab Tests
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT, 
  price DECIMAL(10, 2) DEFAULT 0.00,
  department_id UUID REFERENCES public.departments(id)
);

CREATE TABLE IF NOT EXISTS public.test_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.lab_tests(id),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Pending',
  results JSONB,
  report_url TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 10. Pharmacy Inventory
CREATE TABLE IF NOT EXISTS public.pharmacy_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 10,
  min_stock_level INTEGER DEFAULT 10, -- Alias for UI consistency
  unit TEXT, -- e.g., 'Tablets', 'Bottle'
  expiry_date DATE,
  purchase_price DECIMAL(10, 2),
  sale_price DECIMAL(10, 2),
  mrp DECIMAL(10, 2),
  tax_percentage DECIMAL(5, 2) DEFAULT 0.00,
  hsn_code TEXT,
  batch_number TEXT,
  rack_number TEXT,
  manufacturer TEXT,
  composition TEXT, -- e.g., 'Amoxicillin + Clavulanic Acid'
  is_loose_sale_enabled BOOLEAN DEFAULT FALSE,
  units_per_strip INTEGER DEFAULT 10,
  loose_selling_price DECIMAL(10, 2) DEFAULT 0.00,
  loose_stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.1 Pharmacy Purchases (Tracking Stock Inflow)
CREATE TABLE IF NOT EXISTS public.pharmacy_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.pharmacy_items(id),
  supplier_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  purchase_price DECIMAL(10, 2) NOT NULL,
  expiry_date DATE,
  invoice_number TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.pharmacy_items(id),
  transaction_type TEXT CHECK (transaction_type IN ('PURCHASE', 'SALE', 'ADJUSTMENT', 'EXPIRED')),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  reference_id TEXT,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Billing & Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  payable_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0.00,
  payment_status TEXT DEFAULT 'Unpaid',
  payment_method TEXT,
  payment_reference TEXT,
  payment_remarks TEXT,
  tpa_approval_status TEXT,
  issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  tax_percentage DECIMAL(5, 2) DEFAULT 0.00,
  category TEXT,
  source_type TEXT, -- e.g., 'LAB_TEST', 'PHARMACY_ITEM', 'OT_PROCEDURE', 'BED_CHARGE'
  source_id UUID -- Link to the specific record in lab_tests, pharmacy_items, etc.
);

-- 11.1 Insurance Claims
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  policy_no TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  tpa_name TEXT,
  insurance_limit DECIMAL(10, 2) DEFAULT 0.00,
  approved_amount DECIMAL(10, 2) DEFAULT 0.00,
  claim_date DATE,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11.2 Discharge Summaries
CREATE TABLE IF NOT EXISTS public.discharge_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  discharge_type TEXT,
  follow_up_date DATE,
  medications TEXT,
  clinical_summary TEXT,
  discharge_date TIMESTAMPTZ DEFAULT NOW(),
  discharge_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  paid_to TEXT,
  status TEXT DEFAULT 'Paid',
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13.1 OT Rooms (Operation Theatre rooms)
CREATE TABLE IF NOT EXISTS public.ot_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'Available',
  type TEXT DEFAULT 'Major',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. OT Management (Operation Theater)
CREATE TABLE IF NOT EXISTS public.ot_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.ot_rooms(id) ON DELETE SET NULL,
  ot_rooms_id UUID REFERENCES public.ot_rooms(id) ON DELETE SET NULL,
  surgeon_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  anesthetist_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  procedure_name TEXT,
  operation_name TEXT,
  surgery_date DATE,
  scheduled_date DATE,
  surgery_time TIME,
  scheduled_time TIME,
  ot_number TEXT,
  status TEXT DEFAULT 'Scheduled', -- Scheduled, In-Progress, Completed, Cancelled
  notes TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Nursing Observations (Specifically for Nursing Station)
CREATE TABLE IF NOT EXISTS public.nursing_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  alert_level TEXT DEFAULT 'normal' CHECK (alert_level IN ('normal', 'moderate', 'high')),
  is_medication_intake BOOLEAN DEFAULT FALSE,
  is_patient_request BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15.1 Nurse Shifts
CREATE TABLE IF NOT EXISTS public.nurse_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  shift_type TEXT NOT NULL, -- Morning, Evening, Night
  ward TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Lab Test Groups (Master Setup)
CREATE TABLE IF NOT EXISTS public.lab_test_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT CHECK (category IN ('Pathology', 'Radiology')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Enhanced Lab Tests (Master Setup)
-- Note: Reference columns added to existing lab_tests handle the UI fields for Master Setup
ALTER TABLE public.lab_tests ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.lab_test_groups(id);
ALTER TABLE public.lab_tests ADD COLUMN IF NOT EXISTS unit TEXT; -- e.g., g/dL
ALTER TABLE public.lab_tests ADD COLUMN IF NOT EXISTS reference_range TEXT; -- e.g., 13.5 - 17.5
ALTER TABLE public.lab_tests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 18. Lab Packages (Master Setup)
CREATE TABLE IF NOT EXISTS public.lab_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lab_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES public.lab_packages(id) ON DELETE CASCADE,
  test_id UUID REFERENCES public.lab_tests(id) ON DELETE CASCADE
);

-- 19. Maternity Records (Birth & Delivery)
CREATE TABLE IF NOT EXISTS public.birth_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mother_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  admission_id UUID REFERENCES public.admissions(id), -- Link to specific ward stay
  delivery_date DATE NOT NULL,
  delivery_time TIME NOT NULL,
  baby_gender TEXT, -- 'male', 'female'
  baby_weight DECIMAL(5, 2), -- kg
  delivery_type TEXT, -- 'normal', 'c-section', etc.
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure admission_id exists for existing tables
ALTER TABLE public.birth_records ADD COLUMN IF NOT EXISTS admission_id UUID REFERENCES public.admissions(id);

-- 20. External Reports (Uploaded from other centers)
CREATE TABLE IF NOT EXISTS public.external_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_type TEXT, -- PDF, Image, etc.
  file_url TEXT NOT NULL,
  source_center TEXT, -- Name of the external laboratory/center
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Radiology Records
CREATE TABLE IF NOT EXISTS public.radiology_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Ordered',
  result_notes TEXT,
  report_url TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Maternity Deliveries
CREATE TABLE IF NOT EXISTS public.maternity_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  delivery_time TIME NOT NULL,
  delivery_type TEXT, -- Normal, C-Section, etc.
  surgeon_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Maternity Newborns
CREATE TABLE IF NOT EXISTS public.maternity_newborns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mother_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  birth_weight DECIMAL(5, 2), -- kg
  gender TEXT, -- Male, Female
  birth_date_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Nursing Handovers
CREATE TABLE IF NOT EXISTS public.nursing_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  ward TEXT,
  outgoing_nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  incoming_nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  patient_status TEXT,
  remarkable_events TEXT,
  instructions TEXT,
  handover_date DATE,
  shift TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ot_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursing_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maternity_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maternity_newborns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursing_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discharge_summaries ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Allow authenticated read/write access for internal staff operations)

-- Profiles Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
CREATE POLICY "Enable read access for authenticated users" ON public.profiles FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
CREATE POLICY "Enable insert for authenticated users" ON public.profiles FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;
CREATE POLICY "Enable update for authenticated users" ON public.profiles FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.profiles;
CREATE POLICY "Enable delete for authenticated users" ON public.profiles FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Hospital Info Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.hospital_info;
CREATE POLICY "Enable read access for authenticated users" ON public.hospital_info FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.hospital_info;
CREATE POLICY "Enable insert for authenticated users" ON public.hospital_info FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.hospital_info;
CREATE POLICY "Enable update for authenticated users" ON public.hospital_info FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.hospital_info;
CREATE POLICY "Enable delete for authenticated users" ON public.hospital_info FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Departments Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.departments;
CREATE POLICY "Enable read access for authenticated users" ON public.departments FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.departments;
CREATE POLICY "Enable insert for authenticated users" ON public.departments FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.departments;
CREATE POLICY "Enable update for authenticated users" ON public.departments FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.departments;
CREATE POLICY "Enable delete for authenticated users" ON public.departments FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Patients Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.patients;
CREATE POLICY "Enable read access for authenticated users" ON public.patients FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.patients;
CREATE POLICY "Enable insert for authenticated users" ON public.patients FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.patients;
CREATE POLICY "Enable update for authenticated users" ON public.patients FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.patients;
CREATE POLICY "Enable delete for authenticated users" ON public.patients FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Beds Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.beds;
CREATE POLICY "Enable read access for authenticated users" ON public.beds FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.beds;
CREATE POLICY "Enable insert for authenticated users" ON public.beds FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.beds;
CREATE POLICY "Enable update for authenticated users" ON public.beds FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.beds;
CREATE POLICY "Enable delete for authenticated users" ON public.beds FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Appointments Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.appointments;
CREATE POLICY "Enable read access for authenticated users" ON public.appointments FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.appointments;
CREATE POLICY "Enable insert for authenticated users" ON public.appointments FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.appointments;
CREATE POLICY "Enable update for authenticated users" ON public.appointments FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.appointments;
CREATE POLICY "Enable delete for authenticated users" ON public.appointments FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Admissions Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.admissions;
CREATE POLICY "Enable read access for authenticated users" ON public.admissions FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.admissions;
CREATE POLICY "Enable insert for authenticated users" ON public.admissions FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.admissions;
CREATE POLICY "Enable update for authenticated users" ON public.admissions FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.admissions;
CREATE POLICY "Enable delete for authenticated users" ON public.admissions FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Patient Vitals Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.patient_vitals;
CREATE POLICY "Enable read access for authenticated users" ON public.patient_vitals FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.patient_vitals;
CREATE POLICY "Enable insert for authenticated users" ON public.patient_vitals FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.patient_vitals;
CREATE POLICY "Enable update for authenticated users" ON public.patient_vitals FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.patient_vitals;
CREATE POLICY "Enable delete for authenticated users" ON public.patient_vitals FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Clinical Notes Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clinical_notes;
CREATE POLICY "Enable read access for authenticated users" ON public.clinical_notes FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clinical_notes;
CREATE POLICY "Enable insert for authenticated users" ON public.clinical_notes FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clinical_notes;
CREATE POLICY "Enable update for authenticated users" ON public.clinical_notes FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clinical_notes;
CREATE POLICY "Enable delete for authenticated users" ON public.clinical_notes FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Prescriptions Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.prescriptions;
CREATE POLICY "Enable read access for authenticated users" ON public.prescriptions FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.prescriptions;
CREATE POLICY "Enable insert for authenticated users" ON public.prescriptions FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.prescriptions;
CREATE POLICY "Enable update for authenticated users" ON public.prescriptions FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.prescriptions;
CREATE POLICY "Enable delete for authenticated users" ON public.prescriptions FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Lab Tests Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lab_tests;
CREATE POLICY "Enable read access for authenticated users" ON public.lab_tests FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.lab_tests;
CREATE POLICY "Enable insert for authenticated users" ON public.lab_tests FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lab_tests;
CREATE POLICY "Enable update for authenticated users" ON public.lab_tests FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.lab_tests;
CREATE POLICY "Enable delete for authenticated users" ON public.lab_tests FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Test Requests Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.test_requests;
CREATE POLICY "Enable read access for authenticated users" ON public.test_requests FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.test_requests;
CREATE POLICY "Enable insert for authenticated users" ON public.test_requests FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.test_requests;
CREATE POLICY "Enable update for authenticated users" ON public.test_requests FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.test_requests;
CREATE POLICY "Enable delete for authenticated users" ON public.test_requests FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Pharmacy Items Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.pharmacy_items;
CREATE POLICY "Enable read access for authenticated users" ON public.pharmacy_items FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.pharmacy_items;
CREATE POLICY "Enable insert for authenticated users" ON public.pharmacy_items FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.pharmacy_items;
CREATE POLICY "Enable update for authenticated users" ON public.pharmacy_items FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.pharmacy_items;
CREATE POLICY "Enable delete for authenticated users" ON public.pharmacy_items FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Pharmacy Purchases Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.pharmacy_purchases;
CREATE POLICY "Enable read access for authenticated users" ON public.pharmacy_purchases FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.pharmacy_purchases;
CREATE POLICY "Enable insert for authenticated users" ON public.pharmacy_purchases FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.pharmacy_purchases;
CREATE POLICY "Enable update for authenticated users" ON public.pharmacy_purchases FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.pharmacy_purchases;
CREATE POLICY "Enable delete for authenticated users" ON public.pharmacy_purchases FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Inventory Transactions Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.inventory_transactions;
CREATE POLICY "Enable read access for authenticated users" ON public.inventory_transactions FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.inventory_transactions;
CREATE POLICY "Enable insert for authenticated users" ON public.inventory_transactions FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.inventory_transactions;
CREATE POLICY "Enable update for authenticated users" ON public.inventory_transactions FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.inventory_transactions;
CREATE POLICY "Enable delete for authenticated users" ON public.inventory_transactions FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Invoices Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.invoices;
CREATE POLICY "Enable read access for authenticated users" ON public.invoices FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.invoices;
CREATE POLICY "Enable insert for authenticated users" ON public.invoices FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.invoices;
CREATE POLICY "Enable update for authenticated users" ON public.invoices FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.invoices;
CREATE POLICY "Enable delete for authenticated users" ON public.invoices FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Invoice Items Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.invoice_items;
CREATE POLICY "Enable read access for authenticated users" ON public.invoice_items FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.invoice_items;
CREATE POLICY "Enable insert for authenticated users" ON public.invoice_items FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.invoice_items;
CREATE POLICY "Enable update for authenticated users" ON public.invoice_items FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.invoice_items;
CREATE POLICY "Enable delete for authenticated users" ON public.invoice_items FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Insurance Claims Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.insurance_claims;
CREATE POLICY "Enable read access for authenticated users" ON public.insurance_claims FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.insurance_claims;
CREATE POLICY "Enable insert for authenticated users" ON public.insurance_claims FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.insurance_claims;
CREATE POLICY "Enable update for authenticated users" ON public.insurance_claims FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.insurance_claims;
CREATE POLICY "Enable delete for authenticated users" ON public.insurance_claims FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Expenses Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.expenses;
CREATE POLICY "Enable read access for authenticated users" ON public.expenses FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.expenses;
CREATE POLICY "Enable insert for authenticated users" ON public.expenses FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.expenses;
CREATE POLICY "Enable update for authenticated users" ON public.expenses FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.expenses;
CREATE POLICY "Enable delete for authenticated users" ON public.expenses FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Audit Logs Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.audit_logs;
CREATE POLICY "Enable read access for authenticated users" ON public.audit_logs FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.audit_logs;
CREATE POLICY "Enable update for authenticated users" ON public.audit_logs FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.audit_logs;
CREATE POLICY "Enable delete for authenticated users" ON public.audit_logs FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- OT Rooms Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.ot_rooms;
CREATE POLICY "Enable read access for authenticated users" ON public.ot_rooms FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.ot_rooms;
CREATE POLICY "Enable insert for authenticated users" ON public.ot_rooms FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.ot_rooms;
CREATE POLICY "Enable update for authenticated users" ON public.ot_rooms FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.ot_rooms;
CREATE POLICY "Enable delete for authenticated users" ON public.ot_rooms FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- OT Schedules Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.ot_schedules;
CREATE POLICY "Enable read access for authenticated users" ON public.ot_schedules FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.ot_schedules;
CREATE POLICY "Enable insert for authenticated users" ON public.ot_schedules FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.ot_schedules;
CREATE POLICY "Enable update for authenticated users" ON public.ot_schedules FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.ot_schedules;
CREATE POLICY "Enable delete for authenticated users" ON public.ot_schedules FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Nursing Notes Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.nursing_notes;
CREATE POLICY "Enable read access for authenticated users" ON public.nursing_notes FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.nursing_notes;
CREATE POLICY "Enable insert for authenticated users" ON public.nursing_notes FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.nursing_notes;
CREATE POLICY "Enable update for authenticated users" ON public.nursing_notes FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.nursing_notes;
CREATE POLICY "Enable delete for authenticated users" ON public.nursing_notes FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Nurse Shifts Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.nurse_shifts;
CREATE POLICY "Enable read access for authenticated users" ON public.nurse_shifts FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.nurse_shifts;
CREATE POLICY "Enable insert for authenticated users" ON public.nurse_shifts FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.nurse_shifts;
CREATE POLICY "Enable update for authenticated users" ON public.nurse_shifts FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.nurse_shifts;
CREATE POLICY "Enable delete for authenticated users" ON public.nurse_shifts FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Lab Test Groups Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lab_test_groups;
CREATE POLICY "Enable read access for authenticated users" ON public.lab_test_groups FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.lab_test_groups;
CREATE POLICY "Enable insert for authenticated users" ON public.lab_test_groups FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lab_test_groups;
CREATE POLICY "Enable update for authenticated users" ON public.lab_test_groups FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.lab_test_groups;
CREATE POLICY "Enable delete for authenticated users" ON public.lab_test_groups FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Lab Packages Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lab_packages;
CREATE POLICY "Enable read access for authenticated users" ON public.lab_packages FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.lab_packages;
CREATE POLICY "Enable insert for authenticated users" ON public.lab_packages FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lab_packages;
CREATE POLICY "Enable update for authenticated users" ON public.lab_packages FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.lab_packages;
CREATE POLICY "Enable delete for authenticated users" ON public.lab_packages FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Lab Package Items Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.lab_package_items;
CREATE POLICY "Enable read access for authenticated users" ON public.lab_package_items FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.lab_package_items;
CREATE POLICY "Enable insert for authenticated users" ON public.lab_package_items FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lab_package_items;
CREATE POLICY "Enable update for authenticated users" ON public.lab_package_items FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.lab_package_items;
CREATE POLICY "Enable delete for authenticated users" ON public.lab_package_items FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Birth Records Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.birth_records;
CREATE POLICY "Enable read access for authenticated users" ON public.birth_records FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.birth_records;
CREATE POLICY "Enable insert for authenticated users" ON public.birth_records FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.birth_records;
CREATE POLICY "Enable update for authenticated users" ON public.birth_records FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.birth_records;
CREATE POLICY "Enable delete for authenticated users" ON public.birth_records FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- External Reports Policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.external_reports;
CREATE POLICY "Enable read access for authenticated users" ON public.external_reports FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.external_reports;
CREATE POLICY "Enable insert for authenticated users" ON public.external_reports FOR INSERT TO authenticated, anon WITH CHECK (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.external_reports;
CREATE POLICY "Enable update for authenticated users" ON public.external_reports FOR UPDATE TO authenticated, anon USING (auth.role() IS NOT NULL);
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.external_reports;
CREATE POLICY "Enable delete for authenticated users" ON public.external_reports FOR DELETE TO authenticated, anon USING (auth.role() IS NOT NULL);

-- Functions and Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql' SET search_path = '';

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_modtime ON public.patients;
CREATE TRIGGER update_patients_modtime BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_pharmacy_items_modtime ON public.pharmacy_items;
CREATE TRIGGER update_pharmacy_items_modtime BEFORE UPDATE ON public.pharmacy_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_modtime ON public.invoices;
CREATE TRIGGER update_invoices_modtime BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_ot_schedules_modtime ON public.ot_schedules;
CREATE TRIGGER update_ot_schedules_modtime BEFORE UPDATE ON public.ot_schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_nursing_notes_modtime ON public.nursing_notes;
CREATE TRIGGER update_nursing_notes_modtime BEFORE UPDATE ON public.nursing_notes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_tests_modtime ON public.lab_tests;
CREATE TRIGGER update_lab_tests_modtime BEFORE UPDATE ON public.lab_tests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_packages_modtime ON public.lab_packages;
CREATE TRIGGER update_lab_packages_modtime BEFORE UPDATE ON public.lab_packages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_birth_records_modtime ON public.birth_records;
CREATE TRIGGER update_birth_records_modtime BEFORE UPDATE ON public.birth_records FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_external_reports_modtime ON public.external_reports;
CREATE TRIGGER update_external_reports_modtime BEFORE UPDATE ON public.external_reports FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_vitals_modtime ON public.patient_vitals;
CREATE TRIGGER update_patient_vitals_modtime BEFORE UPDATE ON public.patient_vitals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_radiology_records_modtime ON public.radiology_records;
CREATE TRIGGER update_radiology_records_modtime BEFORE UPDATE ON public.radiology_records FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_maternity_deliveries_modtime ON public.maternity_deliveries;
CREATE TRIGGER update_maternity_deliveries_modtime BEFORE UPDATE ON public.maternity_deliveries FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_maternity_newborns_modtime ON public.maternity_newborns;
CREATE TRIGGER update_maternity_newborns_modtime BEFORE UPDATE ON public.maternity_newborns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_nursing_handovers_modtime ON public.nursing_handovers;
CREATE TRIGGER update_nursing_handovers_modtime BEFORE UPDATE ON public.nursing_handovers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_discharge_summaries_modtime ON public.discharge_summaries;
CREATE TRIGGER update_discharge_summaries_modtime BEFORE UPDATE ON public.discharge_summaries FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 15.2 Automated Maternity Sync: Inserts a newborn automatically when a delivery is recorded
CREATE OR REPLACE FUNCTION public.sync_delivery_to_newborn()
RETURNS TRIGGER AS $$
DECLARE
  weight_val DECIMAL(5,2) := 3.2;
  gender_val TEXT := 'Male';
  weight_match TEXT;
  gender_match TEXT;
BEGIN
  -- Parse weight and gender from notes if present
  IF NEW.notes IS NOT NULL THEN
    weight_match := substring(NEW.notes from '(?i)weight:\s*([0-9.]+)');
    gender_match := substring(NEW.notes from '(?i)gender:\s*(\w+)');
    IF weight_match IS NOT NULL THEN
      weight_val := weight_match::DECIMAL(5,2);
    END IF;
    IF gender_match IS NOT NULL THEN
      gender_val := initcap(gender_match);
    END IF;
  END IF;

  INSERT INTO public.maternity_newborns (mother_id, birth_weight, gender, birth_date_time)
  VALUES (
    NEW.patient_id, 
    weight_val, 
    gender_val, 
    (NEW.delivery_date::text || 'T' || NEW.delivery_time::text)::timestamptz
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public roles as it is not meant to be callable by users
REVOKE EXECUTE ON FUNCTION public.sync_delivery_to_newborn() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_delivery_to_newborn_trigger ON public.maternity_deliveries;
CREATE TRIGGER sync_delivery_to_newborn_trigger
AFTER INSERT ON public.maternity_deliveries
FOR EACH ROW EXECUTE FUNCTION public.sync_delivery_to_newborn();
