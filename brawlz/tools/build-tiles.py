#!/usr/bin/env python3
"""
Turns AI-generated tile art into game-ready tiles.

The generator hands back a 1024px square with the subject floating on a white
studio background. A game tile has to do the opposite: fill its square edge to
edge, so that identical tiles sitting side by side read as one continuous wall
or hedge rather than as a row of stickers.

So each tile is cropped to its subject, squared off, and the leftover
background is flooded with the subject's own darkest edge colour instead of
being left white or punched to alpha — a transparent corner shows the floor
through the middle of a wall, and a white one shows a chip of paper.

The floor tile is different: it already covers its whole square, so it is only
resized, and its edges are cross-faded into each other so the repeat does not
show a seam.

Usage:
    python3 tools/build-tiles.py art/generated/floor.png \
                                art/generated/wall.png \
                                art/generated/bush.png
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'art', 'tiles')
SIZE = 512
# Anything this bright and this grey is studio backdrop, not artwork.
BG_LUMA = 232
BG_SAT = 26


def background_mask(rgb):
    """True where the pixel is bright and colourless — the studio backdrop."""
    mx = rgb.max(axis=2).astype(np.int16)
    mn = rgb.min(axis=2).astype(np.int16)
    return (mx >= BG_LUMA) & ((mx - mn) <= BG_SAT)


def edge_connected(mask):
    """
    Keeps only the backdrop that touches the border.

    A flat flood from every bright pixel would also eat the light highlights
    inside the artwork; the real backdrop is the region you can reach from
    outside the frame.
    """
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                stack.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if mask[y, x] and not seen[y, x]:
                seen[y, x] = True
                stack.append((y, x))

    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                stack.append((ny, nx))
    return seen


def largest_component(subject):
    """
    Keeps only the biggest blob of subject.

    The generator likes to sprinkle a few white sparkles in a corner. They are
    bright but they are not backdrop, so they survive the backdrop test and then
    drag the crop box out to the full frame — which is how a tile ends up with
    the subject floating in the middle instead of filling its square.
    """
    labels, count = ndimage.label(subject)
    if count <= 1:
        return subject
    sizes = ndimage.sum(subject, labels, range(1, count + 1))
    return labels == (int(np.argmax(sizes)) + 1)


def darkest_edge_colour(rgb, subject):
    """The subject's own outline colour — what the corners get flooded with."""
    ys, xs = np.where(subject)
    if len(ys) == 0:
        return (40, 30, 25)
    sample = rgb[ys, xs]
    luma = sample.astype(np.int32).sum(axis=1)
    darkest = sample[luma <= np.percentile(luma, 4)]
    return tuple(int(v) for v in darkest.mean(axis=0))


def build_subject_tile(path, out_name):
    """Crop to the subject, square it off, flood the rest with its outline."""
    img = Image.open(path).convert('RGB')
    rgb = np.array(img)

    bg = edge_connected(background_mask(rgb))
    subject = largest_component(~bg)
    bg = ~subject

    ys, xs = np.where(subject)
    if len(ys) == 0:
        raise SystemExit('%s: no subject found — is it all background?' % path)
    top, bottom = ys.min(), ys.max()
    left, right = xs.min(), xs.max()

    fill = darkest_edge_colour(rgb, subject)
    flooded = rgb.copy()
    flooded[bg] = fill

    # Square the crop around the subject's centre so nothing gets stretched.
    # A hair of inset is kept on purpose: it reads as mortar between blocks.
    side = max(bottom - top, right - left) + 1
    cy, cx = (top + bottom) // 2, (left + right) // 2
    y0 = max(0, min(rgb.shape[0] - side, cy - side // 2))
    x0 = max(0, min(rgb.shape[1] - side, cx - side // 2))
    crop = Image.fromarray(flooded[y0:y0 + side, x0:x0 + side])

    tile = crop.resize((SIZE, SIZE), Image.LANCZOS)
    out = os.path.join(OUT_DIR, out_name)
    tile.save(out)
    return {'file': out_name, 'source': os.path.basename(path),
            'crop': [int(x0), int(y0), int(side), int(side)],
            'fill': list(fill), 'background_px': int(bg.sum())}


def build_floor_tile(path, out_name, blend=48):
    """
    Resize, then cross-fade the opposite edges into each other.

    The generator's "seamless" is approximate; a hard repeat shows a line every
    512 pixels. Blending a band of each edge with the wrapped-around band on the
    far side hides it, at the cost of a slightly softer strip.
    """
    img = Image.open(path).convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
    a = np.array(img).astype(np.float32)

    ramp = np.linspace(0, 1, blend, dtype=np.float32)

    # left edge blends with what wraps in from the right
    wrapped = np.roll(a, SIZE // 2, axis=1)
    for i in range(blend):
        w = 0.5 * (1 - ramp[i])
        a[:, i] = a[:, i] * (1 - w) + wrapped[:, i] * w
        a[:, SIZE - 1 - i] = a[:, SIZE - 1 - i] * (1 - w) + wrapped[:, SIZE - 1 - i] * w

    wrapped = np.roll(a, SIZE // 2, axis=0)
    for i in range(blend):
        w = 0.5 * (1 - ramp[i])
        a[i, :] = a[i, :] * (1 - w) + wrapped[i, :] * w
        a[SIZE - 1 - i, :] = a[SIZE - 1 - i, :] * (1 - w) + wrapped[SIZE - 1 - i, :] * w

    out = os.path.join(OUT_DIR, out_name)
    Image.fromarray(a.astype(np.uint8)).save(out)
    return {'file': out_name, 'source': os.path.basename(path), 'blend_px': blend}


def main():
    if len(sys.argv) != 4:
        raise SystemExit('usage: build-tiles.py <floor.png> <wall.png> <bush.png>')

    os.makedirs(OUT_DIR, exist_ok=True)
    report = {
        'floor': build_floor_tile(sys.argv[1], 'floor.png'),
        'wall': build_subject_tile(sys.argv[2], 'wall.png'),
        'bush': build_subject_tile(sys.argv[3], 'bush.png')
    }
    with open(os.path.join(OUT_DIR, 'tiles-report.json'), 'w') as fh:
        json.dump(report, fh, indent=2)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
