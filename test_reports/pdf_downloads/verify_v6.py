"""Verify PDF individual do Wilson após iteration 6 fixes."""
import pdfplumber, pypdfium2 as pdfium, os, re

PDF = "/app/test_reports/pdf_downloads/wilson_report_v6.pdf"
OUT = "/app/test_reports/pdf_downloads"

# Render pages
pdf_doc = pdfium.PdfDocument(PDF)
print(f"Pages: {len(pdf_doc)}")
for i in range(len(pdf_doc)):
    page = pdf_doc[i]
    img = page.render(scale=2).to_pil()
    img.save(f"{OUT}/wilson_v6_page{i+1}.png")

# Extract text
with pdfplumber.open(PDF) as pdf:
    for i, page in enumerate(pdf.pages, start=1):
        text = page.extract_text() or ""
        print(f"\n===== PAGE {i} =====")
        print(text)

# Assertions
with pdfplumber.open(PDF) as pdf:
    p1 = pdf.pages[0].extract_text() or ""
    p2 = pdf.pages[1].extract_text() or "" if len(pdf.pages) > 1 else ""

print("\n===== CHECKS =====")

# 1) Sigma/Delta must be gone
has_sigma = "Σ" in p1 or "Σ" in p2
has_delta = "Δ" in p1 or "Δ" in p2
print(f"[{'FAIL' if has_sigma else 'PASS'}] No Σ present (found in p1={('Σ' in p1)}, p2={('Σ' in p2)})")
print(f"[{'FAIL' if has_delta else 'PASS'}] No Δ present (found in p1={('Δ' in p1)}, p2={('Δ' in p2)})")

# 2) Soma 8 pregas 132 mm on page 1 (INDICADORES table)
soma8_ok = ("Soma 8 pregas" in p1) and ("132 mm" in p1)
print(f"[{'PASS' if soma8_ok else 'FAIL'}] Page-1 INDICADORES row 'Soma 8 pregas' + '132 mm'")

# 3) Dif. peso / Dif. Peso / Dif. % MG / Dif. IMC / Dif. peso on page 1 OBJETIVO
labels = ["Dif. peso", "Dif. Peso", "Dif. % MG", "Dif. IMC"]
for lbl in labels:
    present = (lbl in p1) or (lbl in p2)
    print(f"[{'PASS' if present else 'INFO'}] Label '{lbl}' present in PDF: {present}")

# 4) Soma 8 on page 2 header (historic table)
soma8_p2 = "Soma 8" in p2
print(f"[{'PASS' if soma8_p2 else 'FAIL'}] Page-2 historic header contains 'Soma 8'")

# 5) EVOLUÇÃO present
evo = "EVOLUÇÃO" in p1
print(f"[{'PASS' if evo else 'FAIL'}] Page-1 EVOLUÇÃO heading present")

# 6) 'Soma 8 pregas' not with £ char
weird = "£" in p1 or "£" in p2
print(f"[{'FAIL' if weird else 'PASS'}] No garbled '£' character replacing Σ")
