#!/usr/bin/env python3
"""
Turns a generated character image on a flat background into a game-ready sprite
with real transparency.

    python3 tools/dekey.py <in.png|dir> <out-dir> [--tol=48] [--max=512] [--pad=6]

Why it is not a plain "delete every green pixel": characters in this roster are
often green themselves (cactus, pineapple, ogre, zombie). So the background
colour is sampled from the border, and only the regions that are BOTH
background-coloured AND connected to the image edge are removed. A green cactus
in the middle of the frame survives.

Steps: sample border colour -> distance mask -> keep only edge-connected regions
-> soft alpha ramp on the boundary -> despill the colour bleed on the fringe ->
trim to content -> optional downscale.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

try:
    from scipy import ndimage
    HAVE_SCIPY = True
except ImportError:                                    # degrades, doesn't break
    HAVE_SCIPY = False


def border_colour(rgb, band=4):
    """Median colour of the frame's outer band — the presumed background."""
    top = rgb[:band].reshape(-1, 3)
    bottom = rgb[-band:].reshape(-1, 3)
    left = rgb[:, :band].reshape(-1, 3)
    right = rgb[:, -band:].reshape(-1, 3)
    return np.median(np.concatenate([top, bottom, left, right]), axis=0)


def build_alpha(rgb, bg, tol, soft):
    """0 = fully background, 255 = fully character, with a soft ramp between."""
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    inner, outer = tol, tol + soft
    alpha = np.clip((dist - inner) / max(outer - inner, 1e-6), 0.0, 1.0)

    if HAVE_SCIPY:
        # Only background-coloured blobs that touch the edge count as background.
        bg_mask = alpha < 0.5
        labels, count = ndimage.label(bg_mask)
        if count:
            edge_labels = set(labels[0].tolist()) | set(labels[-1].tolist())
            edge_labels |= set(labels[:, 0].tolist()) | set(labels[:, -1].tolist())
            edge_labels.discard(0)
            connected = np.isin(labels, list(edge_labels))
            # anything background-coloured but enclosed by the character stays opaque
            alpha = np.where(bg_mask & ~connected, 1.0, alpha)
    return alpha


def despill(rgb, alpha, bg):
    """Kill the background colour bleeding onto the character's fringe."""
    out = rgb.copy()
    dominant = int(np.argmax(bg))                      # 1 for a green screen
    others = [i for i in (0, 1, 2) if i != dominant]
    cap = np.maximum(out[:, :, others[0]], out[:, :, others[1]])
    fringe = alpha < 0.98
    channel = out[:, :, dominant]
    out[:, :, dominant] = np.where(fringe, np.minimum(channel, cap + 12), channel)
    return out


def trim(rgba, pad):
    a = rgba[:, :, 3]
    ys, xs = np.where(a > 12)
    if len(ys) == 0:
        return rgba
    y0, y1 = max(int(ys.min()) - pad, 0), min(int(ys.max()) + pad + 1, rgba.shape[0])
    x0, x1 = max(int(xs.min()) - pad, 0), min(int(xs.max()) + pad + 1, rgba.shape[1])
    return rgba[y0:y1, x0:x1]


def process(path, out_dir, tol=48.0, soft=26.0, pad=6, max_side=512):
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im).astype(np.float32)

    bg = border_colour(rgb)
    alpha = build_alpha(rgb, bg, tol, soft)
    rgb = despill(rgb, alpha, bg)

    rgba = np.dstack([rgb, alpha * 255.0]).astype(np.uint8)
    before = rgba.shape[:2]
    rgba = trim(rgba, pad)

    sprite = Image.fromarray(rgba, "RGBA")
    if max_side and max(sprite.size) > max_side:
        scale = max_side / max(sprite.size)
        sprite = sprite.resize(
            (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
            Image.LANCZOS,
        )

    os.makedirs(out_dir, exist_ok=True)
    name = os.path.splitext(os.path.basename(path))[0] + ".png"
    out_path = os.path.join(out_dir, name)
    sprite.save(out_path)

    kept = float((alpha > 0.5).mean())
    return {
        "file": name,
        "background_rgb": [int(v) for v in bg],
        "kept_ratio": round(kept, 4),
        "source_size": [before[1], before[0]],
        "sprite_size": list(sprite.size),
        "scipy_used": HAVE_SCIPY,
    }


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = {}
    for a in sys.argv[1:]:
        if a.startswith("--") and "=" in a:
            k, v = a[2:].split("=", 1)
            opts[k] = float(v)
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)

    src, out_dir = args[0], args[1]
    paths = (
        [os.path.join(src, f) for f in sorted(os.listdir(src))
         if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]
        if os.path.isdir(src) else [src]
    )

    report = [process(
        p, out_dir,
        tol=opts.get("tol", 48.0),
        soft=opts.get("soft", 26.0),
        pad=int(opts.get("pad", 6)),
        max_side=int(opts.get("max", 512)),
    ) for p in paths]

    with open(os.path.join(out_dir, "dekey-report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    for r in report:
        print(f"{r['file']}: bg={r['background_rgb']} kept={r['kept_ratio']:.0%} "
              f"{r['source_size']} -> {r['sprite_size']}")
    if not HAVE_SCIPY:
        print("note: scipy missing — enclosed background-coloured areas were not protected")
