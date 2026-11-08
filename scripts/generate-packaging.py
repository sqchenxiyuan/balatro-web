"""Draw the five booster wrappers as native 64 x 104 pixel sprites.

Limited palettes, integer coordinates and binary font masks keep them in the
same graphic language as the card art. No photographic shading or soft glow.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets/packaging'
OUT.mkdir(exist_ok=True)
FONT = ROOT / 'public/assets/fonts/VT323-Regular.ttf'
W, H = 64, 104
INK, PAPER, GOLD, GOLD_LIGHT, GOLD_DARK = '#202d39', '#eee8ce', '#edbd58', '#ffe59b', '#b37a45'
THEMES = {
    'arcana': ('#775c92', '#443855', '#ad94be', '#d7bed7'),
    'celestial': ('#386c91', '#283b60', '#78a8bd', '#abd9d6'),
    'standard': ('#b6564d', '#6d3d46', '#d58973', '#edbaa0'),
    'buffoon': ('#4f896e', '#2c514d', '#86b58b', '#b7d4a2'),
    'spectral': ('#676997', '#3e416b', '#9c9cbd', '#c2cee2'),
}

def label(image, xy, value, size, colour=PAPER):
    """Threshold the font coverage instead of introducing anti-aliased colours."""
    mask = Image.new('L', image.size)
    ImageDraw.Draw(mask).text(xy, value, font=ImageFont.truetype(str(FONT), size), fill=255, anchor='mt')
    mask = mask.point(lambda p: 255 if p >= 110 else 0)
    image.paste(colour, mask=mask)

def star(d, x, y, colour=PAPER, size=2):
    d.rectangle((x-size,y,x+size,y), fill=colour)
    d.rectangle((x,y-size,x,y+size), fill=colour)

records=[]
for kind, (base, dark, light, pale) in THEMES.items():
    body = Image.new('RGBA', (W,H))
    d = ImageDraw.Draw(body)
    # The silhouette is a folded sachet, with a short square side and sealed ends.
    d.polygon([(3,8),(60,8),(60,13),(62,13),(62,88),(60,88),(60,97),(3,97),(3,92),(1,92),(1,14),(3,14)], fill=INK)
    d.rectangle((4,9,59,95), fill=base)
    d.rectangle((2,15,3,90), fill=light)
    d.rectangle((59,14,61,89), fill=dark)
    d.rectangle((5,11,6,92), fill=light)
    d.rectangle((57,12,58,94), fill=dark)
    d.line((8,12,55,12), fill=pale)
    d.line((8,92,55,92), fill=dark)
    # Sparse printed marks: visible pixels rather than foil crinkles.
    for y in range(27,73,12):
        for x in range(10,55,12):
            d.point((x,y), fill=light)
            d.point((x+4,y+5), fill=dark)
    for x,y in [(10,32),(53,29),(10,66),(53,67)]: star(d,x,y,light,1)
    d.rectangle((7,75,56,89), fill=dark)
    d.line((8,75,55,75), fill=light)
    label(body,(32,15),'BALATRO',12,PAPER)
    label(body,(32,77),kind.upper(),12,PAPER)
    # All illustrations live on their own transparent, equally sized plane.
    emblem = Image.new('RGBA',(W,H))
    e = ImageDraw.Draw(emblem)
    if kind=='celestial':
        e.polygon([(25,30),(38,30),(38,33),(44,33),(44,38),(47,38),(47,54),(43,54),(43,59),(36,59),(36,62),(24,62),(24,59),(19,59),(19,54),(17,54),(17,40),(20,40),(20,34),(25,34)], fill=INK)
        e.ellipse((20,33,44,59), fill=GOLD_DARK)
        e.ellipse((20,33,40,55), fill=GOLD)
        e.rectangle((26,35,35,37), fill=GOLD_LIGHT)
        e.line((23,43,40,43), fill=GOLD_DARK, width=2)
        e.line((23,51,37,51), fill=GOLD_LIGHT, width=2)
        ring=[(8,54),(12,49),(21,45),(21,49),(13,54),(13,57),(22,56),(41,47),(50,41),(50,38),(43,39),(43,35),(53,34),(56,37),(56,42),(49,48),(39,54),(22,61),(11,62),(8,59)]
        e.polygon(ring,fill=INK)
        e.line([(10,56),(13,52),(22,47)],fill=PAPER,width=2)
        e.line([(13,59),(22,58),(40,50),(53,41),(53,37),(44,37)],fill=GOLD_LIGHT,width=2)
        star(e,48,25,PAPER); star(e,15,66,light,1)
    elif kind=='arcana':
        e.polygon([(32,26),(52,47),(52,51),(32,72),(12,51),(12,47)], fill=INK)
        e.polygon([(32,29),(49,49),(32,68),(15,49)],fill=GOLD_DARK)
        e.polygon([(32,29),(46,48),(32,64),(17,48)],fill=GOLD)
        e.line([(19,47),(32,32),(43,45)],fill=GOLD_LIGHT,width=2)
        e.polygon([(21,48),(25,44),(38,44),(43,48),(43,51),(38,55),(25,55),(21,51)],fill=INK)
        e.polygon([(23,49),(27,46),(36,46),(40,49),(36,52),(27,52)],fill=PAPER)
        e.rectangle((30,45,34,53),fill=base)
        e.rectangle((31,47,33,51),fill=INK)
        star(e,13,31,pale,1);star(e,51,65,pale,1)
    elif kind=='standard':
        e.polygon([(14,35),(38,29),(47,62),(23,68)],fill=INK)
        e.polygon([(16,37),(37,32),(44,60),(24,65)],fill=light)
        e.rectangle((25,30,49,64),fill=INK)
        e.rectangle((27,32,47,62),fill=GOLD_DARK)
        e.rectangle((24,34,44,66),fill=INK)
        e.rectangle((26,36,42,64),fill=PAPER)
        e.rectangle((28,38,29,41),fill=base)
        e.polygon([(29,46),(31,43),(34,43),(35,45),(37,43),(40,43),(41,46),(41,49),(35,56),(29,49)],fill=base)
        e.rectangle((29,59,39,59),fill=GOLD_DARK)
    elif kind=='buffoon':
        e.polygon([(15,44),(12,29),(25,35),(32,24),(39,35),(52,29),(49,44),(47,55),(40,64),(24,64),(17,55)],fill=INK)
        e.polygon([(17,42),(15,32),(26,38),(32,27),(38,38),(49,32),(47,42)],fill=GOLD)
        e.polygon([(26,38),(32,27),(38,38),(37,42),(27,42)],fill='#ed7862')
        e.rectangle((18,43,46,46),fill=GOLD_LIGHT)
        e.polygon([(20,47),(44,47),(42,56),(37,61),(27,61),(22,56)],fill=PAPER)
        e.rectangle((24,49,28,51),fill=INK);e.rectangle((36,49,40,51),fill=INK)
        e.line([(26,55),(29,58),(35,58),(38,55)],fill='#b6564d',width=2)
        for x,y in [(13,28),(32,23),(51,28)]:
            e.rectangle((x-2,y-2,x+2,y+2),fill=INK);e.rectangle((x-1,y-1,x+1,y+1),fill=GOLD_LIGHT)
    else:
        e.polygon([(32,25),(39,35),(45,35),(45,41),(50,41),(50,59),(45,59),(45,68),(38,64),(32,70),(25,64),(18,68),(18,59),(14,59),(14,44),(19,44),(19,38),(25,38)],fill=dark)
        e.polygon([(32,29),(37,39),(43,39),(43,44),(47,44),(47,57),(42,57),(42,64),(37,60),(32,65),(26,60),(21,63),(21,55),(18,55),(18,46),(23,46),(23,41),(28,41)],fill='#77bdc6')
        e.polygon([(32,32),(34,42),(40,42),(40,46),(44,46),(44,55),(39,55),(39,59),(33,58),(30,62),(27,57),(23,58),(23,49),(26,49),(26,44),(30,44)],fill=PAPER)
        e.rectangle((26,47,29,52),fill=dark);e.rectangle((35,47,38,52),fill=dark)
        star(e,14,32,pale,1);star(e,51,67,pale,1)
    seal=Image.new('RGBA',(W,10))
    s=ImageDraw.Draw(seal)
    s.rectangle((1,1,62,9),fill=dark)
    s.rectangle((2,2,61,6),fill=base)
    for x in range(2,62,4):
        s.rectangle((x,0,x+1,5),fill=light)
        s.point((x,0),fill=pale)
        s.line((x,8,x+1,8),fill=pale)
    for suffix,im in [('body',body),('emblem',emblem),('seal',seal)]:
        name=f'{kind}-{suffix}.png'; im.save(OUT/name)
        records.append({'file':f'packaging/{name}','size':list(im.size),'colours':len(im.getcolors(maxcolors=1000))})
(OUT/'manifest.json').write_text(json.dumps({'style':'native pixel sprites; finite palette; no antialiasing',
    'provenance':'original code-drawn study art', 'items':records},indent=2),encoding='utf-8')
print('Generated 15 pixel wrapper layers for all five pack families.')
