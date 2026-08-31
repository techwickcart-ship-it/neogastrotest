import re
import os

with open("src/services/supabaseService.ts", "r", encoding="utf-8", errors="ignore") as f:
    service_code = f.read()

with open("supabase_schema.sql", "r", encoding="utf-8", errors="ignore") as f:
    schema_code = f.read()

# Let's inspect the methods for consent, prescriptions, notes, vitals, patients in supabaseService
focus_tables = [
    'poor_prognosis_consents',
    'ot_consents',
    'prescriptions',
    'clinical_notes',
    'nursing_notes',
    'patient_vitals',
    'patients',
    'ipd_initial_evaluation_sheets',
    'carewell_ot_summary_forms',
    'carewell_preop_orders'
]

print("=== DEEP AUDIT OF FOCUS TABLES IN SUPABASE SERVICE ===")
for tbl in focus_tables:
    print(f"\n==================== TABLE: {tbl} ====================")
    # Check if in schema
    table_pattern = rf"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?{tbl}\s*\((.*?)\);"
    match = re.search(table_pattern, schema_code, re.DOTALL | re.IGNORECASE)
    if match:
        print("SCHEMA DEFINITION:")
        schema_def = match.group(1).strip()
        print(schema_def[:500] + ("..." if len(schema_def) > 500 else ""))
    else:
        print("--> TABLE MISSING FROM SCHEMA <--")

    # Find service methods referencing this table
    print("\nSERVICE IMPLEMENTATION CHUNKS:")
    method_pattern = rf"([a-zA-Z0-9_]+:\s*async\s*\([^)]*\)\s*=>\s*\{{[^}}]*?\.from\(['\"]{tbl}['\"][^}}]*?\}})"
    methods = re.findall(method_pattern, service_code, re.DOTALL)
    for m in methods[:4]:
        print("---")
        print(m[:400] + ("..." if len(m) > 400 else ""))
