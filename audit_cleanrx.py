with open("src/services/supabaseService.ts", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

pos = code.find("cleanPrescriptionForPostgres")
if pos != -1:
    print(code[pos-50:pos+1200])
