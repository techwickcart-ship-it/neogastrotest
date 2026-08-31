import re

with open("supabase_schema.sql", "r", encoding="utf-8", errors="ignore") as f:
    sql = f.read()

# Let's search for "ot_consents" or "clinical_notes" or "prescriptions" in supabase_schema.sql
for term in ['ot_consents', 'clinical_notes', 'prescriptions', 'patient_vitals', 'poor_prognosis']:
    pos = sql.find(term)
    print(f"Term '{term}' at pos: {pos}")
    if pos != -1:
        print(sql[max(0, pos-100):min(len(sql), pos+300)])
        print("-----------------------------------------")
