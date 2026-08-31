with open("src/services/supabaseService.ts", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

pos = code.find("async function selfHealingQuery")
if pos != -1:
    print(code[pos:pos+2000])
