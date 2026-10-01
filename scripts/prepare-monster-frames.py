"""Extract four reviewed Higgsfield poses; shared scale, fixed foot baseline."""
import argparse, json
from pathlib import Path
from urllib.request import urlretrieve
from PIL import Image
p=argparse.ArgumentParser(); p.add_argument('manifest'); args=p.parse_args()
root=Path(__file__).resolve().parent.parent
manifest=json.loads(Path(args.manifest).read_text())
for asset in manifest['assets']:
 if asset.get('kind','monster') != 'monster': continue
 source=root/'artifacts/premium'/f"{asset['id']}-sheet.png"
 source.parent.mkdir(parents=True,exist_ok=True)
 if not source.exists(): urlretrieve(asset['sourceUrl'],source)
 original=Image.open(source).convert('RGBA')
 if original.width != original.height: raise ValueError(f"Not square: {asset['id']}")
 frames=[]
 for i in range(4):
  size=original.width//2
  frame=original.crop(((i%2)*size,(i//2)*size,(i%2+1)*size,(i//2+1)*size))
  pixels=list(frame.get_flattened_data())
  pixels=[(r,g,b,0 if r>35 and b>35 and g<max(30,min(r,b)*.3) and .65<r/b<1.5 else 255) for r,g,b,a in pixels]
  frame.putdata(pixels)
  box=frame.getbbox()
  if not box: raise ValueError(f"Empty frame {asset['id']}:{i}")
  if box[0]<8 or box[1]<8 or box[2]>size-8 or box[3]>size-8: raise ValueError(f"Cell overlap {asset['id']}:{i}:{box}")
  frames.append(frame.crop(box))
 scale=min(54/max(f.width for f in frames),52/max(f.height for f in frames))
 sheet=Image.new('RGBA',(256,64))
 for i,frame in enumerate(frames):
  frame=frame.resize((max(1,round(frame.width*scale)),max(1,round(frame.height*scale))),Image.Resampling.NEAREST)
  sheet.paste(frame,(i*64+(64-frame.width)//2,58-frame.height))
 # One palette for all four poses. Clear hidden RGB before quantizing so
 # transparent magenta never contaminates the exported palette.
 mask=sheet.getchannel('A')
 rgb=Image.new('RGB',sheet.size,'black');rgb.paste(sheet.convert('RGB'),mask=mask)
 sheet=rgb.quantize(colors=48,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGBA')
 sheet.putalpha(mask)
 target=root/asset['path'];target.parent.mkdir(parents=True,exist_ok=True);sheet.save(target,optimize=True)
 print(asset['id'],target.stat().st_size,'bytes; 4 aligned 64px poses')
