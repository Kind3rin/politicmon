"""Posture icons for the battle buttons: the three generated 1024×1024 pictures on a dark navy background become 96×96 PNGs with
transparency. The background is flood-filled from the picture's borders (the dark outline of the drawing stays), then one pass removes the
dark pixels that touch the transparent area, which clears the fringe a gradient leaves behind. Needs Pillow.

    python3 scripts/prepare-posture-icons.py attacca.png smentisci.png temporeggia.png
"""
import os
import sys

from PIL import Image, ImageDraw

NAMES = ["attacca", "smentisci", "tempo"]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "ui", "posture")
SEEDS_FRACTIONS = [(0, 0), (1, 0), (0, 1), (1, 1), (.5, 0), (0, .5), (1, .5), (.5, 1)]


def cut(path, name):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    for fx, fy in SEEDS_FRACTIONS:
        ImageDraw.floodfill(im, (min(w - 1, round(fx * (w - 1))), min(h - 1, round(fy * (h - 1)))), (0, 0, 0, 0), thresh=22)
    im = im.resize((96, 96), Image.LANCZOS)
    px = im.load()
    alpha = [[px[x, y][3] for x in range(96)] for y in range(96)]
    drop = []
    for y in range(96):
        for x in range(96):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            touches = any(0 <= x + dx < 96 and 0 <= y + dy < 96 and alpha[y + dy][x + dx] == 0 for dx in (-1, 0, 1) for dy in (-1, 0, 1))
            if (r + g + b) / 3 < 60 and touches:
                drop.append((x, y))
    for x, y in drop:
        px[x, y] = (0, 0, 0, 0)
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, f"{name}.png"), optimize=True)
    print(name, "fringe pixels removed:", len(drop))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit("usage: prepare-posture-icons.py attacca.png smentisci.png temporeggia.png")
    for source, name in zip(sys.argv[1:], NAMES):
        cut(source, name)
