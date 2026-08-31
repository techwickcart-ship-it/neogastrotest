-- OT Inventory Table
CREATE TABLE IF NOT EXISTS public.ot_inventory (
  id TEXT PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL,
  unit TEXT NOT NULL,
  min_stock_level INTEGER NOT NULL,
  mrp NUMERIC,
  purchase_price NUMERIC,
  batch_number TEXT,
  expiry_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_inventory" ON public.ot_inventory;
CREATE POLICY "Allow public read for ot_inventory" ON public.ot_inventory FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_inventory" ON public.ot_inventory;
CREATE POLICY "Allow public insert for ot_inventory" ON public.ot_inventory FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_inventory" ON public.ot_inventory;
CREATE POLICY "Allow public update for ot_inventory" ON public.ot_inventory FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_inventory" ON public.ot_inventory;
CREATE POLICY "Allow public delete for ot_inventory" ON public.ot_inventory FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- OT Consents Table
CREATE TABLE IF NOT EXISTS public.ot_consents (
  id TEXT PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  terms TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  guardian_name TEXT,
  witness_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  signature_type TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  status TEXT DEFAULT 'Signed'
);

ALTER TABLE public.ot_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_consents" ON public.ot_consents;
CREATE POLICY "Allow public read for ot_consents" ON public.ot_consents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_consents" ON public.ot_consents;
CREATE POLICY "Allow public insert for ot_consents" ON public.ot_consents FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_consents" ON public.ot_consents;
CREATE POLICY "Allow public update for ot_consents" ON public.ot_consents FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_consents" ON public.ot_consents;
CREATE POLICY "Allow public delete for ot_consents" ON public.ot_consents FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- OT Infection Logs Table
CREATE TABLE IF NOT EXISTS public.ot_infection_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  theatre_id UUID REFERENCES public.ot_rooms(id) ON DELETE SET NULL,
  theatre_name TEXT,
  cleaning_type TEXT NOT NULL,
  disinfectants_used TEXT NOT NULL,
  air_particle_count TEXT,
  culture_swab_result TEXT NOT NULL,
  logged_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_infection_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_infection_logs" ON public.ot_infection_logs;
CREATE POLICY "Allow public read for ot_infection_logs" ON public.ot_infection_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_infection_logs" ON public.ot_infection_logs;
CREATE POLICY "Allow public insert for ot_infection_logs" ON public.ot_infection_logs FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_infection_logs" ON public.ot_infection_logs;
CREATE POLICY "Allow public update for ot_infection_logs" ON public.ot_infection_logs FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_infection_logs" ON public.ot_infection_logs;
CREATE POLICY "Allow public delete for ot_infection_logs" ON public.ot_infection_logs FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 25. Nursing Updates and Assignments
CREATE TABLE IF NOT EXISTS public.nursing_patient_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  nurse_name TEXT NOT NULL,
  note TEXT NOT NULL,
  alert_level TEXT DEFAULT 'Normal' CHECK (alert_level IN ('Normal', 'Moderate Alert', 'Critical Alert')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.nursing_patient_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for nursing_patient_updates" ON public.nursing_patient_updates;
CREATE POLICY "Allow public read for nursing_patient_updates" ON public.nursing_patient_updates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for nursing_patient_updates" ON public.nursing_patient_updates;
CREATE POLICY "Allow public insert for nursing_patient_updates" ON public.nursing_patient_updates FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for nursing_patient_updates" ON public.nursing_patient_updates;
CREATE POLICY "Allow public delete for nursing_patient_updates" ON public.nursing_patient_updates FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- Alter patients and admissions to add assigned nurse details for nursing roster assignments
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS assigned_nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS assigned_nurse_name TEXT;

ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS assigned_nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.admissions ADD COLUMN IF NOT EXISTS assigned_nurse_name TEXT;

-- Alter medical_equipment to add physical location column for devices
ALTER TABLE public.medical_equipment ADD COLUMN IF NOT EXISTS location TEXT;

-- 26. Staff & Attendance Badge QR Scanning (Front and Back Camera Support)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_number TEXT;

ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS blood_group TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS registration_number TEXT;

CREATE TABLE IF NOT EXISTS public.staff_qr_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  registration_number TEXT,
  contact_number TEXT,
  email TEXT,
  blood_group TEXT,
  attendance_qr_code TEXT,
  camera_source TEXT DEFAULT 'Front Camera' CHECK (camera_source IN ('Front Camera', 'Back Camera', 'Manual Scanner')),
  scan_time TIMESTAMPTZ DEFAULT NOW(),
  attendance_date DATE DEFAULT CURRENT_DATE,
  late_entry BOOLEAN DEFAULT FALSE,
  late_minutes INTEGER DEFAULT 0,
  early_leave BOOLEAN DEFAULT FALSE,
  early_leave_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Present' CHECK (status IN ('Present', 'Late', 'Early Departure', 'Absent', 'Half Day')),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_qr_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for staff_qr_attendance" ON public.staff_qr_attendance;
CREATE POLICY "Allow public read for staff_qr_attendance" ON public.staff_qr_attendance FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for staff_qr_attendance" ON public.staff_qr_attendance;
CREATE POLICY "Allow public insert for staff_qr_attendance" ON public.staff_qr_attendance FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for staff_qr_attendance" ON public.staff_qr_attendance;
CREATE POLICY "Allow public update for staff_qr_attendance" ON public.staff_qr_attendance FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for staff_qr_attendance" ON public.staff_qr_attendance;
CREATE POLICY "Allow public delete for staff_qr_attendance" ON public.staff_qr_attendance FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 27. Enhancements for Patient New Registration and Book Appointment Desk
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS id_proof_type TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS id_proof_number TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS attendant_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS attendant_relation TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS attendant_phone TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Indian';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS corporate_code TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS allergy_history TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS chronic_illness_history TEXT;

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS department_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS consultation_type TEXT DEFAULT 'In-Person' CHECK (consultation_type IN ('In-Person', 'Video', 'Tele-consult'));
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reason_for_visit TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS referral_source TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS booking_channel TEXT DEFAULT 'Front Office';

-- 28. Write Prescription Enhancements & Templates
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS symptoms TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS clinical_details TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS physical_exam TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS chronic_illnesses TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS diagnosis_notes TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS dietary_advice TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS general_advice TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS recommended_tests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS clinical_photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS surgical_advice TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS inpatient_advice TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS quick_dietary_presets JSONB DEFAULT '[]'::jsonb;

-- Prescription Templates Table
CREATE TABLE IF NOT EXISTS public.prescription_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  specialty TEXT,
  diagnosis TEXT,
  symptoms TEXT,
  clinical_details TEXT,
  physical_exam TEXT,
  dietary_advice TEXT,
  medicines JSONB DEFAULT '[]'::jsonb,
  recommended_tests JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for prescription_templates" ON public.prescription_templates;
CREATE POLICY "Allow public read for prescription_templates" ON public.prescription_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for prescription_templates" ON public.prescription_templates;
CREATE POLICY "Allow public insert for prescription_templates" ON public.prescription_templates FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for prescription_templates" ON public.prescription_templates;
CREATE POLICY "Allow public update for prescription_templates" ON public.prescription_templates FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for prescription_templates" ON public.prescription_templates;
CREATE POLICY "Allow public delete for prescription_templates" ON public.prescription_templates FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- Prescription Dietary & Care Advice Presets
CREATE TABLE IF NOT EXISTS public.prescription_dietary_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  advice_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.prescription_dietary_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for prescription_dietary_presets" ON public.prescription_dietary_presets;
CREATE POLICY "Allow public read for prescription_dietary_presets" ON public.prescription_dietary_presets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for prescription_dietary_presets" ON public.prescription_dietary_presets;
CREATE POLICY "Allow public insert for prescription_dietary_presets" ON public.prescription_dietary_presets FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for prescription_dietary_presets" ON public.prescription_dietary_presets;
CREATE POLICY "Allow public update for prescription_dietary_presets" ON public.prescription_dietary_presets FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for prescription_dietary_presets" ON public.prescription_dietary_presets;
CREATE POLICY "Allow public delete for prescription_dietary_presets" ON public.prescription_dietary_presets FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- Seed default dietary presets (Acute Gastroenteritis, Fever/Flu, Diabetes, Hypertension)
INSERT INTO public.prescription_dietary_presets (title, category, advice_items) VALUES
('Acute Gastroenteritis Care Advice', 'Gastroenterology', '[
  "Maintain high fluid intake with ORS (Oral Rehydration Salts) - drink 200ml after each loose motion.",
  "Restrict diet to light, bland foods (Khichdi, Curd Rice, Banana, Apple Sauce, Toast).",
  "Avoid milk, dairy, spicy food, raw salads, and juices for 48 hours.",
  "Hand hygiene is critical: wash hands thoroughly before meals."
]'::jsonb),
('General Fever & Viral Infection Care', 'General Medicine', '[
  "Maintain adequate hydration with warm fluids, soups, and ORS.",
  "Get adequate bed rest and avoid strenuous physical exertion.",
  "Monitor body temperature every 4-6 hours.",
  "Eat light, easily digestible cooked meals."
]'::jsonb)
ON CONFLICT DO NOTHING;

-- 29. GI Procedure Consent Forms
CREATE TABLE IF NOT EXISTS public.gi_procedure_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  procedure_name TEXT NOT NULL DEFAULT 'Minor GI Procedure',
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_name TEXT,
  risks_explained TEXT,
  consent_terms TEXT NOT NULL,
  patient_signature TEXT,
  witness_name TEXT,
  witness_signature TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'Signed'
);

ALTER TABLE public.gi_procedure_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for gi_procedure_consents" ON public.gi_procedure_consents;
CREATE POLICY "Allow public read for gi_procedure_consents" ON public.gi_procedure_consents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for gi_procedure_consents" ON public.gi_procedure_consents;
CREATE POLICY "Allow public insert for gi_procedure_consents" ON public.gi_procedure_consents FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for gi_procedure_consents" ON public.gi_procedure_consents;
CREATE POLICY "Allow public update for gi_procedure_consents" ON public.gi_procedure_consents FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for gi_procedure_consents" ON public.gi_procedure_consents;
CREATE POLICY "Allow public delete for gi_procedure_consents" ON public.gi_procedure_consents FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 30. Direct Procedure Registration & Instant Billing
CREATE TABLE IF NOT EXISTS public.direct_procedure_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  procedure_category TEXT DEFAULT 'GI Procedure',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_name TEXT,
  procedure_cost NUMERIC(12,2) DEFAULT 0.00,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_status TEXT DEFAULT 'Paid',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.direct_procedure_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for direct_procedure_registrations" ON public.direct_procedure_registrations;
CREATE POLICY "Allow public read for direct_procedure_registrations" ON public.direct_procedure_registrations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for direct_procedure_registrations" ON public.direct_procedure_registrations;
CREATE POLICY "Allow public insert for direct_procedure_registrations" ON public.direct_procedure_registrations FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for direct_procedure_registrations" ON public.direct_procedure_registrations;
CREATE POLICY "Allow public update for direct_procedure_registrations" ON public.direct_procedure_registrations FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for direct_procedure_registrations" ON public.direct_procedure_registrations;
CREATE POLICY "Allow public delete for direct_procedure_registrations" ON public.direct_procedure_registrations FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 31. IPD Initial Evaluation Sheets (Neo GastroPlus Hospital - Form Ref: IPD-EVAL-01)
CREATE TABLE IF NOT EXISTS public.ipd_initial_evaluation_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    patient_name TEXT NOT NULL,
    ipd_no TEXT,
    ipd_reg_no TEXT,
    mob_no TEXT,
    address TEXT,
    evaluation_date DATE DEFAULT CURRENT_DATE,
    evaluation_time TEXT,
    age_sex TEXT,
    weight TEXT,
    height TEXT,
    emergency_contact TEXT,
    
    -- Clinical History & Past Medical History
    complaints_history TEXT,
    past_history_flags JSONB DEFAULT '{"DM": false, "HTN": false, "CAD": false, "CVA": false, "CKD": false, "TB": false, "ASTHMA": false, "Sx": false}'::jsonb,
    current_medications TEXT,
    family_history TEXT,
    drug_allergies TEXT,
    addiction_smoking TEXT,
    addiction_alcohol TEXT,

    -- Condition on Admission & Vitals
    general_condition TEXT DEFAULT 'Good',
    pulse TEXT,
    spo2 TEXT,
    bp TEXT,
    rr TEXT,
    temp TEXT,
    physical_signs JSONB DEFAULT '{"lymphadenopathy": false, "oedema": false, "pallor": false, "cyanosis": false, "icterus": false, "otherNotes": ""}'::jsonb,
    nutritional_status TEXT DEFAULT 'Good',

    -- Systemic & Local Examinations
    systemic_cns TEXT,
    systemic_cvs TEXT,
    systemic_rs TEXT,
    systemic_pa TEXT,
    systemic_other TEXT,
    local_examination TEXT,

    -- Diagnosis & Treatment
    provisional_diagnosis TEXT,
    plan_of_treatment TEXT,
    investigations JSONB DEFAULT '{"FBC": false, "LFT": false, "RFT": false, "BSR": false, "ElectrolyteHBA1C": false, "LipidCholesterol": false, "SAmylase": false, "SLipase": false, "HBA1C": false, "PTINR": false, "UrineRM": false, "XRayChest": false, "XRayAbdomen": false, "USG": false, "ECG": false, "Echo2D": false, "PAC": false, "other": ""}'::jsonb,
    
    -- General Instructions & Care
    general_instructions JSONB DEFAULT '{"diet": "Full Diet", "dietRoute": "PO", "mobility": "Full Mobility", "followPrepNeeded": "", "otPlan": "", "other": ""}'::jsonb,
    
    -- Medication Orders (Array of prescribed items)
    medication_orders JSONB DEFAULT '[]'::jsonb,

    -- Attending Consultant Oversight
    consultant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    consultant_name TEXT DEFAULT 'Dr. A. K. Verma',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance & Search
CREATE INDEX IF NOT EXISTS idx_ipd_eval_patient_id ON public.ipd_initial_evaluation_sheets(patient_id);
CREATE INDEX IF NOT EXISTS idx_ipd_eval_date ON public.ipd_initial_evaluation_sheets(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_ipd_eval_ipd_no ON public.ipd_initial_evaluation_sheets(ipd_no);

-- Row Level Security (RLS)
ALTER TABLE public.ipd_initial_evaluation_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read for ipd_initial_evaluation_sheets" ON public.ipd_initial_evaluation_sheets;
DROP POLICY IF EXISTS "Allow public insert for ipd_initial_evaluation_sheets" ON public.ipd_initial_evaluation_sheets;
DROP POLICY IF EXISTS "Allow public update for ipd_initial_evaluation_sheets" ON public.ipd_initial_evaluation_sheets;
DROP POLICY IF EXISTS "Allow public delete for ipd_initial_evaluation_sheets" ON public.ipd_initial_evaluation_sheets;
DROP POLICY IF EXISTS "Allow public read access on ipd_initial_evaluation_sheets" ON public.ipd_initial_evaluation_sheets;
DROP POLICY IF EXISTS "Allow public insert access on ipd_initial_evaluation_sheets" ON public.ipd_initial_evaluation_sheets;
DROP POLICY IF EXISTS "Allow public update access on ipd_initial_evaluation_sheets" ON public.ipd_initial_evaluation_sheets;
DROP POLICY IF EXISTS "Allow public delete access on ipd_initial_evaluation_sheets" ON public.ipd_initial_evaluation_sheets;

CREATE POLICY "Allow public read for ipd_initial_evaluation_sheets"
    ON public.ipd_initial_evaluation_sheets FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert for ipd_initial_evaluation_sheets"
    ON public.ipd_initial_evaluation_sheets FOR INSERT
    TO authenticated, anon
    WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);

CREATE POLICY "Allow public update for ipd_initial_evaluation_sheets"
    ON public.ipd_initial_evaluation_sheets FOR UPDATE
    TO authenticated, anon
    USING (coalesce(auth.role(), '') IS NOT NULL)
    WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);

