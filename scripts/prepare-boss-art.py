"""Normalize approved Higgsfield key art to the native briefing banner."""
import json
from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image, ImageOps

root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'scripts/higgsfield-premium-next.json').read_text())
for asset in manifest['assets']:
 if asset.get('kind') != 'boss': continue
 source=root/'artifacts/premium-next'/f"{asset['id']}-boss.png"
 source.parent.mkdir(parents=True,exist_ok=True)
 if not source.exists(): urlretrieve(asset['sourceUrl'],source)
 original=Image.open(source).convert('RGB')
 # A complete portrait matters more than filling the last few pixels: contain
 # the source inside the banner, with a deliberate navy letterbox, no cropping.
 banner=Image.new('RGB',(224,78),'#17243d')
 fitted=ImageOps.contain(original,(224,78),Image.Resampling.NEAREST)
 banner.paste(fitted,((224-fitted.width)//2,(78-fitted.height)//2))
 banner=banner.quantize(colors=48,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
 target=root/asset['path'];target.parent.mkdir(parents=True,exist_ok=True);banner.save(target,optimize=True)
 print(asset['id'],target.stat().st_size,'bytes; complete 224x78 banner')
