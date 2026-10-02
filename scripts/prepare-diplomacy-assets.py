"""Normalize inspected Diplomacy sources; crop, alpha threshold and nearest resize only."""
import hashlib, json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
path = ROOT / 'scripts/higgsfield-diplomacy.json'
manifest = json.loads(path.read_text())
for asset in manifest['assets']:
    source = ROOT / 'artifacts/diplomacy' / (asset['id'] + '.png')
    original = Image.open(source).convert('RGBA')
    asset['sourceSha256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    asset['sourceSize'] = list(original.size)
    size = (asset['width'], asset['height'])
    cells = [original]
    if asset['kind'] == 'directions':
        w, h = original.size
        cells = [original.crop((x*w//2, y*h//2, (x+1)*w//2, (y+1)*h//2)) for y in range(2) for x in range(2)]
        for index, extra in asset.get('directionSources', {}).items():
            extra_path = ROOT / extra['sourcePath']
            cells[int(index)] = Image.open(extra_path).convert('RGBA')
            extra['sourceSha256'] = hashlib.sha256(extra_path.read_bytes()).hexdigest()
            extra['sourceSize'] = list(cells[int(index)].size)
    asset['outputSha256s'] = {}
    for cell, output in zip(cells, asset.get('outputs', [asset.get('path')])):
        if asset['kind'] in ('briefing', 'backdrop'):
            crop_h = round(cell.width * size[1] / size[0])
            top = asset['cropTop']
            assert 0 <= top and top + crop_h <= cell.height
            image = cell.convert('RGB').crop((0, top, cell.width, top + crop_h)).resize(size, Image.Resampling.NEAREST)
            asset['cropBox'] = [0, top, cell.width, top + crop_h]
        elif asset['kind'] == 'texture':
            image = cell.convert('RGB').resize(size, Image.Resampling.NEAREST)
        else:
            asset['alphaCutoff'] = 128
            cell.putalpha(cell.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
            bounds = cell.getbbox()
            if not bounds: raise ValueError('Empty sprite: ' + asset['id'])
            image = cell.crop(bounds)
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
path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
