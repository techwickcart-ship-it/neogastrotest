import re

with open("supabase_schema.sql", "r", encoding="utf-8", errors="ignore") as f:
    sql = f.read()

pos = sql.find("CREATE TABLE IF NOT EXISTS public.prescriptions")
if pos == -1:
    pos = sql.find("CREATE TABLE public.prescriptions")

if pos != -1:
    print(sql[pos:pos+1500])

print("\n--- ALTER TABLE FOR PRESCRIPTIONS IN SCHEMA ---")
alters = re.findall(r"ALTER\s+TABLE\s+(?:public\.)?prescriptions\s+.*?;", sql, re.IGNORECASE)
for a in alters:
    print(a)
