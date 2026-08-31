import re

with open("supabase_schema.sql", "r", encoding="utf-8", errors="ignore") as f:
    sql = f.read()

tables_to_view = [
    'ot_consents',
    'prescriptions',
    'clinical_notes',
    'nursing_notes',
    'patient_vitals'
]

for t in tables_to_view:
    print(f"\n==================== TABLE: {t} in supabase_schema.sql ====================")
    matches = [m.start() for m in re.finditer(rf"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?{t}\s*\(", sql, re.IGNORECASE)]
    for pos in matches:
        end_pos = sql.find(");", pos)
        if end_pos != -1:
            print(sql[pos:end_pos+2])
