"""Legendary relic icons: cut the 2x2 Higgsfield sheet into four transparent 32x32 item PNGs.

Source and job are in scripts/higgsfield-relics.json; the original is fetched into artifacts/m2/portraits when missing.
"""
import json, urllib.request
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHEET = json.loads((ROOT / "scripts/higgsfield-relics.json").read_text())["sheet"]
SOURCE = ROOT / "artifacts/m2/portraits" / SHEET["file"]
OUT = ROOT / "public/sprites/items"
SIZE, TOLERANCE, COLORS = 32, 30, 28
# Tall objects are turned onto the diagonal so they fill the square instead of reading as a sliver.
ROTATE = {"telecomando": -40, "penna": 38}

def distance(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))

def key_out(cell):
    cell = cell.convert("RGBA"); px = cell.load(); w, h = cell.size; ref = px[2, 2][:3]
    seen = [[False] * h for _ in range(w)]; queue = deque()
    for x in range(w): queue.extend([(x, 0), (x, h - 1)])
    for y in range(h): queue.extend([(0, y), (w - 1, y)])
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]: continue
        seen[x][y] = True
        if distance(px[x, y][:3], ref) > TOLERANCE: continue
        px[x, y] = (0, 0, 0, 0)
        queue.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return cell

if not SOURCE.exists():
    SOURCE.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(SHEET["url"], SOURCE)
image = Image.open(SOURCE).convert("RGB")
cols, rows = SHEET["grid"]
for index, name in enumerate(SHEET["cells"]):
    col, row = index % cols, index // cols
    box = (round(col * image.width / cols), round(row * image.height / rows), round((col + 1) * image.width / cols), round((row + 1) * image.height / rows))
    cell = key_out(image.crop(box))
    cell = cell.crop(cell.getbbox())
    if name in ROTATE:
        cell = cell.rotate(ROTATE[name], expand=True, resample=Image.Resampling.BICUBIC); cell = cell.crop(cell.getbbox())
    side = max(cell.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0)); square.paste(cell, ((side - cell.width) // 2, (side - cell.height) // 2))
    icon = square.resize((SIZE - 2, SIZE - 2), Image.Resampling.LANCZOS)
    alpha = icon.getchannel("A").point(lambda v: 255 if v > 127 else 0)
    flat = Image.new("RGB", icon.size, (0, 0, 0)); flat.paste(icon, mask=alpha)
    pal = flat.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA"); pal.putalpha(alpha)
    final = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0)); final.paste(pal, (1, 1))
    target = OUT / f"{name}.png"; final.save(target, optimize=True)
    print(target.relative_to(ROOT), target.stat().st_size, "B")
