#!/usr/bin/env python3
"""Generate art.js for the Tend Turn Companion from the official IV Studio
print-and-play PDFs, so the app shows the exact original artwork.

The artwork belongs to IV Studio. This script runs on YOUR machine against
the PDFs YOU downloaded, and the generated art.js stays local — don't commit
it or publish it (art.js is in .gitignore). Without art.js the app falls
back to its built-in color-matched chips.

Requirements: python3, pillow (pip install pillow), poppler-utils (pdfimages,
pdftoppm on PATH).

Usage:
    python3 tools/extract-art.py LowInk_FarmSheet.pdf LowInk_CargoManifest.pdf
    # writes art.js next to index.html
"""
import base64
import hashlib
import io
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops

# Icon key -> index in the deduplicated extraction order (farm PDF first,
# then cargo page 1; colorful CMYK images only). If IV Studio reissues the
# PDFs these indices may shift — regenerate the contact sheet to remap.
ICON_INDEX = {
    "coin": 8, "wood": 0, "exo": 2, "ore": 20, "copper": 11, "iron": 12,
    "geode": 22, "bone": 19, "jar": 6, "redbp": 4, "purplebp": 1, "heart": 5,
    "crystal": 56, "egg": 62, "milk": 32, "crop_s": 26, "crop_m": 27,
    "crop_l": 28, "special_crop": 29, "plant": 49, "fish": 25, "lure": 60,
    "squid": 35, "energy": 7, "medal": 42, "rod": 33, "rod2": 34,
    "fishrod": 15, "tendtool": 16, "hatchet": 14, "pickaxe": 13, "tools": 18,
    "x2": 44,
}
# Pond grid geometry on a 300dpi render of the farm sheet (3300x2550)
POND = {"cx0": 1783, "cy0": 691, "dx": 80.0, "dy": 78.3, "box": 80}
# Manifest row-reward icon strip on a 300dpi render of the cargo sheet
ROWS = {"x": 3050, "y0": 545, "dy": 74.5, "w": 72, "h": 72}


def b64(im, size):
    im = im.copy()
    im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def parse_list(pdf):
    out = subprocess.run(["pdfimages", "-list", pdf], capture_output=True, text=True).stdout
    rows = []
    for line in out.splitlines()[2:]:
        p = line.split()
        if len(p) >= 6:
            rows.append({"page": int(p[0]), "num": int(p[1]), "type": p[2],
                         "w": int(p[3]), "h": int(p[4]), "color": p[5]})
    return rows


def extract_icons(farm_pdf, cargo_pdf, tmp):
    unique, order = {}, []
    for pdf, prefix in [(farm_pdf, "f"), (cargo_pdf, "c")]:
        subprocess.run(["pdfimages", "-all", "-p", pdf, os.path.join(tmp, prefix)], check=True)
        rows = parse_list(pdf)
        for i, r in enumerate(rows):
            if r["type"] != "image" or r["color"] != "cmyk":
                continue
            if prefix == "c" and r["page"] != 1:
                continue
            if not (20 <= r["w"] <= 500):
                continue
            mask = None
            if i + 1 < len(rows) and rows[i + 1]["type"] == "smask":
                m = rows[i + 1]
                for ext in ("jpg", "png"):
                    p = os.path.join(tmp, f"{prefix}-{m['page']:03d}-{m['num']:03d}.{ext}")
                    if os.path.exists(p):
                        mask = p
                        break
            src = None
            for ext in ("jpg", "png"):
                p = os.path.join(tmp, f"{prefix}-{r['page']:03d}-{r['num']:03d}.{ext}")
                if os.path.exists(p):
                    src = p
                    break
            if not src:
                continue
            try:
                im = Image.open(src)
                if im.mode == "CMYK":
                    im = ImageChops.invert(im)  # Adobe CMYK JPEGs store inverted values
                im = im.convert("RGB").convert("RGBA")
                if mask:
                    m2 = Image.open(mask).convert("L")
                    if m2.size != im.size:
                        m2 = m2.resize(im.size)
                    im.putalpha(m2)
                key = hashlib.md5(im.tobytes()).hexdigest()
                if key not in unique:
                    unique[key] = im
                    order.append(key)
            except Exception:
                pass
    return [unique[k] for k in order]


def render_page(pdf, out_prefix):
    subprocess.run(["pdftoppm", "-png", "-r", "300", "-f", "1", "-l", "1", pdf, out_prefix], check=True)
    for suffix in ("-1.png", "-01.png", "-001.png"):
        if os.path.exists(out_prefix + suffix):
            return Image.open(out_prefix + suffix)
    raise SystemExit("pdftoppm produced no output for " + pdf)


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    farm_pdf, cargo_pdf = sys.argv[1], sys.argv[2]
    with tempfile.TemporaryDirectory() as tmp:
        icons = extract_icons(farm_pdf, cargo_pdf, tmp)
        print(f"extracted {len(icons)} unique icons")
        art = {}
        for key, idx in ICON_INDEX.items():
            if idx < len(icons):
                art[key] = b64(icons[idx], 40)
        farm = render_page(farm_pdf, os.path.join(tmp, "farm"))
        pond = {}
        for r in range(5):
            for c in range(5):
                x = int(POND["cx0"] + c * POND["dx"] - POND["box"] / 2)
                y = int(POND["cy0"] + r * POND["dy"] - POND["box"] / 2)
                pond[f"{r + 1},{c + 1}"] = b64(farm.crop((x, y, x + POND["box"], y + POND["box"])), 56)
        cargo = render_page(cargo_pdf, os.path.join(tmp, "cargo"))
        row_art = []
        for i in range(8):
            y = ROWS["y0"] + int(i * ROWS["dy"])
            row_art.append(b64(cargo.crop((ROWS["x"], y, ROWS["x"] + ROWS["w"], y + ROWS["h"])), 40))

    def js_obj(d):
        return "{" + ",".join(f'\n  "{k}": "{v}"' for k, v in d.items()) + "\n}"

    js = ("// Generated locally by tools/extract-art.py — artwork (c) IV Studio.\n"
          "// Personal use with your own copy of Tend. Do not commit or publish.\n"
          "window.TEND_ART = {\n"
          "icons: " + js_obj(art) + ",\n"
          "pond: " + js_obj(pond) + ",\n"
          "rows: [" + ",".join(f'\n  "{v}"' for v in row_art) + "\n]\n};\n")
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "art.js")
    with open(out, "w") as f:
        f.write(js)
    print(f"wrote {out} ({len(js) // 1024} KB) — open index.html and the exact art loads")


if __name__ == "__main__":
    main()
