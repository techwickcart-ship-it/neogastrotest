with open("src/types.ts", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

pos = code.find("export interface PoorPrognosisConsent")
if pos != -1:
    print(code[pos:pos+1500])
