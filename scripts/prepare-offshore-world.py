"""Normalize reviewed RGBA Higgsfield assets; no drawing or synthesis.

Drop near-transparent matte with a recorded alpha cutoff, split the four
literal directions, and use nearest resizing to native world footprints.
"""
import hashlib, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
manifest_path = ROOT / 'scripts/higgsfield-offshore.json'
manifest = json.loads(manifest_path.read_text())
for asset in manifest['assets']:
    if asset.get('kind') not in ('building', 'object', 'directions'):
        continue
    source = ROOT / 'artifacts/offshore' / (asset['id'] + '.png')
    original = Image.open(source).convert('RGBA')
    asset['sourceSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    asset['sourceSize'] = list(original.size)
    asset['alphaCutoff'] = 128
    cells = [original]
    if asset['kind'] == 'directions':
        w, h = original.size
        cells = [original.crop((x*w//2, y*h//2, (x+1)*w//2, (y+1)*h//2)) for y in range(2) for x in range(2)]
    asset['outputSha256s'] = {}
    for cell, output in zip(cells, asset.get('outputs', [asset['path']])):
        cell.putalpha(cell.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
        bounds = cell.getbbox()
        if not bounds:
            raise ValueError('Empty sprite: ' + asset['id'])
        image = cell.crop(bounds)
        size = (asset['width'], asset['height'])
        if asset['kind'] == 'building':
            image = image.resize(size, Image.Resampling.NEAREST)
        else:
            scale = min((size[0]-2)/image.width, (size[1]-2)/image.height)
            image = image.resize((max(1, round(image.width*scale)), max(1, round(image.height*scale))), Image.Resampling.NEAREST)
            native = Image.new('RGBA', size)
            native.alpha_composite(image, ((size[0]-image.width)//2, size[1]-1-image.height))
            image = native
        image = image.quantize(colors=48, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA')
        target = ROOT / output
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target, optimize=True)
        asset['outputSha256s'][output] = hashlib.sha256(target.read_bytes()).hexdigest()
        print(output, image.size, target.stat().st_size)
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