CREATE POLICY "Allow public delete for ipd_initial_evaluation_sheets"
    ON public.ipd_initial_evaluation_sheets FOR DELETE
    TO authenticated, anon
    USING (coalesce(auth.role(), '') IS NOT NULL);

-- Auto-update `updated_at` Trigger Function
CREATE OR REPLACE FUNCTION update_ipd_eval_sheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_ipd_eval_sheets_updated_at ON public.ipd_initial_evaluation_sheets;
CREATE TRIGGER trg_update_ipd_eval_sheets_updated_at
    BEFORE UPDATE ON public.ipd_initial_evaluation_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_ipd_eval_sheets_updated_at();

-- 32. Physical Rack, ICD-10 Coding & MRD Archive Indexing
CREATE TABLE IF NOT EXISTS public.mrd_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  age TEXT,
  gender TEXT,
  phone TEXT,
  file_type TEXT DEFAULT 'IPD',
  admission_date DATE,
  discharge_date DATE,
  department TEXT,
  attending_doctor TEXT,
  rack_number TEXT NOT NULL,
  shelf_number TEXT NOT NULL,
  box_folder_id TEXT,
  file_barcode TEXT,
  icd10_code TEXT,
  icd10_description TEXT,
  is_completed_by_doctor BOOLEAN DEFAULT FALSE,
  has_discharge_summary BOOLEAN DEFAULT FALSE,
  has_consent_form BOOLEAN DEFAULT FALSE,
  has_operative_notes BOOLEAN DEFAULT FALSE,
  mrd_status TEXT DEFAULT 'ARCHIVED',
  is_mlc BOOLEAN DEFAULT FALSE,
  mlc_number TEXT,
  police_station TEXT,
  active_issue JSONB DEFAULT NULL,
  issue_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mrd_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for mrd_records" ON public.mrd_records;
