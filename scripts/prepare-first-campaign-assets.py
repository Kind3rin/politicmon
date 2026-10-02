"""Crop a completed, inspected generation to its runtime panorama; no synthesis."""
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--manifest', type=Path, default=Path('scripts/higgsfield-first-campaign.json'))
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
manifest_path = root / args.manifest
manifest = json.loads(manifest_path.read_text())
asset = manifest['assets'][0]
source = Image.open(args.source).convert('RGB')
w, h = asset['width'], asset['height']
crop_h = round(source.width * h / w)
crop_y = asset.get('cropTop', 0)
assert 0 <= crop_y and crop_y + crop_h <= source.height
image = source.crop((0, crop_y, source.width, crop_y + crop_h)).resize((w, h), Image.Resampling.NEAREST)
target = root / asset['path']
target.parent.mkdir(parents=True, exist_ok=True)
image.save(target, optimize=True)
asset['sourceSha256'] = hashlib.sha256(args.source.read_bytes()).hexdigest()
asset['sourceSize'] = list(source.size)
asset['outputSha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print(f'{target}: {w}x{h}, {target.stat().st_size} bytes')
