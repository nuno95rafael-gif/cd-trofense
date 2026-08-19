import pymupdf
doc = pymupdf.open("/app/test_reports/pdf_downloads/iter9_wilson.pdf")
p1 = doc[0]
# words within y between 700-820 (near footer area)
print("Text in bottom area of page 1 (y=700-830):")
for w in p1.get_text("words"):
    x0, y0, x1, y1, text = w[:5]
    if 700 <= y0 <= 830:
        print(f"  y={y0:.1f} x={x0:.1f} '{text}'")