CREATE POLICY "Allow public read for mrd_records" ON public.mrd_records FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for mrd_records" ON public.mrd_records;
CREATE POLICY "Allow public insert for mrd_records" ON public.mrd_records FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for mrd_records" ON public.mrd_records;
CREATE POLICY "Allow public update for mrd_records" ON public.mrd_records FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for mrd_records" ON public.mrd_records;
CREATE POLICY "Allow public delete for mrd_records" ON public.mrd_records FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 33. IPD Prescribe Medication Orders
CREATE TABLE IF NOT EXISTS public.ipd_medication_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  drug_name_form TEXT NOT NULL,
  dosage_strength TEXT NOT NULL,
  route TEXT DEFAULT 'Oral',
  frequency TEXT DEFAULT 'BD (Twice Daily)',
  prescribing_doctor TEXT,
  special_instructions TEXT,
  is_high_alert BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ipd_medication_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ipd_medication_orders" ON public.ipd_medication_orders;
CREATE POLICY "Allow public read for ipd_medication_orders" ON public.ipd_medication_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ipd_medication_orders" ON public.ipd_medication_orders;
CREATE POLICY "Allow public insert for ipd_medication_orders" ON public.ipd_medication_orders FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ipd_medication_orders" ON public.ipd_medication_orders;
CREATE POLICY "Allow public update for ipd_medication_orders" ON public.ipd_medication_orders FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ipd_medication_orders" ON public.ipd_medication_orders;
CREATE POLICY "Allow public delete for ipd_medication_orders" ON public.ipd_medication_orders FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 34. IPD Register IV Fluid Drip
CREATE TABLE IF NOT EXISTS public.ipd_iv_fluids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  fluid_name_volume TEXT NOT NULL,
  additive_drugs TEXT,
  flow_rate TEXT,
  total_bag_volume_ml INTEGER DEFAULT 500,
  status TEXT DEFAULT 'In-Progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ipd_iv_fluids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ipd_iv_fluids" ON public.ipd_iv_fluids;
CREATE POLICY "Allow public read for ipd_iv_fluids" ON public.ipd_iv_fluids FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ipd_iv_fluids" ON public.ipd_iv_fluids;
CREATE POLICY "Allow public insert for ipd_iv_fluids" ON public.ipd_iv_fluids FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ipd_iv_fluids" ON public.ipd_iv_fluids;
CREATE POLICY "Allow public update for ipd_iv_fluids" ON public.ipd_iv_fluids FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ipd_iv_fluids" ON public.ipd_iv_fluids;
CREATE POLICY "Allow public delete for ipd_iv_fluids" ON public.ipd_iv_fluids FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 35. Centralized Payment Counter & Advance Payment Deposit
CREATE TABLE IF NOT EXISTS public.counter_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_mrn TEXT,
  patient_phone TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  amount DECIMAL(12,2) DEFAULT 0.00,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  discount_reason TEXT,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  transaction_ref TEXT,
  bank_name TEXT,
  payer_name TEXT,
  remarks TEXT,
  settled_invoices JSONB DEFAULT '[]'::jsonb,
  collected_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.counter_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for counter_payments" ON public.counter_payments;
CREATE POLICY "Allow public read for counter_payments" ON public.counter_payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for counter_payments" ON public.counter_payments;
CREATE POLICY "Allow public insert for counter_payments" ON public.counter_payments FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for counter_payments" ON public.counter_payments;
CREATE POLICY "Allow public update for counter_payments" ON public.counter_payments FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for counter_payments" ON public.counter_payments;
CREATE POLICY "Allow public delete for counter_payments" ON public.counter_payments FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.advance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_mrn TEXT,
  patient_phone TEXT,
  activity_type TEXT DEFAULT 'OT / Planned Surgery Deposit',
  procedure_name TEXT,
  amount DECIMAL(12,2) DEFAULT 0.00,
  deposit_date TIMESTAMPTZ DEFAULT NOW(),
  expected_procedure_date DATE,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  transaction_ref TEXT,
  bank_name TEXT,
  payer_name TEXT,
  remarks TEXT,
  collected_by TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.advance_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for advance_payments" ON public.advance_payments;
CREATE POLICY "Allow public read for advance_payments" ON public.advance_payments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for advance_payments" ON public.advance_payments;
CREATE POLICY "Allow public insert for advance_payments" ON public.advance_payments FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for advance_payments" ON public.advance_payments;
CREATE POLICY "Allow public update for advance_payments" ON public.advance_payments FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for advance_payments" ON public.advance_payments;
CREATE POLICY "Allow public delete for advance_payments" ON public.advance_payments FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 36. Schedule Ward Tasks
CREATE TABLE IF NOT EXISTS public.ipd_ward_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  task_category TEXT DEFAULT 'Monitoring',
  priority TEXT DEFAULT 'Low',
  due_time TEXT,
  shift_nurse TEXT,
  clinical_instructions TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ipd_ward_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ipd_ward_tasks" ON public.ipd_ward_tasks;
