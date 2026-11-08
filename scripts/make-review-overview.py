from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

root=Path(__file__).resolve().parents[1]
p=root/'research/previews'
font=ImageFont.truetype(str(root/'public/assets/fonts/VT323-Regular.ttf'),24)
out=Image.new('RGB',(1280,820),'#14251e');draw=ImageDraw.Draw(out)
for i,(file,label) in enumerate([
    ('stage-02-selection.png','01  TABLE / CARD INTERACTION'),
    ('stage-03-scoring.png','02  SCORING / FEEDBACK'),
    ('stage-04-shop.png','03  SHOP / BOOSTER PACKS'),
    ('stage-06-materials.png','04  MATERIAL / EDITION STUDIES'),
]):
    im=Image.open(p/file).convert('RGB').resize((640,360),Image.Resampling.LANCZOS)
    x,y=(i%2)*640,(i//2)*410
    draw.text((x+16,y+9),label,font=font,fill='#d6c88d')
    out.paste(im,(x,y+44))
out.save(p/'review-overview.jpg',quality=92)
print(p/'review-overview.jpg')
