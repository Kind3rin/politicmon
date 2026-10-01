"""Rebuild native UI assets from saved Higgsfield originals; no generation jobs."""
import argparse
import json
from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--download', action='store_true')
args = parser.parse_args()
manifest = json.loads((ROOT / 'scripts/higgsfield-evolution-dossier.json').read_text())
for asset in manifest['assets']:
    source = ROOT / 'artifacts/evolution-dossier' / f"{asset['id']}-source.png"
    if not source.exists():
        if not args.download:
            raise SystemExit(f'Missing source: {source}. Use --download to recover the existing original.')
        source.parent.mkdir(parents=True, exist_ok=True)
        urlretrieve(asset['sourceUrl'], source)
    image = Image.open(source).convert('RGB').resize((asset['width'], asset['height']), Image.Resampling.NEAREST)
    image = image.quantize(colors=48, dither=Image.Dither.NONE).convert('RGB')
    dest = ROOT / asset['path']
    dest.parent.mkdir(parents=True, exist_ok=True)
    image.save(dest, optimize=True)
    print(asset['id'], dest.stat().st_size)
