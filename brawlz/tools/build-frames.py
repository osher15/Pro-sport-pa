#!/usr/bin/env python3
"""
Keys a set of poses for ONE character and aligns them onto a shared canvas.

    python3 tools/build-frames.py <out-dir> --name=grandma-yarn --height=130 \
        idle=raw/idle.png walk_a=raw/walk_a.png walk_b=raw/walk_b.png

Why this exists instead of running dekey.py per pose: dekey trims each image to
its own content, so two poses of the same character end up with different
canvases and the sprite visibly jumps when the game swaps frames. Here every
pose is keyed, then placed on one common canvas with its FEET at the same
point — so only the limbs move, which is the whole idea.

Writes <name>-<pose>.png for each pose plus a frames.json fragment ready to
paste into characters.json.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dekey import border_colour, build_alpha, despill, drop_islands   # noqa: E402


def key_image(path, tol=48.0, soft=26.0, largest_only=False):
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    bg = border_colour(rgb)
    alpha = build_alpha(rgb, bg, tol, soft)
    alpha = drop_islands(alpha, largest_only=largest_only)
    rgb = despill(rgb, alpha, bg)
    return np.dstack([rgb, alpha * 255.0]).astype(np.uint8)


def content_box(rgba):
    ys, xs = np.where(rgba[:, :, 3] > 12)
    if len(ys) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def anchor_point(rgba, box, band=0.30):
    """
    The reference point every pose is stacked on: horizontally the centre of
    mass of the UPPER body, vertically the sole line.

    Feet are the wrong horizontal reference for a walk cycle — they are exactly
    what swings between steps, so aligning on them slides the whole character
    back and forth. The head and torso stay put while the legs move, which is
    what makes a two-frame cycle read as walking rather than as sliding.
    """
    x0, y0, x1, y1 = box
    height = y1 - y0
    upper = rgba[y0:int(y0 + height * band), x0:x1, 3]
    weights = upper.sum(axis=0).astype(float)
    if weights.sum() <= 0:
        return (x0 + x1) / 2.0, float(y1)
    xs = np.arange(x0, x1)
    return float((xs * weights).sum() / weights.sum()), float(y1)


def build(out_dir, name, poses, height, tol, largest_only):
    keyed = {}
    for pose, path in poses.items():
        rgba = key_image(path, tol=tol, largest_only=largest_only)
        box = content_box(rgba)
        if box is None:
            print(f"skipping {pose}: nothing left after keying")
            continue
        keyed[pose] = {"rgba": rgba, "box": box}

    if not keyed:
        raise SystemExit("no usable poses")

    # Each generation draws the character at a slightly different size, so
    # normalise every pose to a common body height before aligning. Without
    # this the frames pulse larger and smaller as they swap.
    heights = sorted(k["box"][3] - k["box"][1] for k in keyed.values())
    target_h = heights[len(heights) // 2]
    for pose, k in keyed.items():
        box_h = k["box"][3] - k["box"][1]
        # Clamped, because the bounding box is only a proxy for body size: a
        # prop that moves with the pose (the yarn ball, a raised weapon) stretches
        # it too. Generation-to-generation drift is a few percent, so correct
        # that and refuse to "fix" a difference that is really the pose itself.
        factor = max(0.92, min(1.08, target_h / box_h))
        if abs(factor - 1.0) > 0.005:
            img = Image.fromarray(k["rgba"], "RGBA")
            new_size = (max(1, round(img.width * factor)), max(1, round(img.height * factor)))
            k["rgba"] = np.asarray(img.resize(new_size, Image.LANCZOS))
            k["box"] = content_box(k["rgba"])
        k["foot"] = anchor_point(k["rgba"], k["box"])

    # canvas big enough for every pose, measured from the shared foot point
    left = max(k["foot"][0] - k["box"][0] for k in keyed.values())
    right = max(k["box"][2] - k["foot"][0] for k in keyed.values())
    top = max(k["foot"][1] - k["box"][1] for k in keyed.values())
    bottom = max(k["box"][3] - k["foot"][1] for k in keyed.values())

    pad = 4
    cw = int(round(left + right)) + pad * 2
    ch = int(round(top + bottom)) + pad * 2
    foot_x = int(round(left)) + pad
    foot_y = int(round(top)) + pad

    scale = height / ch if height else 1.0
    os.makedirs(out_dir, exist_ok=True)
    written = {}

    for pose, k in keyed.items():
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        crop = Image.fromarray(k["rgba"], "RGBA").crop(k["box"])
        offset = (
            int(round(foot_x - (k["foot"][0] - k["box"][0]))),
            int(round(foot_y - (k["foot"][1] - k["box"][1]))),
        )
        canvas.paste(crop, offset, crop)

        if scale != 1.0:
            canvas = canvas.resize(
                (max(1, round(cw * scale)), max(1, round(ch * scale))), Image.LANCZOS
            )

        fname = f"{name}-{pose}.png"
        canvas.save(os.path.join(out_dir, fname))
        written[pose] = fname
        print(f"{pose:8s} -> {fname}  {canvas.size}")

    # Two different anchors, easily confused: the poses are STACKED on their
    # feet (foot_y), but the game places the round hitbox at the character's
    # lower body, not under its soles. Only the horizontal part carries over.
    anchor = [round(foot_x / cw, 3), 0.62]
    fragment = {
        "frames": {p: f"art/sprites/{f}" for p, f in written.items()},
        "anchor": anchor,
    }
    with open(os.path.join(out_dir, f"{name}-frames.json"), "w", encoding="utf-8") as fh:
        json.dump(fragment, fh, ensure_ascii=False, indent=2)

    # Register every pose in the anchor report the game reads, so whichever
    # file ends up as the base sprite resolves to the same hitbox.
    report_path = os.path.join(out_dir, "dekey-report.json")
    report = []
    if os.path.exists(report_path):
        with open(report_path, encoding="utf-8") as fh:
            report = json.load(fh)
    report = [r for r in report if r.get("file") not in written.values()]
    for fname in written.values():
        report.append({"file": fname, "anchor": anchor, "sprite_size": [cw, ch]})
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    print(f"shared canvas {cw}x{ch}, stacked on feet; hitbox anchor {anchor}")
    return fragment


if __name__ == "__main__":
    args = sys.argv[1:]
    opts = {}
    poses = {}
    positional = []
    for a in args:
        if a.startswith("--") and "=" in a:
            k, v = a[2:].split("=", 1)
            opts[k] = v
        elif "=" in a:
            k, v = a.split("=", 1)
            poses[k] = v
        else:
            positional.append(a)

    if not positional or not poses:
        print(__doc__)
        sys.exit(1)

    build(
        positional[0],
        opts.get("name", "character"),
        poses,
        int(opts.get("height", 130)),
        float(opts.get("tol", 48)),
        bool(int(opts.get("largest", 0))),
    )
