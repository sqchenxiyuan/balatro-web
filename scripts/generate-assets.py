"""Draw 65 original study assets and index the separately sourced 150 Joker references."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, math, runpy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/assets'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 71, 95
CREAM = '#eeeada'
INK = '#263238'
RED = '#ed594b'
BLUE = '#45a5c5'
YELLOW = '#edc75b'
FONT_PATH = OUT / 'fonts/VT323-Regular.ttf'

def font(size):
    return ImageFont.truetype(str(FONT_PATH), size) if FONT_PATH.exists() else ImageFont.load_default()

def text(d, xy, label, size=12, fill=INK, anchor=None):
    d.text(xy, label, font=font(size), fill=fill, anchor=anchor, stroke_width=0)

def suit(d, kind, cx, cy, s=1, color=None):
    color = color or (RED if kind in 'HD' else INK)
    # Handmade pixel silhouettes, each based on an 8 x 9 grid.
    pixels = {
        'H': ['01100110','11111111','11111111','11111111','01111110','00111100','00011000'],
        'D': ['00011000','00111100','01111110','11111111','01111110','00111100','00011000'],
        'S': ['00011000','00111100','01111110','11111111','11111111','01111110','00011000','00111100'],
        'C': ['00111100','00111100','00011000','11111111','11111111','01111110','00011000','00111100'],
    }[kind]
    x0,y0 = round(cx-4*s),round(cy-len(pixels)*s/2)
    for y,row in enumerate(pixels):
        for x,p in enumerate(row):
            if p=='1':d.rectangle((x0+x*s,y0+y*s,x0+(x+1)*s-1,y0+(y+1)*s-1),fill=color)

def base(color=CREAM):
    im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
    d.rounded_rectangle((0,0,70,94),radius=4,fill='#acb5ad')
    d.rounded_rectangle((0,0,69,92),radius=4,fill=color)
    d.line((4,1,65,1),fill='#fffaf1')
    return im,d

def face(d,rank,kind):
    d.rectangle((18,17,54,77),fill='#d7dfd3',outline=INK,width=1)
    for y in range(20,76,4):
        for x in range(21,54,4):
            if (x+y)%8:d.rectangle((x,y,x+1,y+1),fill='#c1cec5')
    # Court-card figure: reversible robe, blue/red geometry, gold crown.
    d.polygon([(21,38),(34,29),(50,40),(50,68),(23,68)],fill=BLUE)
    d.polygon([(24,42),(48,66),(22,66)],fill=RED)
    d.polygon([(25,40),(30,37),(48,64),(44,68)],fill=YELLOW)
    d.rectangle((29,27,43,40),fill='#f4d9ab',outline=INK)
    d.rectangle((29,26,43,29),fill=YELLOW)
    d.polygon([(28,27),(27,20),(32,24),(36,18),(40,24),(45,20),(44,27)],fill=YELLOW)
    d.rectangle((32,32,33,34),fill=INK);d.rectangle((40,32,41,34),fill=INK)
    if rank=='K':d.rectangle((32,38,40,41),fill='#a56a39')
    elif rank=='Q':d.rectangle((28,31,30,45),fill='#a56a39')
    else:d.rectangle((36,38,42,39),fill=INK)
    d.line((23,52,47,52),fill=INK,width=2)
    d.line((26,58,43,58),fill=YELLOW,width=2)
    suit(d,kind,37,71,1)

def card(rank,kind):
    im,d=base();color=RED if kind in 'HD' else INK
    text(d,(5,3),rank,18,color);suit(d,kind,10,22)
    if rank in ['J','Q','K']:face(d,rank,kind)
    elif rank=='A':suit(d,kind,37,47,3)
    else:
        n=int(rank)
        layouts={
          2:[(36,28),(36,66)],3:[(36,27),(36,47),(36,67)],
          4:[(25,28),(47,28),(25,66),(47,66)],
          5:[(25,28),(47,28),(36,47),(25,66),(47,66)],
          6:[(25,26),(47,26),(25,47),(47,47),(25,68),(47,68)],
          7:[(25,26),(47,26),(36,36),(25,47),(47,47),(25,68),(47,68)],
          8:[(25,24),(47,24),(36,35),(25,46),(47,46),(36,57),(25,68),(47,68)],
          9:[(25,22),(47,22),(25,38),(47,38),(36,47),(25,56),(47,56),(25,72),(47,72)],
          10:[(25,22),(47,22),(36,30),(25,38),(47,38),(25,56),(47,56),(36,64),(25,72),(47,72)]}
        for x,y in layouts[n]:suit(d,kind,x,y)
    # Reversed lower corner, with no mirrored Unicode font rendering.
    corner=Image.new('RGBA',(17,27),(0,0,0,0));cd=ImageDraw.Draw(corner)
    text(cd,(2,0),rank,18,color);suit(cd,kind,7,20)
    im.alpha_composite(corner.rotate(180),(53,66))
    return im

def joker(kind):
    colors={'joker':'#a6b6aa','sly':'#e1a94f','half':'#ddc1b1','blueprint':'#407fb4'}
    im,d=base(colors[kind])
    for y in range(5,90,5):
        for x in range(5,67,5):
            if (x//5+y//5)%2==0:d.rectangle((x,y,x+2,y+2),fill={'joker':'#91a89e','sly':'#c58d40','half':'#ccab9a','blueprint':'#5895c1'}[kind])
    white='#e8dfc8' if kind!='blueprint' else '#cbe7ed'
    if kind=='blueprint':
        for x in range(8,65,7):d.line((x,10,x,84),fill='#4e8ebd')
        for y in range(10,86,7):d.line((8,y,63,y),fill='#4e8ebd')
        d.line((17,58,19,35,29,31,25,16,36,25,48,15,46,32,55,38,54,61,45,73,26,73,17,58),fill=white,width=1)
        d.ellipse((26,33,47,59),outline=white);d.arc((29,42,44,56),0,180,fill=white)
        d.line((11,80,60,80),fill=white);text(d,(35,3),'COPY',11,white,'mt')
    else:
        # Three distinct study illustrations, drawn without copying shipped sprites.
        d.polygon([(14,39),(12,17),(30,28),(35,12),(44,28),(59,18),(55,42)],fill=INK)
        d.polygon([(16,37),(14,20),(29,30),(35,16),(35,41)],fill=RED)
        d.polygon([(35,16),(44,30),(57,21),(53,42),(35,42)],fill=BLUE)
        for x,y in [(13,17),(35,12),(59,18)]:d.rectangle((x-2,y-2,x+2,y+2),fill=YELLOW)
        d.ellipse((18,32,53,69),fill=white,outline=INK,width=2)
        d.polygon([(17,52),(10,71),(35,81),(61,70),(54,51),(48,73),(24,73)],fill=RED)
        d.polygon([(22,66),(28,72),(35,66),(43,73),(50,66),(50,80),(21,80)],fill=BLUE)
        if kind=='sly':
            d.rectangle((21,43,33,49),fill=INK);d.rectangle((38,43,50,49),fill=INK);d.line((31,44,40,44),fill=INK,width=2)
        else:
            d.rectangle((27,42,30,46),fill=INK);d.rectangle((42,42,45,46),fill=INK)
            d.line((24,38,32,39),fill=INK,width=1);d.line((40,39,47,38),fill=INK,width=1)
        d.rectangle((33,48,40,53),fill=RED)
        d.arc((25,48,47,63),0,180,fill=INK,width=2)
        if kind=='half':
            d.polygon([(0,55),(8,58),(16,54),(26,59),(35,55),(43,60),(52,55),(62,59),(71,56),(71,95),(0,95)],fill=CREAM)
            d.line((2,55,8,58,16,54,26,59,35,55,43,60,52,55,62,59,69,56),fill='#9c8a7d',width=1)
            text(d,(35,71),'HALF',17,INK,'mt')
        else:text(d,(35,82),'JOKER' if kind=='joker' else 'SLY',11,INK,'mt')
    return im

def back(color):
    im,d=base('#e4e6d9');d.rectangle((5,5,65,87),fill=color)
    for y in range(8,86,6):
        for x in range(8,64,6):d.polygon([(x,y-2),(x+2,y),(x,y+2),(x-2,y)],fill='#dccdb9')
    d.rectangle((9,9,61,83),outline='#f0ddbe');d.rectangle((13,13,57,79),outline='#f0ddbe')
    d.ellipse((22,32,49,60),fill=color,outline='#f0ddbe');suit(d,'S',35,45,2,'#f0ddbe')
    return im

def consumable(kind):
    im,d=base('#5c778b' if kind=='planet' else '#68557e')
    d.rectangle((5,5,65,87),outline='#d6cab7')
    for x,y in [(13,22),(58,34),(19,66),(50,74),(56,13),(36,24)]:d.rectangle((x,y,x+1,y+1),fill=CREAM)
    if kind=='planet':
        d.ellipse((20,32,51,63),fill='#bb8d61',outline=CREAM)
        for y in [39,45,52,57]:d.line((23,y,48,y+2),fill='#d2b286',width=2)
        text(d,(35,7),'JUPITER',12,CREAM,'mt')
    else:
        d.polygon([(35,27),(47,55),(35,70),(23,55)],fill=YELLOW,outline=CREAM)
        d.line((35,32,35,64),fill='#fff2bf',width=2)
        text(d,(35,7),'THE STAR',12,CREAM,'mt')
    return im

def pack(kind):
    c={'arcana':'#8e718d','celestial':'#527f9b','standard':'#b36251','buffoon':'#4c846a','spectral':'#696297'}[kind]
    im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
    d.polygon([(5,3),(65,3),(69,12),(66,83),(68,92),(4,92),(2,83),(4,12)],fill=c,outline='#192e34')
    d.rectangle((4,3,66,10),fill=c,outline='#bea979');d.rectangle((4,83,66,92),fill=c,outline='#bea979')
    d.line((64,11,66,83),fill='#293b48',width=3)
    for x in range(3,69,5):
        d.line((x,3,x,8),fill='#e1d5bd');d.line((x,86,x,91),fill='#e1d5bd')
    d.rectangle((5,12,65,82),outline='#e1d5bd')
    for y in range(18,80,5):d.line((10,y,60,y),fill={'arcana':'#80617d','celestial':'#446d86','standard':'#a25243','buffoon':'#3d7259','spectral':'#504d82'}[kind])
    if kind=='celestial':
        d.ellipse((22,31,49,58),fill=YELLOW);d.arc((12,35,59,56),0,350,fill=CREAM,width=2)
    elif kind=='arcana':
        d.polygon([(35,27),(48,50),(35,65),(22,50)],fill=YELLOW)
        d.ellipse((31,43,39,51),fill='#f5edce')
    elif kind=='standard':
        d.rectangle((23,25,48,63),fill=CREAM,outline=INK);suit(d,'H',36,45,2)
    elif kind=='buffoon':
        d.polygon([(20,46),(17,29),(30,37),(35,24),(42,37),(55,29),(51,46)],fill=YELLOW,outline=CREAM)
        d.polygon([(22,47),(49,47),(44,61),(35,67),(27,61)],fill=YELLOW,outline=CREAM)
    else:
        d.polygon([(35,24),(49,45),(47,58),(35,68),(23,58),(21,45)],fill=YELLOW,outline=CREAM)
        d.ellipse((29,44,33,51),fill=c);d.ellipse((38,44,42,51),fill=c)
    text(d,(35,69),kind.upper(),11,CREAM,'mt')
    return im

assets=[]
def save(name,group,im):
    im.save(OUT/f'{name}.png');assets.append({'id':name,'group':group,'file':f'{name}.png','width':W,'height':H})

for kind in 'SHCD':
    for rank in ['A','2','3','4','5','6','7','8','9','10','J','Q','K']:save(f'card-{kind}-{rank}','playing-card',card(rank,kind))
for name,color in [('red','#a7433f'),('blue','#3c657b')]:save(f'back-{name}','back',back(color))
for name in ['planet','tarot']:save(f'consumable-{name}','consumable',consumable(name))
for name in ['arcana','celestial','standard','buffoon','spectral']:save(f'pack-{name}','pack',pack(name))

for name,col in [('red','#ed594b'),('blue','#45a5e5'),('gold','#f0c95b'),('purple','#a685d1')]:
    im=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(im)
    points=[(35+math.cos(i*math.pi/8)*(11 if i%2==0 else 9),47+math.sin(i*math.pi/8)*(11 if i%2==0 else 9)) for i in range(16)]
    d.polygon(points,fill=col,outline=INK);d.ellipse((29,41,41,53),outline='#fff3bd');text(d,(35,39),'B',13,'#fff3bd','mt')
    save(f'seal-{name}','seal',im)

cols=8;rows=math.ceil(len(assets)/cols)
atlas=Image.new('RGBA',(cols*W,rows*H),(0,0,0,0))
sheet=Image.new('RGB',(cols*142,rows*218),'#182b28');sd=ImageDraw.Draw(sheet)
for i,a in enumerate(assets):
    im=Image.open(OUT/a['file']);x,y=(i%cols)*W,(i//cols)*H;atlas.alpha_composite(im,(x,y));a['frame']={'x':x,'y':y,'w':W,'h':H}
    px,py=(i%cols)*142,(i//cols)*218;sheet.paste(im.resize((W*2,H*2),Image.Resampling.NEAREST),(px,py),im.resize((W*2,H*2),Image.Resampling.NEAREST))
    text(sd,(px+71,py+194),a['id'],13,'#dbdfcf','mt')
atlas.save(OUT/'sprite-atlas.png');sheet.save(ROOT/'research/material-contact-sheet.png')
for a in assets:a['atlas']='sprite-atlas.png';a['provenance']='code-drawn study'
joker_path=OUT/'joker-catalog.json'
if joker_path.exists():
    references=json.loads(joker_path.read_text(encoding='utf-8'))
    assert len(references)==150
    ref_atlas=Image.new('RGBA',(15*142,10*190),(0,0,0,0))
    contact=Image.new('RGB',(12*120,13*154),'#1a312d');cd=ImageDraw.Draw(contact)
    for i,j in enumerate(references):
        im=Image.open(OUT/j['file']).convert('RGBA').resize((142,190),Image.Resampling.NEAREST)
        x,y=i%15*142,i//15*190;ref_atlas.alpha_composite(im,(x,y))
        assets.append({'id':j['id'],'group':'joker','file':j['file'],'width':j['width'],'height':j['height'],'atlas':'joker-atlas.png','frame':{'x':x,'y':y,'w':142,'h':190},'provenance':'Balatro reference art: LocalThunk / Playstack','source_url':j['source_url']})
        im=im.resize((85,114),Image.Resampling.NEAREST);cx,cy=i%12*120,i//12*154
        contact.paste(im,(cx+17,cy),im)
        text(cd,(cx+60,cy+120),j['name'][:20],12,'#e2dfc7','mt')
    ref_atlas.save(OUT/'joker-atlas.png');contact.save(ROOT/'research/joker-contact-sheet.jpg')
(OUT/'manifest.json').write_text(json.dumps({'version':3,'description':'65 code-drawn studies and 150 separately sourced Balatro Joker references; see THIRD-PARTY.md','atlases':['sprite-atlas.png','joker-atlas.png'],'assets':assets},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Indexed {len(assets)} assets: 65 code-drawn studies and {len(assets)-65} Joker references.')
runpy.run_path(str(ROOT/'scripts/generate-holograms.py'),run_name='__main__')
runpy.run_path(str(ROOT/'scripts/generate-glass.py'),run_name='__main__')
runpy.run_path(str(ROOT/'scripts/generate-packaging.py'),run_name='__main__')