CREATE POLICY "Allow public read for ipd_ward_tasks" ON public.ipd_ward_tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ipd_ward_tasks" ON public.ipd_ward_tasks;
CREATE POLICY "Allow public insert for ipd_ward_tasks" ON public.ipd_ward_tasks FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ipd_ward_tasks" ON public.ipd_ward_tasks;
CREATE POLICY "Allow public update for ipd_ward_tasks" ON public.ipd_ward_tasks FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ipd_ward_tasks" ON public.ipd_ward_tasks;
CREATE POLICY "Allow public delete for ipd_ward_tasks" ON public.ipd_ward_tasks FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 37. 24-Hour Hourly Vitals & Bedside Intake/Output Sheet
CREATE TABLE IF NOT EXISTS public.ipd_hourly_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  time_slot TEXT NOT NULL,
  pulse TEXT,
  rr TEXT,
  temp TEXT,
  bp TEXT,
  spo2 TEXT,
  cns_gcs TEXT,
  oral_items TEXT,
  oral_volume_ml INTEGER DEFAULT 0,
  iv_items TEXT,
  iv_volume_ml INTEGER DEFAULT 0,
  aspirate_drain_ml INTEGER DEFAULT 0,
  urine_output_ml INTEGER DEFAULT 0,
  recorded_by_staff TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ipd_hourly_vitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ipd_hourly_vitals" ON public.ipd_hourly_vitals;
CREATE POLICY "Allow public read for ipd_hourly_vitals" ON public.ipd_hourly_vitals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ipd_hourly_vitals" ON public.ipd_hourly_vitals;
CREATE POLICY "Allow public insert for ipd_hourly_vitals" ON public.ipd_hourly_vitals FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ipd_hourly_vitals" ON public.ipd_hourly_vitals;
CREATE POLICY "Allow public update for ipd_hourly_vitals" ON public.ipd_hourly_vitals FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ipd_hourly_vitals" ON public.ipd_hourly_vitals;
CREATE POLICY "Allow public delete for ipd_hourly_vitals" ON public.ipd_hourly_vitals FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 38. Blood Sugar (GRBS) & Sliding Scale Insulin Log
CREATE TABLE IF NOT EXISTS public.ipd_grbs_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  monitoring_slot TEXT DEFAULT 'Pre-Lunch',
  grbs_value INTEGER NOT NULL,
  sliding_scale_units INTEGER DEFAULT 0,
  insulin_type_route TEXT,
  urine_ketones TEXT DEFAULT 'Negative',
  hypoglycemia_symptoms TEXT DEFAULT 'None',
  doctor_instructions TEXT,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ipd_grbs_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ipd_grbs_logs" ON public.ipd_grbs_logs;
CREATE POLICY "Allow public read for ipd_grbs_logs" ON public.ipd_grbs_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ipd_grbs_logs" ON public.ipd_grbs_logs;
CREATE POLICY "Allow public insert for ipd_grbs_logs" ON public.ipd_grbs_logs FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ipd_grbs_logs" ON public.ipd_grbs_logs;
CREATE POLICY "Allow public update for ipd_grbs_logs" ON public.ipd_grbs_logs FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ipd_grbs_logs" ON public.ipd_grbs_logs;
CREATE POLICY "Allow public delete for ipd_grbs_logs" ON public.ipd_grbs_logs FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 39. Fluid Intake & Output (I/O) Balance
CREATE TABLE IF NOT EXISTS public.ipd_fluid_io_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  shift TEXT DEFAULT 'Morning (8am-2pm)',
  oral_water_ml INTEGER DEFAULT 0,
  iv_drips_ml INTEGER DEFAULT 0,
  tube_feed_ml INTEGER DEFAULT 0,
  blood_pcv_ml INTEGER DEFAULT 0,
  urine_output_ml INTEGER DEFAULT 0,
  ng_aspirate_ml INTEGER DEFAULT 0,
  drains_total_ml INTEGER DEFAULT 0,
  vomit_stool_ml INTEGER DEFAULT 0,
  nursing_remarks TEXT,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ipd_fluid_io_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ipd_fluid_io_logs" ON public.ipd_fluid_io_logs;
CREATE POLICY "Allow public read for ipd_fluid_io_logs" ON public.ipd_fluid_io_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ipd_fluid_io_logs" ON public.ipd_fluid_io_logs;
CREATE POLICY "Allow public insert for ipd_fluid_io_logs" ON public.ipd_fluid_io_logs FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ipd_fluid_io_logs" ON public.ipd_fluid_io_logs;
CREATE POLICY "Allow public update for ipd_fluid_io_logs" ON public.ipd_fluid_io_logs FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ipd_fluid_io_logs" ON public.ipd_fluid_io_logs;
CREATE POLICY "Allow public delete for ipd_fluid_io_logs" ON public.ipd_fluid_io_logs FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 40. Daily Drain Output & Tube Care
CREATE TABLE IF NOT EXISTS public.ipd_drain_output_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  drain_name_type TEXT NOT NULL,
  anatomical_site TEXT,
  volume_output_ml INTEGER DEFAULT 0,
  color_aspect TEXT DEFAULT 'Serosanguineous',
  doctor_instructions TEXT,
  nursing_site_remarks TEXT,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ipd_drain_output_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ipd_drain_output_logs" ON public.ipd_drain_output_logs;
CREATE POLICY "Allow public read for ipd_drain_output_logs" ON public.ipd_drain_output_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ipd_drain_output_logs" ON public.ipd_drain_output_logs;
CREATE POLICY "Allow public insert for ipd_drain_output_logs" ON public.ipd_drain_output_logs FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ipd_drain_output_logs" ON public.ipd_drain_output_logs;
CREATE POLICY "Allow public update for ipd_drain_output_logs" ON public.ipd_drain_output_logs FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ipd_drain_output_logs" ON public.ipd_drain_output_logs;
CREATE POLICY "Allow public delete for ipd_drain_output_logs" ON public.ipd_drain_output_logs FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 41. Endoscopy & Colonoscopy Procedure Recovery
CREATE TABLE IF NOT EXISTS public.endoscopy_recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  procedure_type TEXT DEFAULT 'Upper GI Endoscopy',
  bowel_prep_status TEXT DEFAULT 'Clear Yellow Liquid Stool',
  bp TEXT,
  pulse TEXT,
  spo2 TEXT,
  temp TEXT,
  abdominal_assessment TEXT DEFAULT 'Soft non-tender',
  diet_progression_order TEXT DEFAULT 'Sips of Water',
  biopsy_taken BOOLEAN DEFAULT FALSE,
  biopsy_details TEXT,
  doctor_recovery_instructions TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.endoscopy_recovery_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for endoscopy_recovery_logs" ON public.endoscopy_recovery_logs;
CREATE POLICY "Allow public read for endoscopy_recovery_logs" ON public.endoscopy_recovery_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for endoscopy_recovery_logs" ON public.endoscopy_recovery_logs;
CREATE POLICY "Allow public insert for endoscopy_recovery_logs" ON public.endoscopy_recovery_logs FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for endoscopy_recovery_logs" ON public.endoscopy_recovery_logs;
CREATE POLICY "Allow public update for endoscopy_recovery_logs" ON public.endoscopy_recovery_logs FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for endoscopy_recovery_logs" ON public.endoscopy_recovery_logs;
CREATE POLICY "Allow public delete for endoscopy_recovery_logs" ON public.endoscopy_recovery_logs FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 42. Visiting Specialists / Consultants Directory
CREATE TABLE IF NOT EXISTS public.visiting_consultants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  qualification TEXT,
  phone_number TEXT NOT NULL,
  default_fee DECIMAL(10,2) DEFAULT 1500.00,
  hospital_affiliation TEXT,
  visiting_schedule TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.visiting_consultants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for visiting_consultants" ON public.visiting_consultants;
