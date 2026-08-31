import re
import os

with open("src/services/supabaseService.ts", "r", encoding="utf-8", errors="ignore") as f:
    service_code = f.read()

with open("supabase_schema.sql", "r", encoding="utf-8", errors="ignore") as f:
    schema_code = f.read()

service_tables = sorted(list(set(re.findall(r"\.from\(['\"]([a-zA-Z0-9_-]+)['\"]\)", service_code))))
schema_tables = sorted(list(set(re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_-]+)", schema_code, re.IGNORECASE))))

missing = [t for t in service_tables if t not in schema_tables]
print("TOTAL SERVICE TABLES:", len(service_tables))
print("TOTAL SCHEMA TABLES:", len(schema_tables))
print("MISSING TABLES COUNT:", len(missing))
print("MISSING TABLES LIST:")
for m in missing:
    print(" -", m)

print("\n--- ALL SERVICE TABLES ---")
for t in service_tables:
    status = "OK" if t in schema_tables else "MISSING"
    print(f"[{status}] {t}")
