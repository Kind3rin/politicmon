"""Dialogue busts: cut the two Higgsfield contact sheets into one transparent 96x96 PNG per character.

The sheets are in scripts/higgsfield-portraits.json (job, URL, prompt, cell order). Originals are fetched
into artifacts/m2/portraits when missing, so this repeats without new generations or credits.
"""
import json, urllib.request
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "scripts/higgsfield-portraits.json").read_text())
SOURCES = ROOT / "artifacts/m2/portraits"
OUT = ROOT / "public/sprites/portraits"
SIZE, COLORS, TOLERANCE = 96, 56, 34

def distance(a, b):
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))

def key_out_background(cell):
    """The cream behind each bust is flood-filled from the borders into transparency."""
    cell = cell.convert("RGBA")
    px = cell.load()
    w, h = cell.size
    reference = px[2, 2][:3]
    seen = [[False] * h for _ in range(w)]
    queue = deque()
    for x in range(w):
        queue.extend([(x, 0), (x, h - 1)])
    for y in range(h):
        queue.extend([(0, y), (w - 1, y)])
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]:
            continue
        seen[x][y] = True
        if distance(px[x, y][:3], reference) > TOLERANCE:
            continue
        px[x, y] = (0, 0, 0, 0)
        queue.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return cell

def fetch(sheet):
    path = SOURCES / sheet["file"]
    if not path.exists():
        SOURCES.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(sheet["url"], path)
    return path

OUT.mkdir(parents=True, exist_ok=True)
for sheet in MANIFEST["sheets"]:
    image = Image.open(fetch(sheet)).convert("RGB")
    cols, rows = sheet["grid"]
    for index, name in enumerate(sheet["cells"]):
        col, row = index % cols, index // cols
        box = (round(col * image.width / cols), round(row * image.height / rows),
               round((col + 1) * image.width / cols), round((row + 1) * image.height / rows))
        # Cells touch: leave a few pixels of the neighbours out of the crop.
        inset = 5
        cell = key_out_background(image.crop((box[0] + inset, box[1] + inset, box[2] - inset, box[3] - inset)))
        side = min(cell.size)
        left, top = (cell.width - side) // 2, cell.height - side
        cell = cell.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.Resampling.LANCZOS)
        alpha = cell.getchannel("A").point(lambda v: 255 if v > 127 else 0)
        flat = Image.new("RGB", cell.size, (244, 238, 220))
        flat.paste(cell, mask=alpha)
        paletted = flat.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGBA")
        paletted.putalpha(alpha)
        target = OUT / f"{name}.png"
        paletted.save(target, optimize=True)
        print(f"{target.relative_to(ROOT)} {target.stat().st_size} B")