CREATE POLICY "Allow public read for visiting_consultants" ON public.visiting_consultants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for visiting_consultants" ON public.visiting_consultants;
CREATE POLICY "Allow public insert for visiting_consultants" ON public.visiting_consultants FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for visiting_consultants" ON public.visiting_consultants;
CREATE POLICY "Allow public update for visiting_consultants" ON public.visiting_consultants FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for visiting_consultants" ON public.visiting_consultants;
CREATE POLICY "Allow public delete for visiting_consultants" ON public.visiting_consultants FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 43. Visiting Specialist Consultation Notes
CREATE TABLE IF NOT EXISTS public.visiting_consultant_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  uhid_mrn TEXT,
  ipd_number TEXT,
  ward_bed_no TEXT,
  consultation_date DATE DEFAULT CURRENT_DATE,
  consultation_time TEXT,
  consultation_type TEXT DEFAULT 'Cross-Consultation',
  visit_charges DECIMAL(10,2) DEFAULT 1500.00,
  bp TEXT,
  pulse TEXT,
  temp TEXT,
  spo2 TEXT,
  rr TEXT,
  reason_for_call TEXT,
  examination_findings TEXT,
  impression_diagnosis TEXT,
  detailed_orders_instructions TEXT,
  prescribed_dose TEXT,
  prescribed_frequency TEXT,
  prescribed_duration TEXT,
  recommended_investigations TEXT,
  specialist_id UUID REFERENCES public.visiting_consultants(id) ON DELETE SET NULL,
  specialist_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.visiting_consultant_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for visiting_consultant_notes" ON public.visiting_consultant_notes;
CREATE POLICY "Allow public read for visiting_consultant_notes" ON public.visiting_consultant_notes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for visiting_consultant_notes" ON public.visiting_consultant_notes;
CREATE POLICY "Allow public insert for visiting_consultant_notes" ON public.visiting_consultant_notes FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for visiting_consultant_notes" ON public.visiting_consultant_notes;
CREATE POLICY "Allow public update for visiting_consultant_notes" ON public.visiting_consultant_notes FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for visiting_consultant_notes" ON public.visiting_consultant_notes;
CREATE POLICY "Allow public delete for visiting_consultant_notes" ON public.visiting_consultant_notes FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 44. Staff Members & Hospital Employees Directory
CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'doctor',
  department TEXT,
  specialty TEXT,
  email TEXT,
  qualification TEXT,
  experience TEXT,
  registration_number TEXT,
  consultation_fee DECIMAL(10,2) DEFAULT 500.00,
  qr_badge_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for staff_members" ON public.staff_members;
