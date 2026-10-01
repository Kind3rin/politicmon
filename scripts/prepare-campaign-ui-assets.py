"""Prepare five recorded campaign backgrounds; install only after native review."""
import argparse
import hashlib
import json
from pathlib import Path
from shutil import copy2
from urllib.request import urlretrieve
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--download', action='store_true')
parser.add_argument('--install', action='store_true')
args = parser.parse_args()
base = ROOT/'artifacts/campaign-ui'
base.mkdir(parents=True, exist_ok=True)
manifest_path = ROOT/'scripts/higgsfield-campaign-ui.json'
manifest = json.loads(manifest_path.read_text())
outputs = []
for asset in manifest['assets']:
    assert asset['status']=='completed' and asset['kind']=='background'
    source = base/f"{asset['id']}-source.png"
    if not source.exists():
        if not args.download: raise FileNotFoundError(source)
        urlretrieve(asset['sourceUrl'],source)
    sha = hashlib.sha256(source.read_bytes()).hexdigest()
    if asset.get('sourceSha256') and sha!=asset['sourceSha256']: raise ValueError('Source checksum mismatch')
    asset['sourceSha256']=sha
    pixels = Image.open(source).convert('RGB').resize((asset['width'],asset['height']),Image.Resampling.NEAREST).convert('RGBA')
    dest=base/'staged'/asset['path'];dest.parent.mkdir(parents=True,exist_ok=True)
    pixels.quantize(colors=48,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert('RGBA').save(dest,optimize=True)
    outputs.append({'path':asset['path'],'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'size':list(pixels.size),'jobId':asset['jobId']})
proof=Image.new('RGB',(720,360),'#18243a');draw=ImageDraw.Draw(proof)
for i,output in enumerate(outputs):
    image=Image.open(base/'staged'/output['path']);image.thumbnail((230,150),Image.Resampling.NEAREST)
    x,y=i%3*240,i//3*180;proof.paste(image,(x,y));draw.text((x+4,y+158),Path(output['path']).stem,fill='white')
proof.save(base/'proof.png')
manifest['outputs']=outputs
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
if args.install:
    for output in outputs:
        dest=ROOT/output['path'];dest.parent.mkdir(parents=True,exist_ok=True);copy2(base/'staged'/output['path'],dest)
print(f"Prepared {len(outputs)} PNGs; {'installed' if args.install else 'staged'}.")
