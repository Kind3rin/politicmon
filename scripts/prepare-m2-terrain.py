"""Slice the reviewed 4x5 Higgsfield sheet into 16px game textures.
Usage: python prepare-m2-terrain.py [source PNG]. No generation or downloads.
"""
from pathlib import Path
import sys
from PIL import Image
source=Path(sys.argv[1] if len(sys.argv)>1 else 'artifacts/m2/terrain-atlas-source.png')
im=Image.open(source).convert('RGB')
root=Path('public/sprites/tiles/m2');root.mkdir(parents=True,exist_ok=True)
for row,kind in enumerate(['grass','path','sand','asphalt','floor']):
    cells=[]
    for col in range(4):
        box=(round(col*im.width/4),round(row*im.height/5),round((col+1)*im.width/4),round((row+1)*im.height/5))
        cells.append(im.crop(box).resize((16,16),Image.Resampling.BOX))
    # Quantize each material together, avoiding per-tile palette/brightness shifts.
    strip=Image.new('RGB',(64,16))
    for col,cell in enumerate(cells):strip.paste(cell,(col*16,0))
    strip=strip.quantize(colors=6,method=Image.Quantize.MEDIANCUT).convert('RGB')
    for col in range(4):
        tile=strip.crop((col*16,0,col*16+16,16))
        # Match opposite perimeter texels across all variants; no visible square seams.
        palette=sorted(tile.getcolors(256),reverse=True)
        edge=palette[0][1]
        if kind!='floor':
            shared=sorted(strip.getcolors(1024),reverse=True)[0][1]
            for i in range(16):
                tile.putpixel((i,0),shared);tile.putpixel((i,15),shared)
                tile.putpixel((0,i),shared);tile.putpixel((15,i),shared)
        tile.save(root/f'{kind}-{col}.png',optimize=True)
print('Prepared 20 reviewed terrain variants in',root)
