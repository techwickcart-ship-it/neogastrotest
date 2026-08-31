with open("src/components/OPD.tsx", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

pos = code.find("handleSavePrescription")
if pos == -1:
    pos = code.find("savePrescription")
if pos != -1:
    print(code[pos:pos+2500])
