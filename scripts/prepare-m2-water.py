from pathlib import Path
from PIL import Image
im=Image.open('artifacts/m2/water-source.png').convert('RGB')
strip=Image.new('RGB',(64,16))
for i in range(4):
    x,y=i%2,i//2
    cell=im.crop((x*im.width//2,y*im.height//2,(x+1)*im.width//2,(y+1)*im.height//2)).resize((16,16),Image.Resampling.BOX)
    strip.paste(cell,(i*16,0))
strip=strip.quantize(colors=5).convert('RGB')
base=sorted(strip.getcolors(1024),reverse=True)[0][1]
for i in range(4):
    tile=strip.crop((i*16,0,i*16+16,16))
    for n in range(16):
        for xy in [(n,0),(n,15),(0,n),(15,n)]:tile.putpixel(xy,base)
    tile.save(Path('public/sprites/tiles/m2')/f'water-{i}.png',optimize=True)
