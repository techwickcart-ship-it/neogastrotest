import re

with open("supabase_schema.sql", "r", encoding="utf-8") as f:
    sql = f.read()

# 1. Update the top migration header block
migration_header_old = """-- === MIGRATION/UPDATE FOR INSTALLED DATABASES ===
-- If you already ran this schema previously, please execute the following statements to update patients, invoices, profiles, staff and clinical tables:"""

migration_header_new = """-- === MIGRATION/UPDATE FOR INSTALLED DATABASES ===
-- If you already ran this schema previously, execute the following SQL to ensure all tables, consents, prescriptions, notes, and vitals are fully up to date:
--
-- 1. POOR PROGNOSIS & HIGH-RISK CONSENT TABLE
CREATE TABLE IF NOT EXISTS public.poor_prognosis_consents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  admission_id UUID,
  patient_name TEXT NOT NULL,
  mrn TEXT,
  age TEXT,
  gender TEXT,
  ipd_no TEXT,
  bed_ward TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  diagnosis TEXT,
  comorbidities TEXT,
  clinical_condition TEXT,
  risk_category TEXT DEFAULT 'High Risk',
  critical_support JSONB DEFAULT '{}'::jsonb,
  counseling_date DATE DEFAULT CURRENT_DATE,
  counseling_time TEXT,
  relative_name TEXT,
  relative_relation TEXT,
  relative_phone TEXT,
  relative_address TEXT,
  relative_sign TEXT,
  doctor_name TEXT,
  doctor_designation TEXT,
  doctor_reg_no TEXT,
  doctor_sign TEXT,
  witness_name TEXT,
  witness_phone TEXT,
  witness_sign TEXT,
  language_spoken TEXT DEFAULT 'Bilingual',
  additional_clinical_notes TEXT,
  status TEXT DEFAULT 'Signed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.poor_prognosis_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for poor_prognosis_consents" ON public.poor_prognosis_consents;
CREATE POLICY "Allow public read for poor_prognosis_consents" ON public.poor_prognosis_consents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for poor_prognosis_consents" ON public.poor_prognosis_consents;
CREATE POLICY "Allow public insert for poor_prognosis_consents" ON public.poor_prognosis_consents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update for poor_prognosis_consents" ON public.poor_prognosis_consents;
CREATE POLICY "Allow public update for poor_prognosis_consents" ON public.poor_prognosis_consents FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete for poor_prognosis_consents" ON public.poor_prognosis_consents;
CREATE POLICY "Allow public delete for poor_prognosis_consents" ON public.poor_prognosis_consents FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_poor_prognosis_patient ON public.poor_prognosis_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_poor_prognosis_created ON public.poor_prognosis_consents(created_at DESC);

-- 2. OT CONSENT UPDATES
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS uhid_no TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS reg_no TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS procedure_name TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS doctor_sign TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS relative_name TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS relative_relation TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS relative_sign TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS patient_sign TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ot_consents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. PRESCRIPTIONS UPDATES
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS drawing TEXT;
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
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS vitals JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS complaints TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS examination_findings TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS past_history TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS investigations_advised TEXT;

-- 4. CLINICAL & NURSING NOTES UPDATES
ALTER TABLE public.clinical_notes ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE public.clinical_notes ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE public.clinical_notes ADD COLUMN IF NOT EXISTS subjective TEXT;
ALTER TABLE public.clinical_notes ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE public.clinical_notes ADD COLUMN IF NOT EXISTS assessment TEXT;
ALTER TABLE public.clinical_notes ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.clinical_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS nurse_name TEXT;
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS ward TEXT;
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS bed_no TEXT;
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.nursing_notes ADD COLUMN IF NOT EXISTS due_time TEXT;

-- 5. PATIENT VITALS COMPLETE COLUMNS
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS temp DECIMAL(5,2);
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS bp TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS rr INTEGER;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2);
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS cbs TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS rbs TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS sugar TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS blood_sugar TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS rs TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS cns TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS cvs TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS pa TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS per_abdomen TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS local_exam TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS input_output TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS io TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS pr TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS grbs TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS gcs TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS pain_scale TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS pallor TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS icterus TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS edema TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS clubbing TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS cyanosis TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS lymphadenopathy TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.patient_vitals ADD COLUMN IF NOT EXISTS recorded_by_name TEXT;
-- ===============================================
"""

