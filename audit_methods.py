import re

with open("src/services/supabaseService.ts", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

# Let's inspect all save/insert/upsert methods for:
# poor_prognosis_consents, ot_consents, prescriptions, clinical_notes, patient_vitals, quick_registrations
methods_to_check = [
    'savePrescription',
    'savePoorPrognosisConsent',
    'getPoorPrognosisConsents',
    'saveOTConsent',
    'getOTConsents',
    'saveClinicalNote',
    'getClinicalNotes',
    'savePatientVitals',
    'getPatientVitals',
    'savePatient',
    'saveQuickRegistration'
]

for m in methods_to_check:
    print(f"==================== METHOD: {m} ====================")
    pattern = rf"({m}:\s*async\s*\(.*?\)\s*=>\s*\{{(?:[^{{}}]|(?:\<[^{{}}]*\>)|(?:\{{[^{{}}]*\}}))*\}})"
    # Better pattern: find index of m: async
    idx = code.find(f"{m}: async")
    if idx != -1:
        # print next 1000 characters
        print(code[idx:idx+1500])
    else:
        print("NOT FOUND directly")
