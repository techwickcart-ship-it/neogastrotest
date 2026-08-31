import re

with open("src/services/supabaseService.ts", "r", encoding="utf-8", errors="ignore") as f:
    code = f.read()

# Search for prescription methods
idx = 0
while True:
    pos = code.lower().find("prescription", idx)
    if pos == -1:
        break
    # Print around if it looks like a function definition
    snippet = code[max(0, pos-50):min(len(code), pos+250)]
    if any(k in snippet for k in ['createPrescription', 'getPrescriptions', 'updatePrescription', 'cleanPrescription', 'mapPrescription']):
        print("=== MATCH AT POS", pos, "===")
        print(code[max(0, pos-200):min(len(code), pos+600)])
        print("\n------------------------------------------------\n")
    idx = pos + 20