CREATE POLICY "Allow public read for staff_members" ON public.staff_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for staff_members" ON public.staff_members;
CREATE POLICY "Allow public insert for staff_members" ON public.staff_members FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for staff_members" ON public.staff_members;
CREATE POLICY "Allow public update for staff_members" ON public.staff_members FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for staff_members" ON public.staff_members;
CREATE POLICY "Allow public delete for staff_members" ON public.staff_members FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 45. Staff Attendance (Manual Punch & Camera QR Code Scanning)
CREATE TABLE IF NOT EXISTS public.staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.staff_members(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  attendance_date DATE DEFAULT CURRENT_DATE,
  clock_in_time TEXT NOT NULL,
  clock_out_time TEXT,
  arrival_status TEXT DEFAULT 'On Time',
  punch_type TEXT DEFAULT 'Manual Punch', -- 'Manual Punch' or 'QR Code Camera Scan'
  terminal_id TEXT DEFAULT 'GASTRO-K-01',
  qr_badge_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for staff_attendance" ON public.staff_attendance;
CREATE POLICY "Allow public read for staff_attendance" ON public.staff_attendance FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for staff_attendance" ON public.staff_attendance;
CREATE POLICY "Allow public insert for staff_attendance" ON public.staff_attendance FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for staff_attendance" ON public.staff_attendance;
CREATE POLICY "Allow public update for staff_attendance" ON public.staff_attendance FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for staff_attendance" ON public.staff_attendance;
CREATE POLICY "Allow public delete for staff_attendance" ON public.staff_attendance FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- ==============================================================================
-- OT MANAGEMENT & OPERATION THEATRE MODULE TABLES & DATABASE SCHEMA
-- Hospital: Neo GastroPlus Hospital (A unit of GP Healthcare)
-- ==============================================================================

-- 46. OT Infection Control Logs
CREATE TABLE IF NOT EXISTS public.ot_infection_control_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_room_no TEXT NOT NULL DEFAULT 'OT-1',
  fumigation_date DATE DEFAULT CURRENT_DATE,
  fumigation_time TEXT,
  disinfectant_used TEXT DEFAULT 'Bacillocid Extra / Hydrogen Peroxide',
  biological_indicator_result TEXT DEFAULT 'Negative / Clear',
  swab_culture_report TEXT DEFAULT 'No Growth After 48 Hours',
  air_sampling_count TEXT DEFAULT '< 10 CFU/m3',
  carbolic_acid_cleaning BOOLEAN DEFAULT TRUE,
  uv_light_hours DECIMAL(5,2) DEFAULT 2.00,
  inspected_by TEXT,
  status TEXT DEFAULT 'APPROVED_SAFE',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_infection_control_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_infection_control_logs" ON public.ot_infection_control_logs;
CREATE POLICY "Allow public read for ot_infection_control_logs" ON public.ot_infection_control_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_infection_control_logs" ON public.ot_infection_control_logs;
CREATE POLICY "Allow public insert for ot_infection_control_logs" ON public.ot_infection_control_logs FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_infection_control_logs" ON public.ot_infection_control_logs;
CREATE POLICY "Allow public update for ot_infection_control_logs" ON public.ot_infection_control_logs FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_infection_control_logs" ON public.ot_infection_control_logs;
CREATE POLICY "Allow public delete for ot_infection_control_logs" ON public.ot_infection_control_logs FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 47. OT Pharmacy & Consumables Requisition
CREATE TABLE IF NOT EXISTS public.ot_pharmacy_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  ipd_no TEXT,
  ot_room_no TEXT DEFAULT 'OT-1',
  surgeon_name TEXT,
  anesthetist_name TEXT,
  requisition_date DATE DEFAULT CURRENT_DATE,
  requisition_time TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  priority TEXT DEFAULT 'Routine',
  status TEXT DEFAULT 'Pending',
  requested_by TEXT,
  issued_by TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_pharmacy_requisitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_pharmacy_requisitions" ON public.ot_pharmacy_requisitions;
CREATE POLICY "Allow public read for ot_pharmacy_requisitions" ON public.ot_pharmacy_requisitions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_pharmacy_requisitions" ON public.ot_pharmacy_requisitions;
CREATE POLICY "Allow public insert for ot_pharmacy_requisitions" ON public.ot_pharmacy_requisitions FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_pharmacy_requisitions" ON public.ot_pharmacy_requisitions;
CREATE POLICY "Allow public update for ot_pharmacy_requisitions" ON public.ot_pharmacy_requisitions FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_pharmacy_requisitions" ON public.ot_pharmacy_requisitions;
CREATE POLICY "Allow public delete for ot_pharmacy_requisitions" ON public.ot_pharmacy_requisitions FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 48. OT Biopsy & Histopathology Requisition Form
CREATE TABLE IF NOT EXISTS public.ot_biopsy_histopathology_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_ref_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  age_sex TEXT,
  ipd_no TEXT,
  consultant_surgeon TEXT NOT NULL,
  department TEXT DEFAULT 'Surgical Gastroenterology',
  specimen_source_site TEXT NOT NULL,
  nature_of_specimen TEXT,
  fixative_used TEXT DEFAULT '10% Formalin Buffer',
  clinical_history_findings TEXT,
  provisional_diagnosis TEXT,
  operative_findings TEXT,
  previous_biopsy_no TEXT,
  collection_date DATE DEFAULT CURRENT_DATE,
  collection_time TEXT,
  sent_to_lab_name TEXT DEFAULT 'Pathology & Histopathology Lab',
  special_instructions TEXT,
  specimen_container_labeled_by TEXT,
  status TEXT DEFAULT 'PENDING_LAB_ANALYSIS',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_biopsy_histopathology_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_biopsy_histopathology_forms" ON public.ot_biopsy_histopathology_forms;
CREATE POLICY "Allow public read for ot_biopsy_histopathology_forms" ON public.ot_biopsy_histopathology_forms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_biopsy_histopathology_forms" ON public.ot_biopsy_histopathology_forms;
CREATE POLICY "Allow public insert for ot_biopsy_histopathology_forms" ON public.ot_biopsy_histopathology_forms FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_biopsy_histopathology_forms" ON public.ot_biopsy_histopathology_forms;
CREATE POLICY "Allow public update for ot_biopsy_histopathology_forms" ON public.ot_biopsy_histopathology_forms FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_biopsy_histopathology_forms" ON public.ot_biopsy_histopathology_forms;
CREATE POLICY "Allow public delete for ot_biopsy_histopathology_forms" ON public.ot_biopsy_histopathology_forms FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 49. OT Inventory & Equipment Directory
CREATE TABLE IF NOT EXISTS public.ot_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code TEXT UNIQUE NOT NULL,
  item_name TEXT NOT NULL,
  category TEXT DEFAULT 'Surgical Instrument',
  batch_number TEXT,
  expiry_date DATE,
  quantity_in_stock INTEGER DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,
  unit_of_measure TEXT DEFAULT 'Pcs',
  location_rack_bin TEXT,
  vendor_supplier TEXT,
  unit_cost DECIMAL(10,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_inventory" ON public.ot_inventory;
CREATE POLICY "Allow public read for ot_inventory" ON public.ot_inventory FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_inventory" ON public.ot_inventory;
CREATE POLICY "Allow public insert for ot_inventory" ON public.ot_inventory FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_inventory" ON public.ot_inventory;
CREATE POLICY "Allow public update for ot_inventory" ON public.ot_inventory FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_inventory" ON public.ot_inventory;
CREATE POLICY "Allow public delete for ot_inventory" ON public.ot_inventory FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 50. OT Post Operative Checklist & Safety Handover
CREATE TABLE IF NOT EXISTS public.ot_post_operative_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  ipd_no TEXT,
  age_sex TEXT,
  surgery_name TEXT NOT NULL,
  surgeon_name TEXT,
  anesthetist_name TEXT,
  scrub_nurse TEXT,
  circulating_nurse TEXT,
  operation_date DATE DEFAULT CURRENT_DATE,
  post_op_vitals JSONB DEFAULT '{"bp": "", "pulse": "", "temp": "", "spo2": "", "rr": "", "gcs": ""}'::jsonb,
  airway_breathing_status TEXT DEFAULT 'Extubated & Maintaining SpO2 on Room Air',
  drain_tube_details JSONB DEFAULT '[]'::jsonb,
  dressing_wound_condition TEXT DEFAULT 'Clean & Intact',
  catheter_iv_lines JSONB DEFAULT '[]'::jsonb,
  specimen_verification TEXT,
  sponge_needle_count_verified BOOLEAN DEFAULT TRUE,
  post_op_orders_instructions TEXT,
  handed_over_by TEXT,
  received_in_ward_by TEXT,
  recovery_room_discharge_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_post_operative_checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_post_operative_checklists" ON public.ot_post_operative_checklists;
CREATE POLICY "Allow public read for ot_post_operative_checklists" ON public.ot_post_operative_checklists FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_post_operative_checklists" ON public.ot_post_operative_checklists;
CREATE POLICY "Allow public insert for ot_post_operative_checklists" ON public.ot_post_operative_checklists FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_post_operative_checklists" ON public.ot_post_operative_checklists;
CREATE POLICY "Allow public update for ot_post_operative_checklists" ON public.ot_post_operative_checklists FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_post_operative_checklists" ON public.ot_post_operative_checklists;
CREATE POLICY "Allow public delete for ot_post_operative_checklists" ON public.ot_post_operative_checklists FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 51. OT Operation Schedules & Booking System
CREATE TABLE IF NOT EXISTS public.ot_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  ipd_no TEXT,
  age_sex TEXT,
  phone_number TEXT,
  proposed_surgery TEXT NOT NULL,
  surgery_category TEXT DEFAULT 'Major',
  ot_room_no TEXT DEFAULT 'OT-1',
  scheduled_date DATE DEFAULT CURRENT_DATE,
  scheduled_start_time TEXT NOT NULL,
  scheduled_end_time TEXT,
  chief_surgeon TEXT NOT NULL,
  assistant_surgeons JSONB DEFAULT '[]'::jsonb,
  anesthetist TEXT,
  anaesthesia_type TEXT DEFAULT 'GA',
  scrub_nurse TEXT,
  pre_op_diagnosis TEXT,
  special_equipment_needed TEXT,
  blood_units_reserved TEXT DEFAULT 'Nil',
  pac_cleared BOOLEAN DEFAULT TRUE,
  booking_status TEXT DEFAULT 'Scheduled',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_schedules" ON public.ot_schedules;
CREATE POLICY "Allow public read for ot_schedules" ON public.ot_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_schedules" ON public.ot_schedules;
CREATE POLICY "Allow public insert for ot_schedules" ON public.ot_schedules FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_schedules" ON public.ot_schedules;
CREATE POLICY "Allow public update for ot_schedules" ON public.ot_schedules FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_schedules" ON public.ot_schedules;
CREATE POLICY "Allow public delete for ot_schedules" ON public.ot_schedules FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 52. Pre-Operative Orders & Directives
CREATE TABLE IF NOT EXISTS public.ot_pre_operative_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  age_sex TEXT,
  ipd_no TEXT,
  hospital_no TEXT,
  surgery_name TEXT NOT NULL,
  anesthesia_type TEXT DEFAULT 'GA',
  order_date DATE DEFAULT CURRENT_DATE,
  npo_status TEXT DEFAULT 'Nil orally after midnight',
  diet_instructions TEXT DEFAULT 'Clear fluids till midnight',
  written_consent_verified BOOLEAN DEFAULT TRUE,
  skin_prep_instructions TEXT DEFAULT 'Abdominal skin prep with Savlon',
  pac_orders_followed BOOLEAN DEFAULT TRUE,
  morning_bath_instructions TEXT DEFAULT 'Morning Bath at 7.00 am with Savlon Soap',
  xylocaine_sensitivity TEXT DEFAULT 'Non-Sensitive',
  premedication_tablets JSONB DEFAULT '[]'::jsonb,
  iv_injections_antibiotics JSONB DEFAULT '[]'::jsonb,
  iv_fluids_orders JSONB DEFAULT '[]'::jsonb,
  blood_arrangements TEXT,
  special_directives TEXT,
  prescribed_by_doctor TEXT,
  nursing_execution_status TEXT DEFAULT 'Executed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_pre_operative_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_pre_operative_orders" ON public.ot_pre_operative_orders;
CREATE POLICY "Allow public read for ot_pre_operative_orders" ON public.ot_pre_operative_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_pre_operative_orders" ON public.ot_pre_operative_orders;
CREATE POLICY "Allow public insert for ot_pre_operative_orders" ON public.ot_pre_operative_orders FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_pre_operative_orders" ON public.ot_pre_operative_orders;
CREATE POLICY "Allow public update for ot_pre_operative_orders" ON public.ot_pre_operative_orders FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_pre_operative_orders" ON public.ot_pre_operative_orders;
CREATE POLICY "Allow public delete for ot_pre_operative_orders" ON public.ot_pre_operative_orders FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 53. Preoperative Order Sheets (Carewell Official Format)
CREATE TABLE IF NOT EXISTS public.ot_pre_operative_order_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_code TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  ipd_no TEXT,
  bed_no TEXT,
  surgeon_name TEXT,
  anesthetist_name TEXT,
  date_of_surgery DATE DEFAULT CURRENT_DATE,
  checklist_items JSONB DEFAULT '{"npo": true, "consent": true, "skinPrep": true, "vitalsChecked": true, "pacCleared": true, "denturesRemoved": true, "jewelleryRemoved": true, "voidedUrinated": true, "premedicationGiven": true, "bloodArranged": true}'::jsonb,
  doctor_signatures_status TEXT DEFAULT 'SIGNED',
  nursing_checklist_verifier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_pre_operative_order_sheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_pre_operative_order_sheets" ON public.ot_pre_operative_order_sheets;
CREATE POLICY "Allow public read for ot_pre_operative_order_sheets" ON public.ot_pre_operative_order_sheets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_pre_operative_order_sheets" ON public.ot_pre_operative_order_sheets;
CREATE POLICY "Allow public insert for ot_pre_operative_order_sheets" ON public.ot_pre_operative_order_sheets FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_pre_operative_order_sheets" ON public.ot_pre_operative_order_sheets;
CREATE POLICY "Allow public update for ot_pre_operative_order_sheets" ON public.ot_pre_operative_order_sheets FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_pre_operative_order_sheets" ON public.ot_pre_operative_order_sheets;
CREATE POLICY "Allow public delete for ot_pre_operative_order_sheets" ON public.ot_pre_operative_order_sheets FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 54. OT Room Live Status & Real-time Monitor
CREATE TABLE IF NOT EXISTS public.ot_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_room_no TEXT NOT NULL DEFAULT 'OT-1',
  current_schedule_id UUID REFERENCES public.ot_schedules(id) ON DELETE SET NULL,
  patient_name TEXT,
  procedure_name TEXT,
  surgeon_name TEXT,
  anesthetist_name TEXT,
  current_phase TEXT DEFAULT 'Pre-Op Prep',
  start_time TIMESTAMPTZ DEFAULT NOW(),
  estimated_completion_time TIMESTAMPTZ,
  delayed_reason TEXT,
  occupancy_status TEXT DEFAULT 'OCCUPIED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_status_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_status_logs" ON public.ot_status_logs;
CREATE POLICY "Allow public read for ot_status_logs" ON public.ot_status_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_status_logs" ON public.ot_status_logs;
CREATE POLICY "Allow public insert for ot_status_logs" ON public.ot_status_logs FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_status_logs" ON public.ot_status_logs;
CREATE POLICY "Allow public update for ot_status_logs" ON public.ot_status_logs FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_status_logs" ON public.ot_status_logs;
CREATE POLICY "Allow public delete for ot_status_logs" ON public.ot_status_logs FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- 55. Surgery Informed Consent Forms (Bilingual English & Hindi)
CREATE TABLE IF NOT EXISTS public.ot_surgery_consent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_ref_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  relative_guardian_name TEXT,
  relationship_to_patient TEXT,
  ipd_no TEXT,
  proposed_operation_english TEXT NOT NULL,
  proposed_operation_hindi TEXT,
  anesthesia_type_english TEXT DEFAULT 'General Anaesthesia',
  anesthesia_type_hindi TEXT DEFAULT 'सामान्य एनेस्थीसिया',
  explained_risks JSONB DEFAULT '["Bleeding", "Infection", "Allergic Reaction to Anesthesia", "Cardiovascular Complications"]'::jsonb,
  language_used TEXT DEFAULT 'Hindi / English',
  patient_signature_captured BOOLEAN DEFAULT TRUE,
  witness_signature_captured BOOLEAN DEFAULT TRUE,
  doctor_signature_captured BOOLEAN DEFAULT TRUE,
  doctor_name TEXT,
  consent_date DATE DEFAULT CURRENT_DATE,
  consent_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ot_surgery_consent_forms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for ot_surgery_consent_forms" ON public.ot_surgery_consent_forms;
CREATE POLICY "Allow public read for ot_surgery_consent_forms" ON public.ot_surgery_consent_forms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for ot_surgery_consent_forms" ON public.ot_surgery_consent_forms;
CREATE POLICY "Allow public insert for ot_surgery_consent_forms" ON public.ot_surgery_consent_forms FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public update for ot_surgery_consent_forms" ON public.ot_surgery_consent_forms;
CREATE POLICY "Allow public update for ot_surgery_consent_forms" ON public.ot_surgery_consent_forms FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '') IS NOT NULL);
DROP POLICY IF EXISTS "Allow public delete for ot_surgery_consent_forms" ON public.ot_surgery_consent_forms;
CREATE POLICY "Allow public delete for ot_surgery_consent_forms" ON public.ot_surgery_consent_forms FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '') IS NOT NULL);

