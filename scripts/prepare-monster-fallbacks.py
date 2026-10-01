"""Stage native idle/action PNGs from the recorded Higgsfield animation strips."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from shutil import copy2
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--install', action='store_true')
args = parser.parse_args()
manifest = json.loads((ROOT/'scripts/higgsfield-monster-frames.json').read_text())
source = (ROOT/'src/art/monsters.ts').read_text()
def registry(name):
    return set(re.findall(r'"([a-z0-9-]+)"',re.search(name+r' = new Set<string>\(\[([\s\S]*?)\]\)',source).group(1)))
base_ids = registry('MONSTERS_WITH_PNG')
actions = registry('MONSTERS_WITH_ACTION_PNG')
assert base_ids == {asset['id'] for asset in manifest['assets']}
assert actions <= base_ids
base = ROOT/'artifacts/native-fallbacks'
base.mkdir(parents=True,exist_ok=True)
outputs = []
for asset in manifest['assets']:
    parent = ROOT/asset['path']
    image = Image.open(parent).convert('RGBA')
    if image.size != (256,64):
        raise ValueError(f"Invalid strip: {asset['id']} {image.size}")
    for pose in ([0,1] if asset['id'] in actions else [0]):
        sprite = image.crop((pose*64,0,(pose+1)*64,64))
        bounds = sprite.getbbox()
        if not bounds:
            raise ValueError(f"Empty sprite: {asset['id']} pose {pose}")
        path = f"public/sprites/monsters/{asset['id']}{'_action' if pose else ''}.png"
        dest = base/'staged'/path
        dest.parent.mkdir(parents=True,exist_ok=True)
        sprite.save(dest,optimize=True)
        outputs.append({'id':asset['id'],'path':path,'pose':pose,'jobId':asset.get('jobId',asset.get('job_id')),
          'parentPath':asset['path'],'parentSha256':hashlib.sha256(parent.read_bytes()).hexdigest(),
          'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'size':[64,64],'bounds':list(bounds)})
proof = Image.new('RGB',(800,((len(outputs)+7)//8)*100),'#18243a')
draw = ImageDraw.Draw(proof)
for i,output in enumerate(outputs):
    x,y=(i%8)*100,(i//8)*100
    sprite=Image.open(base/'staged'/output['path'])
    proof.paste(sprite,(x+18,y),sprite)
    draw.text((x+3,y+69),output['id'][:15],fill='white')
    draw.text((x+3,y+82),'action' if output['pose'] else 'idle',fill='#e6b944')
proof.save(base/'proof.png')
(ROOT/'scripts/higgsfield-monster-fallbacks.json').write_text(json.dumps({
 'version':1,'newGenerationCredits':0,'parentManifest':'scripts/higgsfield-monster-frames.json',
 'assets':outputs},indent=2)+'\n')
if args.install:
    for output in outputs:
        copy2(base/'staged'/output['path'],ROOT/output['path'])
print(f"Prepared {len(outputs)} native fallback PNGs; {'installed' if args.install else 'staged'}.")
