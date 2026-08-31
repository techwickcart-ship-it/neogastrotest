with open("src/components/OPD.tsx", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

pos = code.find("handleSavePrescription")
if pos != -1:
    print(code[pos+1800:pos+4500])
