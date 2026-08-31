import re

with open("src/services/supabaseService.ts", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

keywords = ['prescriptions', 'ot_consents', 'poor_prognosis_consents', 'clinical_notes', 'nursing_notes', 'patient_vitals']

for kw in keywords:
    print(f"\n==================== TABLE: {kw} ====================")
    matches = [m.start() for m in re.finditer(rf"\.from\(['\"]{kw}['\"]\)", code)]
    for pos in matches:
        start = max(0, pos - 200)
        end = min(len(code), pos + 400)
        print("---")
        print(code[start:end])