-- REFRESH SCHEMA CACHE FOR POSTGREST (SUPER IMPORTANT AFTER EXECUTING ALTER STATEMENTS)
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- HOSPITAL MANAGEMENT SYSTEM - EXTENDED RELATIONAL SCHEMA
-- ==============================================================================

-- 1. IPD Special Clinical Charts (GRBS, Fluid I/O, Drains, Endoscopy Recovery)
CREATE TABLE IF NOT EXISTS public.special_grbs_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  monitoring_slot TEXT DEFAULT 'Pre-Lunch',
  grbs_value INTEGER NOT NULL,
  sliding_scale_units INTEGER DEFAULT 0,
  insulin_type_route TEXT,
  urine_ketones TEXT DEFAULT 'Negative',
  hypoglycemia_symptoms TEXT DEFAULT 'None',
  doctor_instructions TEXT,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.special_io_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  shift TEXT DEFAULT 'Morning (8am-2pm)',
  oral_water_ml INTEGER DEFAULT 0,
  iv_drips_ml INTEGER DEFAULT 0,
  tube_feed_ml INTEGER DEFAULT 0,
  blood_pcv_ml INTEGER DEFAULT 0,
  urine_output_ml INTEGER DEFAULT 0,
  ng_aspirate_ml INTEGER DEFAULT 0,
  drains_total_ml INTEGER DEFAULT 0,
  vomit_stool_ml INTEGER DEFAULT 0,
  nursing_remarks TEXT,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.special_drain_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  drain_name_type TEXT NOT NULL,
  anatomical_site TEXT,
  volume_output_ml INTEGER DEFAULT 0,
  color_aspect TEXT DEFAULT 'Serosanguineous',
  doctor_instructions TEXT,
  nursing_site_remarks TEXT,
  recorded_by TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.special_endo_recovery_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  bed_number TEXT,
  procedure_type TEXT DEFAULT 'Upper GI Endoscopy',
  bowel_prep_status TEXT DEFAULT 'Clear Yellow Liquid Stool',
  bp TEXT,
  pulse TEXT,
  spo2 TEXT,
  temp TEXT,
  abdominal_assessment TEXT DEFAULT 'Soft non-tender',
  diet_progression_order TEXT DEFAULT 'Sips of Water',
  biopsy_taken BOOLEAN DEFAULT FALSE,
  biopsy_details TEXT,
  doctor_recovery_instructions TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Carewell Operation Theatre Documentation
CREATE TABLE IF NOT EXISTS public.carewell_preop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  age_sex TEXT,
  ipd_no TEXT,
  hospital_no TEXT,
  surgery_name TEXT NOT NULL,
  anesthesia_type TEXT DEFAULT 'GA',
  order_date DATE DEFAULT CURRENT_DATE,
  npo_status TEXT DEFAULT 'Nil orally after midnight',
  diet_instructions TEXT DEFAULT 'Clear fluids till midnight',
  written_consent_verified BOOLEAN DEFAULT TRUE,
  skin_prep_instructions TEXT DEFAULT 'Abdominal skin prep with Savlon',
  pac_orders_followed BOOLEAN DEFAULT TRUE,
  morning_bath_instructions TEXT DEFAULT 'Morning Bath at 7.00 am with Savlon Soap',
  xylocaine_sensitivity TEXT DEFAULT 'Non-Sensitive',
  premedication_tablets JSONB DEFAULT '[]'::jsonb,
  iv_injections_antibiotics JSONB DEFAULT '[]'::jsonb,
  iv_fluids_orders JSONB DEFAULT '[]'::jsonb,
  blood_arrangements TEXT,
  special_directives TEXT,
  prescribed_by_doctor TEXT,
  nursing_execution_status TEXT DEFAULT 'Executed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.carewell_ot_summary_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_code TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  ipd_no TEXT,
  bed_no TEXT,
  surgeon_name TEXT,
  anesthetist_name TEXT,
  date_of_surgery DATE DEFAULT CURRENT_DATE,
  checklist_items JSONB DEFAULT '{"npo": true, "consent": true, "skinPrep": true, "vitalsChecked": true, "pacCleared": true, "denturesRemoved": true, "jewelleryRemoved": true, "voidedUrinated": true, "premedicationGiven": true, "bloodArranged": true}'::jsonb,
  doctor_signatures_status TEXT DEFAULT 'SIGNED',
  nursing_checklist_verifier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Endoscopy Direct Registration, Safety & Disinfection