if migration_header_old in sql:
    sql = sql.replace(migration_header_old, migration_header_new)

# 2. Add POOR PROGNOSIS CONSENTS table right after OT Consents
ot_section_needle = """CREATE TABLE IF NOT EXISTS public.ot_consents (
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
);"""

ot_section_updated = """CREATE TABLE IF NOT EXISTS public.ot_consents (
  id TEXT PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  terms TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  guardian_name TEXT,
  witness_name TEXT NOT NULL,
  uhid_no TEXT,
  reg_no TEXT,
  procedure_name TEXT,
  doctor_name TEXT,
  doctor_sign TEXT,
  relative_name TEXT,
  relative_relation TEXT,
  relative_sign TEXT,
  patient_sign TEXT,
  notes TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  signature_type TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  status TEXT DEFAULT 'Signed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poor Prognosis & High-Risk Consent Table
CREATE TABLE IF NOT EXISTS public.poor_prognosis_consents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  admission_id UUID,
  patient_name TEXT NOT NULL,
  mrn TEXT,
  age TEXT,
  gender TEXT,
  ipd_no TEXT,
  bed_ward TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  diagnosis TEXT,
  comorbidities TEXT,
  clinical_condition TEXT,
  risk_category TEXT DEFAULT 'High Risk',
  critical_support JSONB DEFAULT '{}'::jsonb,
  counseling_date DATE DEFAULT CURRENT_DATE,
  counseling_time TEXT,
  relative_name TEXT,
  relative_relation TEXT,
  relative_phone TEXT,
  relative_address TEXT,
  relative_sign TEXT,
  doctor_name TEXT,
  doctor_designation TEXT,
  doctor_reg_no TEXT,
  doctor_sign TEXT,
  witness_name TEXT,
  witness_phone TEXT,
  witness_sign TEXT,
  language_spoken TEXT DEFAULT 'Bilingual',
  additional_clinical_notes TEXT,
  status TEXT DEFAULT 'Signed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.poor_prognosis_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read for poor_prognosis_consents" ON public.poor_prognosis_consents;
CREATE POLICY "Allow public read for poor_prognosis_consents" ON public.poor_prognosis_consents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public insert for poor_prognosis_consents" ON public.poor_prognosis_consents;
CREATE POLICY "Allow public insert for poor_prognosis_consents" ON public.poor_prognosis_consents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public update for poor_prognosis_consents" ON public.poor_prognosis_consents;
CREATE POLICY "Allow public update for poor_prognosis_consents" ON public.poor_prognosis_consents FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public delete for poor_prognosis_consents" ON public.poor_prognosis_consents;
CREATE POLICY "Allow public delete for poor_prognosis_consents" ON public.poor_prognosis_consents FOR DELETE USING (true);
CREATE INDEX IF NOT EXISTS idx_poor_prognosis_patient ON public.poor_prognosis_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_poor_prognosis_created ON public.poor_prognosis_consents(created_at DESC);"""

if ot_section_needle in sql:
    sql = sql.replace(ot_section_needle, ot_section_updated)

# 3. Add poor_prognosis_consents and other missing tables to the ARRAY in RLS & Realtime publication
rls_array_needle = "'special_grbs_charts', 'special_io_charts', 'special_drain_charts'"
rls_array_replacement = "'poor_prognosis_consents', 'ot_consents', 'prescriptions', 'clinical_notes', 'nursing_notes', 'patient_vitals', 'special_grbs_charts', 'special_io_charts', 'special_drain_charts'"

if rls_array_needle in sql and "'poor_prognosis_consents'" not in sql[sql.find(rls_array_needle)-50:sql.find(rls_array_needle)+200]:
    sql = sql.replace(rls_array_needle, rls_array_replacement)

with open("supabase_schema.sql", "w", encoding="utf-8") as f:
    f.write(sql)

print("Successfully updated supabase_schema.sql!")
