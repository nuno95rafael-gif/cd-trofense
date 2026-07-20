"""Verify Wilson individual PDF page-3 landscape + 3 photos layout."""
import pdfplumber, pypdfium2 as pdfium, os, json

pdf_path = "/app/test_reports/pdf_downloads/wilson_v7.pdf"
out_dir = "/app/test_reports/pdf_downloads"

results = {"pdf": pdf_path, "size_bytes": os.path.getsize(pdf_path), "pages": []}

with pdfplumber.open(pdf_path) as pdf:
    results["num_pages"] = len(pdf.pages)
    for i, pg in enumerate(pdf.pages, start=1):
        text = pg.extract_text() or ""
        # count images placeholders in text ignored, get image count via pdf.pages[i].images
        imgs = pg.images or []
        results["pages"].append({
            "page": i,
            "width_pt": round(pg.width, 2),
            "height_pt": round(pg.height, 2),
            "orientation": "landscape" if pg.width > pg.height else "portrait",
            "image_count": len(imgs),
            "text_excerpt": text[:600],
            "has_frente": "Frente" in text,
            "has_perfil": "Perfil" in text,
            "has_costas": "Costas" in text,
            "has_fotografias": "Fotografias" in text,
        })

# Render page-3 (index 2) as PNG for visual inspection
doc = pdfium.PdfDocument(pdf_path)
for i in range(len(doc)):
    page = doc[i]
    pil = page.render(scale=2).to_pil()
    pil.save(f"{out_dir}/wilson_v7_page{i+1}.png")
    results["pages"][i]["png"] = f"{out_dir}/wilson_v7_page{i+1}.png"

# Image sizes on page 3
with pdfplumber.open(pdf_path) as pdf:
    p3 = pdf.pages[2]
    results["page3_image_boxes"] = [
        {"x0": round(im["x0"],1), "y0": round(im["y0"],1),
         "x1": round(im["x1"],1), "y1": round(im["y1"],1),
         "w": round(im["width"],1), "h": round(im["height"],1)}
        for im in p3.images
    ]

print(json.dumps(results, indent=2, ensure_ascii=False))
with open(f"{out_dir}/verify_v7.json", "w") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
