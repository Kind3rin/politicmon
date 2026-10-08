"""Prepare native world sprites from recorded Higgsfield sheets; no generation.

By default stage files for inspection. --install copies reviewed output into public.
Only the white background connected to a cell edge is removed; interior cream
details remain opaque. Sheet order is recorded in the manifests.
"""
import argparse
import json
import hashlib
from collections import deque
from pathlib import Path
from shutil import copy2
from urllib.request import urlretrieve

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--download', action='store_true')
parser.add_argument('--install', action='store_true')
args = parser.parse_args()
BASE = ROOT / 'artifacts/world-redesign'
STAGE = BASE / 'staged'
BASE.mkdir(parents=True, exist_ok=True)


def cutout(cell, allow_bottom=False):
    if max(cell.size) > 384:
        factor = 384 / max(cell.size)
        cell = cell.resize((round(cell.width * factor), round(cell.height * factor)), Image.Resampling.NEAREST)
    image = cell.convert('RGBA')
    w, h = image.size
    pixels = image.load()
    queue = deque((x, y) for x in range(w) for y in (0, h - 1))
    queue.extend((x, y) for y in range(h) for x in (0, w - 1))
    seen = set()
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        r, g, b, a = pixels[x, y]
        if min(r, g, b) < 235 or max(r, g, b) - min(r, g, b) > 12:
            continue
        pixels[x, y] = (r, g, b, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    bounds = image.getbbox()
    if not bounds or (bounds[2] - bounds[0]) * (bounds[3] - bounds[1]) < w * h * .025:
        raise ValueError('Missing or nearly empty cell')
    if bounds[0] == 0 or bounds[1] == 0 or bounds[2] == w or (bounds[3] == h and not allow_bottom):
        raise ValueError('Sprite touches cell edge; inspect/regenerate sheet')
    return image.crop(bounds)


def finish_cutout(cell, kind):
    """Battle rows are drawn with white between figures that is not connected to the cell edge: remove pure white everywhere.
    Cream skin and paper stay opaque (they are not pure white)."""
    image = cutout(cell, allow_bottom=kind in ('building', 'battle-row'))
    if kind == 'battle-row':
        pixels = image.load()
        for y in range(image.height):
            for x in range(image.width):
                r, g, b, a = pixels[x, y]
                if a and min(r, g, b) >= 244 and max(r, g, b) - min(r, g, b) <= 8:
                    pixels[x, y] = (r, g, b, 0)
    return image


def fit(image, size, stretch=False, character=False):
    w, h = size
    if stretch:
        image = image.resize(size, Image.Resampling.NEAREST)
    else:
        limit = 28 if character else h - 2
        scale = min((w - 2) / image.width, limit / image.height)
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.NEAREST)
        canvas = Image.new('RGBA', size)
        canvas.alpha_composite(image, ((w - image.width) // 2, h - 2 - image.height))
        image = canvas
    return image.quantize(colors=48, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).convert('RGBA')


def strip_grid(cell):
    """Remove generated separator bars, retaining the complete object outline."""
    w, h = cell.size
    p = cell.load()
    vertical = [sum(min(p[x, y]) < 100 for y in range(h)) > h * .90 for x in range(w)]
    horizontal = [sum(min(p[x, y]) < 100 for x in range(w)) > w * .90 for y in range(h)]
    margin_x, margin_y = max(7, round(w * .05)), max(7, round(h * .05))
    left = max([x + 1 for x in range(margin_x) if vertical[x]] + [0])
    right = min([x for x in range(w - margin_x, w) if vertical[x]] + [w])
    top = max([y + 1 for y in range(margin_y) if horizontal[y]] + [0])
    bottom = min([y for y in range(h - margin_y, h) if horizontal[y]] + [h])
    # The generated bars have a few grey antialiasing pixels outside the navy.
    if left: left += 4
    if right < w: right -= 4
    if top: top += 4
    if bottom < h: bottom -= 4
    return cell.crop((left, top, right, bottom))


outputs = []


def separators(image, count, horizontal):
    """Locate white gutters: generators do not always obey equal cell spacing."""
    original_length = image.height if horizontal else image.width
    if max(image.size) > 768:
        factor = 768 / max(image.size)
        image = image.resize((round(image.width * factor), round(image.height * factor)), Image.Resampling.NEAREST)
    length = image.height if horizontal else image.width
    cross = image.width if horizontal else image.height
    pixels = image.load()
    blank = []
    for axis in range(length):
        dark = sum(min(pixels[c, axis] if horizontal else pixels[axis, c]) < 220 for c in range(cross))
        blank.append(dark <= cross * .003)
    runs = []
    start = None
    for i, empty in enumerate(blank + [False]):
        if empty and start is None:
            start = i
        if not empty and start is not None:
            if i - start >= 4:
                runs.append((start + i) // 2)
            start = None
    bounds = [0]
    for i in range(1, count):
        target = i * length / count
        candidates = [mid for mid in runs if abs(mid - target) <= length / count * .35 and mid > bounds[-1]]
        if not candidates:
            raise ValueError(f'No white gutter for separator {i}/{count}')
        bounds.append(min(candidates, key=lambda mid: abs(mid - target)))
    return [round(value * original_length / length) for value in bounds + [length]]


MANIFESTS = {'characters': 'scripts/higgsfield-world-characters.json', 'environment': 'scripts/higgsfield-world-environment.json', 'battle-art': 'scripts/higgsfield-battle-art.json'}
for name in MANIFESTS:
    manifest = json.loads((ROOT / MANIFESTS[name]).read_text())
    if args.download:
        for asset in manifest['assets']:
            source = BASE / f"{asset['id']}-source.png"
            if asset.get('status') == 'completed' and not source.exists():
                urlretrieve(asset['sourceUrl'], source)
    for asset in manifest['assets']:
        if asset.get('status') != 'completed':
            continue
        source = BASE / f"{asset['id']}-source.png"
        if not source.exists():
            if not args.download:
                raise FileNotFoundError(source)
            urlretrieve(asset['sourceUrl'], source)
        if asset.get('sourceSha256') and hashlib.sha256(source.read_bytes()).hexdigest() != asset['sourceSha256']:
            raise ValueError(f"{asset['id']}: source checksum mismatch")
        original = Image.open(source).convert('RGB')
        columns, rows = asset.get('columns', 1), asset.get('rows', 1)
        processing = asset.get('processing', {})
        if asset['kind'] in ('terrain', 'scene') or processing.get('grid') == 'uniform':
            xs = [round(i * original.width / columns) for i in range(columns + 1)]
            ys = [round(i * original.height / rows) for i in range(rows + 1)]
        else:
            try:
                xs, ys = separators(original, columns, False), separators(original, rows, True)
            except ValueError as error:
                raise ValueError(f"{asset['id']}: {error}") from error
        for row in range(rows):
            for column in range(columns):
                if row * columns + column in processing.get('skipCells', []):
                    continue
                if asset.get('outputs') and row * columns + column >= len(asset['outputs']):
                    continue
                inset = processing.get('inset', 0)
                bottom = ys[row] + round((ys[row + 1] - ys[row]) * processing.get('cellHeightFraction', 1))
                cell = original.crop((xs[column] + inset, ys[row] + inset, xs[column + 1] - inset, bottom - inset))
                if processing.get('stripGridLines'):
                    cell = strip_grid(cell)
                kind = asset['kind']
                if kind == 'character':
                    direction = asset.get('direction') or ('south', 'north', 'east', 'west')[column]
                    role = asset.get('role', asset['id'])
                    stem = 'player' if role == 'player' else f"npc_{role}"
                    path = f"public/sprites/chars/{stem}_{direction}{'' if row == 0 else '_w' + str(row - 1)}.png"
                    size = (asset['cellWidth'], asset['cellHeight'])
                elif kind == 'vehicle':
                    direction = ('south', 'north', 'east', 'west')[row * columns + column]
                    path = f"public/sprites/chars/{asset['id']}_{direction}.png"
                    size = (asset['cellWidth'], asset['cellHeight'])
                elif kind == 'single':
                    path = asset['path']
                    size = (asset['width'], asset['height'])
                else:
                    entry = asset['outputs'][row * columns + column]
                    if entry.get('superseded'):
                        continue
                    path, size = entry['path'], (entry['width'], entry['height'])
                try:
                    image = fit(cell.convert('RGBA') if kind in ('terrain', 'scene') else finish_cutout(cell, kind), size, stretch=kind in ('terrain', 'scene', 'building', 'battle-row'), character=kind == 'character' or asset['id'] == 'schettino')
                except ValueError as error:
                    cell.save(BASE / f"{asset['id']}-rejected-cell-{row}-{column}.png")
                    raise ValueError(f"{asset['id']} row {row} column {column}: {error}") from error
                target = STAGE / path
                target.parent.mkdir(parents=True, exist_ok=True)
                image.save(target, optimize=True)
                outputs.append({'path': path, 'size': size, 'jobId': asset['jobId'], 'id': asset['id'], 'bounds': image.getbbox()})

proof = Image.new('RGB', (800, max(1, (len(outputs) + 7) // 8) * 115), '#18243a')
draw = ImageDraw.Draw(proof)
for index, entry in enumerate(outputs):
    image = Image.open(STAGE / entry['path']).convert('RGBA')
    scale = min(2, 80 / image.width, 75 / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.NEAREST)
    x, y = (index % 8) * 100, (index // 8) * 115
    proof.paste(image, (x + (100 - image.width) // 2, y + 5), image)
    draw.text((x + 2, y + 82), Path(entry['path']).stem.replace('npc_', '')[:16], fill='#fff0a0')
proof.save(BASE / 'staged-proof.png')
(BASE / 'prepared-outputs.json').write_text(json.dumps(outputs, indent=2) + '\n')
if len({entry['path'] for entry in outputs}) != len(outputs):
    raise ValueError('Duplicate selected output path; resolve manifest before install')
if args.install:
    # Do not change public until every cell and output has passed preparation.
    for entry in outputs:
        target = ROOT / entry['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        copy2(STAGE / entry['path'], target)
print(f"Prepared {len(outputs)} native sprites; {'installed' if args.install else 'staged for visual inspection'}.")
