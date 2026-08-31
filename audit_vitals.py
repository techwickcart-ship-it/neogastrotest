with open("src/services/supabaseService.ts", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

pos = code.find("cleanVitalsForPostgres")
if pos != -1:
    print(code[pos:pos+1500])
