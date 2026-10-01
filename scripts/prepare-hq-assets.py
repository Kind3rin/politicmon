"""Stage recorded Higgsfield headquarters illustrations; --install after review."""
import argparse
import hashlib
import json
from collections import deque
from pathlib import Path
from shutil import copy2
from urllib.request import urlretrieve
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--download', action='store_true')
parser.add_argument('--install', action='store_true')
args = parser.parse_args()
base = ROOT / 'artifacts/hq'
base.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / 'scripts/higgsfield-hq.json').read_text())
outputs = []
for asset in manifest['assets']:
    if asset['status'] != 'completed':
        raise ValueError(f"Unfinished asset: {asset['id']}")
    source = base / f"{asset['id']}-source.png"
    if not source.exists():
        if not args.download:
            raise FileNotFoundError(source)
        urlretrieve(asset['sourceUrl'], source)
    if asset.get('sourceSha256') and hashlib.sha256(source.read_bytes()).hexdigest() != asset['sourceSha256']:
        raise ValueError(f"{asset['id']}: source checksum mismatch")
    image = Image.open(source).convert('RGB')
    if 'items' not in asset:
        parts = [(asset['path'], image.resize((asset['width'], asset['height']), Image.Resampling.NEAREST).convert('RGBA'))]
    else:
        parts = []
        for index, name in enumerate(asset['items']):
            c, r = index % 3, index // 3
            cell = image.crop((c*image.width//3, r*image.height//2, (c+1)*image.width//3, (r+1)*image.height//2))
            inset = round(min(cell.size) * asset.get('processing', {}).get('cellInsetFraction', 0))
            if inset:
                cell = cell.crop((inset,inset,cell.width-inset,cell.height-inset))
            cell.thumbnail((384,384), Image.Resampling.NEAREST)
            cell = cell.convert('RGBA')
            w,h = cell.size
            pixels = cell.load()
            queue = deque([(x,y) for x in range(w) for y in (0,h-1)] + [(x,y) for y in range(h) for x in (0,w-1)])
            seen = set()
            while queue:
                x,y = queue.popleft()
                if (x,y) in seen or not (0 <= x < w and 0 <= y < h):
                    continue
                seen.add((x,y))
                red,green,blue,alpha = pixels[x,y]
                if min(red,green,blue) < 235 or max(red,green,blue)-min(red,green,blue) > 12:
                    continue
                pixels[x,y] = (red,green,blue,0)
                queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
            bounds = cell.getbbox()
            if not bounds or bounds[0] == 0 or bounds[1] == 0 or bounds[2] == w or bounds[3] == h:
                raise ValueError(f'Empty or clipped icon: {name}')
            cell = cell.crop(bounds)
            cell.thumbnail((28,28), Image.Resampling.NEAREST)
            icon = Image.new('RGBA',(32,32))
            icon.alpha_composite(cell,((32-cell.width)//2,(32-cell.height)//2))
            parts.append((f'public/sprites/ui/hq/{name}.png',icon))
    for path,pixels in parts:
        target = base / 'staged' / path
        target.parent.mkdir(parents=True,exist_ok=True)
        pixels.quantize(colors=48,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert('RGBA').save(target,optimize=True)
        outputs.append(path)
proof = Image.new('RGB',(720,400),'#18243a')
draw = ImageDraw.Draw(proof)
for index,path in enumerate(outputs):
    image = Image.open(base / 'staged' / path)
    image.thumbnail((220,120),Image.Resampling.NEAREST)
    x,y = (index%3)*240,(index//3)*133
    proof.paste(image,(x,y),image)
    draw.text((x+4,y+121),Path(path).stem,fill='white')
proof.save(base/'proof.png')
if args.install:
    for path in outputs:
        target = ROOT/path
        target.parent.mkdir(parents=True,exist_ok=True)
        copy2(base/'staged'/path,target)
print(f"Prepared {len(outputs)} headquarters PNGs; {'installed' if args.install else 'staged'}.")
