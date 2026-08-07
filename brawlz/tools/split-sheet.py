#!/usr/bin/env python3
"""
Slices a uniform character-sheet grid into one PNG per character.

    python3 tools/split-sheet.py <sheet.png> <out-dir> [--cols 7] [--rows 5]

Names come from names.json next to this script when the tile count matches;
otherwise tiles fall back to positional names (r1c1, r1c2, ...).
Also writes a numbered contact sheet and a manifest.json.
"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def load_names(count):
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "names.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        names = json.load(fh)
    return names if len(names) == count else None


def slice_sheet(sheet_path, out_dir, cols, rows, inset=3):
    im = Image.open(sheet_path).convert("RGB")
    W, H = im.size
    os.makedirs(out_dir, exist_ok=True)

    names = load_names(cols * rows)
    manifest = []

    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c
            left = round(W * c / cols) + inset
            right = round(W * (c + 1) / cols) - inset
            top = round(H * r / rows) + inset
            bottom = round(H * (r + 1) / rows) - inset
            tile = im.crop((left, top, right, bottom))

            entry = names[idx] if names else {"slug": f"r{r+1}c{c+1}", "he": "", "note": ""}
            fname = f"{idx+1:02d}_{entry['slug']}.png"
            tile.save(os.path.join(out_dir, fname))

            manifest.append({
                "index": idx + 1,
                "file": fname,
                "row": r + 1,
                "col": c + 1,
                "slug": entry["slug"],
                "name_he": entry.get("he", ""),
                "note": entry.get("note", ""),
                "size": list(tile.size),
            })

    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)

    return im, manifest


def contact_sheet(sheet, manifest, cols, rows, out_path, scale=2):
    """Numbered index over an upscaled copy of the sheet, for eyeballing names."""
    W, H = sheet.size
    big = sheet.resize((W * scale, H * scale), Image.LANCZOS)
    strip = 26
    canvas = Image.new("RGB", (big.width, big.height + strip * rows), "#101018")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(FONT_PATH, 15)

    cw = big.width / cols
    ch = big.height / rows

    for r in range(rows):
        y_img = round(r * (ch + strip))
        canvas.paste(big.crop((0, round(r * ch), big.width, round((r + 1) * ch))), (0, y_img))
        for c in range(cols):
            item = manifest[r * cols + c]
            label = f"{item['index']:02d} {item['slug']}"
            draw.text((round(c * cw) + 6, y_img + round(ch) + 5), label, font=font, fill="#ffd166")
            draw.rectangle(
                [round(c * cw), y_img, round((c + 1) * cw) - 1, y_img + round(ch) - 1],
                outline="#2a2f42", width=1,
            )

    canvas.save(out_path)
    return out_path


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = {a.split("=")[0]: a.split("=")[1] for a in sys.argv[1:] if "=" in a and a.startswith("--")}
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)

    cols = int(opts.get("--cols", 7))
    rows = int(opts.get("--rows", 5))
    sheet, manifest = slice_sheet(args[0], args[1], cols, rows)
    contact = contact_sheet(sheet, manifest, cols, rows, os.path.join(args[1], "_contact-sheet.jpg"))
    print(f"wrote {len(manifest)} tiles to {args[1]}")
    print(f"tile size: {manifest[0]['size'][0]}x{manifest[0]['size'][1]}")
    print(f"contact sheet: {contact}")
