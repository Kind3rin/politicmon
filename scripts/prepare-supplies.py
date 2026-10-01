"""Convert the saved Higgsfield sheets into native RPG icons and backgrounds."""
import argparse
import json
from collections import deque
from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--download', action='store_true')
args = parser.parse_args()
manifest = json.loads((ROOT / 'scripts/higgsfield-supplies.json').read_text())
for asset in manifest['assets']:
    source = ROOT / 'artifacts/supplies' / f"{asset['id']}-source.png"
    if not source.exists():
        if not args.download:
            raise SystemExit(f'Missing {source}. Use --download to recover the existing image.')
        source.parent.mkdir(parents=True, exist_ok=True)
        urlretrieve(asset['sourceUrl'], source)
    image = Image.open(source).convert('RGB')
    if 'items' not in asset:
        dest = ROOT / asset['path']
        dest.parent.mkdir(parents=True, exist_ok=True)
        image = image.resize((asset['width'], asset['height']), Image.Resampling.NEAREST)
        image = image.quantize(colors=48, dither=Image.Dither.NONE).convert('RGB')
        image.save(dest, optimize=True)
        continue
    for index, item in enumerate(asset['items']):
        c, r = index % 3, index // 3
        cell = image.crop((c * image.width // 3, r * image.height // 2, (c+1) * image.width // 3, (r+1) * image.height // 2))
        # Remove only border-connected white, preserving ballot paper and glass highlights.
        w, h = cell.size
        pixels = cell.load()
        mask = Image.new('L', cell.size, 255)
        alpha = mask.load()
        queue = deque([(x, y) for x in range(w) for y in (0,h-1)] + [(x,y) for y in range(h) for x in (0,w-1)])
        while queue:
            x,y = queue.popleft()
            if not (0 <= x < w and 0 <= y < h) or alpha[x,y] == 0 or min(pixels[x,y]) < 235:
                continue
            alpha[x,y] = 0
            queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
        cell = cell.quantize(colors=32, dither=Image.Dither.NONE).convert('RGBA')
        cell.putalpha(mask)
        bounds = mask.getbbox()
        if not bounds:
            raise SystemExit(f'Empty icon: {item}')
        cell = cell.crop(bounds)
        cell.thumbnail((28,28), Image.Resampling.NEAREST)
        icon = Image.new('RGBA',(32,32))
        icon.paste(cell,((32-cell.width)//2,(32-cell.height)//2))
        dest = ROOT / 'public/sprites/items' / f'{item}.png'
        icon.save(dest,optimize=True)
        print(item,dest.stat().st_size)
