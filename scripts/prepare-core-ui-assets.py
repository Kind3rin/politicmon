"""Prepare recorded Higgsfield UI sources in staging; install only after review."""
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
base = ROOT/'artifacts/core-ui'
base.mkdir(parents=True, exist_ok=True)
manifest_path = ROOT/'scripts/higgsfield-core-ui.json'
manifest = json.loads(manifest_path.read_text())
outputs = []

def cutout(image, target):
    image.thumbnail((384,384), Image.Resampling.NEAREST)
    image = image.convert('RGBA')
    w,h = image.size
    pixels = image.load()
    queue = deque([(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)])
    seen = set()
    while queue:
        x,y = queue.popleft()
        if (x,y) in seen or not (0<=x<w and 0<=y<h): continue
        seen.add((x,y))
        r,g,b,a = pixels[x,y]
        if min(r,g,b)<235 or max(r,g,b)-min(r,g,b)>12: continue
        pixels[x,y]=(r,g,b,0)
        queue.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
    bounds = image.getbbox()
    if not bounds or bounds[0]==0 or bounds[1]==0 or bounds[2]==w or bounds[3]==h:
        raise ValueError('Clipped or empty cutout')
    image = image.crop(bounds)
    image.thumbnail((target[0]-4,target[1]-4), Image.Resampling.NEAREST)
    result = Image.new('RGBA',target)
    result.alpha_composite(image,((target[0]-image.width)//2,(target[1]-image.height)//2))
    return result

for asset in manifest['assets']:
    assert asset['status']=='completed'
    source = base/f"{asset['id']}-source.png"
    if not source.exists():
        if not args.download: raise FileNotFoundError(source)
        urlretrieve(asset['sourceUrl'],source)
    sha = hashlib.sha256(source.read_bytes()).hexdigest()
    if asset.get('sourceSha256') and sha!=asset['sourceSha256']: raise ValueError('Source checksum mismatch')
    asset['sourceSha256']=sha
    image = Image.open(source).convert('RGB')
    if asset['kind']=='icons':
        parts=[]
        for i,name in enumerate(asset['items']):
            c,r=i%asset['cols'],i//asset['cols']
            cell=image.crop((c*image.width//asset['cols'],r*image.height//asset['rows'],(c+1)*image.width//asset['cols'],(r+1)*image.height//asset['rows']))
            parts.append((f'public/sprites/ui/{name}.png',cutout(cell,(32,32))))
    elif asset['kind']=='object':
        parts=[(asset['path'],cutout(image,(asset['width'],asset['height'])))]
    else:
        parts=[(asset['path'],image.resize((asset['width'],asset['height']),Image.Resampling.NEAREST).convert('RGBA'))]
    for path,pixels in parts:
        dest=base/'staged'/path;dest.parent.mkdir(parents=True,exist_ok=True)
        pixels.quantize(colors=48,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert('RGBA').save(dest,optimize=True)
        outputs.append({'path':path,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'size':list(pixels.size),'jobId':asset['jobId']})

proof=Image.new('RGB',(720,((len(outputs)+2)//3)*180),'#18243a');draw=ImageDraw.Draw(proof)
for i,output in enumerate(outputs):
    image=Image.open(base/'staged'/output['path'])
    if image.width<=48:image=image.resize((image.width*3,image.height*3),Image.Resampling.NEAREST)
    image.thumbnail((230,150),Image.Resampling.NEAREST)
    x,y=i%3*240,i//3*180;proof.paste(image,(x,y),image);draw.text((x+4,y+158),Path(output['path']).stem,fill='white')
proof.save(base/'proof.png')
manifest['outputs']=outputs
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
if args.install:
    for output in outputs:
        dest=ROOT/output['path'];dest.parent.mkdir(parents=True,exist_ok=True);copy2(base/'staged'/output['path'],dest)
print(f"Prepared {len(outputs)} PNGs; {'installed' if args.install else 'staged'}.")
