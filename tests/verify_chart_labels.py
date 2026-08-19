import pymupdf
doc = pymupdf.open("/app/test_reports/pdf_downloads/iter9_wilson.pdf")
p1 = doc[0]
# Find chart area — look for chart titles
for kw in ["Peso (kg)", "% MG"]:
    hits = p1.search_for(kw)
    for h in hits:
        print(f"'{kw}' at y={h.y0:.1f}")
# Look at Y axis labels — near "kg" values around chart
print("\nSample words with 'kg' in mid page (y=550-700):")
for w in p1.get_text("words"):
    x0, y0, x1, y1, text = w[:5]
    if 500 <= y0 <= 700 and ("kg" in text or "%" in text or any(c.isdigit() for c in text)):
        print(f"  y={y0:.1f} x={x0:.1f} '{text}'")