CREATE TABLE IF NOT EXISTS public.endoscopy_direct_procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  procedure_category TEXT DEFAULT 'GI Procedure',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_name TEXT,
  procedure_cost NUMERIC(12,2) DEFAULT 0.00,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_status TEXT DEFAULT 'Paid',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.endoscopy_safety_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  consent_verified BOOLEAN DEFAULT TRUE,
  dentures_removed BOOLEAN DEFAULT TRUE,
  fasting_confirmed BOOLEAN DEFAULT TRUE,
  throat_spray_given BOOLEAN DEFAULT FALSE,
  monitoring_attached BOOLEAN DEFAULT TRUE,
  oxygen_supplemented BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.endoscopy_scope_disinfection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_serial_number TEXT NOT NULL,
  scope_model TEXT NOT NULL,
  disinfectant_chemical TEXT DEFAULT 'Cidex OPA / Ortho-phthalaldehyde',
  leak_test_passed BOOLEAN DEFAULT TRUE,
  cleaning_time_minutes INTEGER DEFAULT 20,
  rinse_completed BOOLEAN DEFAULT TRUE,
  logged_by TEXT NOT NULL,
  log_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Centralized Counter Payments
CREATE TABLE IF NOT EXISTS public.central_counter_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_mrn TEXT,
  patient_phone TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  amount DECIMAL(12,2) DEFAULT 0.00,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  discount_reason TEXT,
  payment_mode TEXT NOT NULL DEFAULT 'Cash',
  transaction_ref TEXT,
  bank_name TEXT,
  payer_name TEXT,
  remarks TEXT,
  settled_invoices JSONB DEFAULT '[]'::jsonb,
  collected_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Visiting Specialists / Consultants Directory & Consultations
CREATE TABLE IF NOT EXISTS public.visiting_specialists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  qualification TEXT,
  phone_number TEXT NOT NULL,
  default_fee DECIMAL(10,2) DEFAULT 1500.00,
  hospital_affiliation TEXT,
  visiting_schedule TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.visiting_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  uhid_mrn TEXT,
  ipd_number TEXT,
  ward_bed_no TEXT,
  consultation_date DATE DEFAULT CURRENT_DATE,
  consultation_time TEXT,
  consultation_type TEXT DEFAULT 'Cross-Consultation',
  visit_charges DECIMAL(10,2) DEFAULT 1500.00,
  bp TEXT,
  pulse TEXT,
  temp TEXT,
  spo2 TEXT,
  rr TEXT,
  reason_for_call TEXT,
  examination_findings TEXT,
  impression_diagnosis TEXT,
  detailed_orders_instructions TEXT,
  prescribed_dose TEXT,
  prescribed_frequency TEXT,
  prescribed_duration TEXT,
  recommended_investigations TEXT,
  specialist_id UUID REFERENCES public.visiting_specialists(id) ON DELETE SET NULL,
  specialist_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Emergency Resuscitation & Rapid Response Code Logs
CREATE TABLE IF NOT EXISTS public.emergency_resuscitation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_case_id UUID REFERENCES public.emergency_cases(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  code_start_time TIMESTAMPTZ DEFAULT NOW(),
  initial_rhythm TEXT DEFAULT 'PEA',
  cpr_cycles_performed INTEGER DEFAULT 0,
  shocks_delivered INTEGER DEFAULT 0,
  epinephrine_doses_given INTEGER DEFAULT 0,
  amiodarone_doses_given INTEGER DEFAULT 0,
  intubation_status TEXT DEFAULT 'Endotracheal Tube Placed',
  rosc_achieved BOOLEAN DEFAULT FALSE,
  rosc_time TIMESTAMPTZ,
  team_leader TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Inpatient Bed Transfers Audit Log
CREATE TABLE IF NOT EXISTS public.bed_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  from_bed_id UUID REFERENCES public.beds(id) ON DELETE SET NULL,
  to_bed_id UUID NOT NULL REFERENCES public.beds(id) ON DELETE CASCADE,
  from_ward TEXT,
  to_ward TEXT,
  reason TEXT,
  transferred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  transfer_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Pharmacy POS & Over-The-Counter Sales
CREATE TABLE IF NOT EXISTS public.pharmacy_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT UNIQUE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  doctor_name TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  tax_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_mode TEXT DEFAULT 'Cash',
  payment_status TEXT DEFAULT 'Paid',
  dispensed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pharmacy_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.pharmacy_sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.pharmacy_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  batch_number TEXT,
  expiry_date DATE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  tax_percentage DECIMAL(5,2) DEFAULT 0.00
);

-- 9. Clinical & Procedure Tariff Master Rates
CREATE TABLE IF NOT EXISTS public.clinical_procedure_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Clinical',
  rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cardiology_equipment_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.endo_procedure_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gastro_services_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hospital_room_rates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ward_type TEXT UNIQUE NOT NULL,
  daily_charge NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  nursing_charge NUMERIC(12,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- AUTOMATIC ROW LEVEL SECURITY (RLS) POLICIES & SUPABASE REALTIME REGISTRATION
-- ==============================================================================
DO $$
DECLARE
    r RECORD;
    tables text[] := ARRAY[
      'special_grbs_charts', 'special_io_charts', 'special_drain_charts', 
      'special_endo_recovery_charts', 'carewell_preop_orders', 
      'carewell_ot_summary_forms', 'endoscopy_direct_procedures', 
      'endoscopy_safety_checklists', 'endoscopy_scope_disinfection_logs', 
      'central_counter_payments', 'visiting_specialists', 'visiting_consultations', 
      'emergency_resuscitation_logs', 'bed_transfers', 'pharmacy_sales', 
      'pharmacy_sale_items', 'clinical_procedure_rates', 'cardiology_equipment_rates', 
      'endo_procedure_rates', 'gastro_services_rates', 'hospital_room_rates'
    ];
    tbl text;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = ANY(tables)
    )
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "Allow public read" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow public insert" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow public update" ON public.' || quote_ident(r.tablename);
        EXECUTE 'DROP POLICY IF EXISTS "Allow public delete" ON public.' || quote_ident(r.tablename);

        EXECUTE 'CREATE POLICY "Allow public read" ON public.' || quote_ident(r.tablename) || ' FOR SELECT TO authenticated, anon USING (true);';
        EXECUTE 'CREATE POLICY "Allow public insert" ON public.' || quote_ident(r.tablename) || ' FOR INSERT TO authenticated, anon WITH CHECK (coalesce(auth.role(), '''') IS NOT NULL);';
        EXECUTE 'CREATE POLICY "Allow public update" ON public.' || quote_ident(r.tablename) || ' FOR UPDATE TO authenticated, anon USING (coalesce(auth.role(), '''') IS NOT NULL) WITH CHECK (coalesce(auth.role(), '''') IS NOT NULL);';
        EXECUTE 'CREATE POLICY "Allow public delete" ON public.' || quote_ident(r.tablename) || ' FOR DELETE TO authenticated, anon USING (coalesce(auth.role(), '''') IS NOT NULL);';
    END LOOP;

    -- Register with Supabase Realtime Publication
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH tbl IN ARRAY tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
            EXCEPTION WHEN duplicate_object THEN
                NULL;
            END;
        END IF;
    END LOOP;
END $$;

-- REFRESH SCHEMA CACHE FOR POSTGREST (SUPER IMPORTANT AFTER EXECUTING ALTER STATEMENTS)
NOTIFY pgrst, 'reload schema';


