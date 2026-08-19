import fitz  # pymupdf
doc = fitz.open("/app/test_reports/pdf_downloads/iter9_wilson.pdf")
print(f"Pages: {len(doc)}")
for i, page in enumerate(doc):
    r = page.rect
    orient = "landscape" if r.width > r.height else "portrait"
    print(f"\n=== Page {i+1} ({orient}) size: {r.width:.1f} x {r.height:.1f} pt ===")
    # Search for footer "Desde 1930"
    hits = page.search_for("Desde 1930")
    for h in hits:
        print(f"  'Desde 1930' bbox y={h.y0:.1f}..{h.y1:.1f} pt (page height={r.height:.1f})")
    hits = page.search_for("Página")
    for h in hits:
        print(f"  'Página' bbox y={h.y0:.1f}..{h.y1:.1f} pt")
    # Check chart y-axis labels overlap with footer
    # Extract all text with position
    if i == 0:
        # Try to find "kg" labels in chart area
        for word in page.get_text("words"):
            x0, y0, x1, y1, text = word[:5]
            # focus on chart area (y roughly between 130 and 220 mm which is 370-620 pt)
            if 200 < y0 < 240 and any(ch.isdigit() for ch in text):
                pass  # print("   word:", text, "at", y0)
