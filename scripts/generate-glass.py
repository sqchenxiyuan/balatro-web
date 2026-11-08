"""Remove connected paper colours, retaining printed ink on a clear glass substrate.

The mask is a palette/connected-background approximation, not semantic segmentation.
Derived Joker art retains the source artwork attribution in THIRD-PARTY.md.
"""
from collections import Counter, deque
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets'
OUT = ASSETS / 'glass'
OUT.mkdir(exist_ok=True)
records = []
W, H = 142, 190
for item in json.loads((ASSETS / 'manifest.json').read_text(encoding='utf-8'))['assets']:
    source = ASSETS / item['file']
    original = Image.open(source).convert('RGBA').resize((W, H), Image.Resampling.NEAREST)
    px = original.load()
    border = Counter(px[x, y][:3] for y in range(8, H-8) for x in range(6, W-6)
                     if (x < 19 or x > W-19 or y < 18 or y > H-18) and px[x, y][3] > 220)
    inside = Counter(px[x, y][:3] for y in range(30, H-30) for x in range(26, W-26) if px[x, y][3] > 220)
    # Only the dominant border colour is substrate. The runner-up is often the corner ink.
    colours = [colour for colour, count in border.most_common(1) if count > 100]
    if inside:
        colours.append(inside.most_common(1)[0][0])
    def substrate(x, y):
        p = px[x, y]
        return p[3] < 32 or any(max(abs(p[c]-colour[c]) for c in range(3)) < 37 for colour in colours)
    removed, queue = set(), deque()
    def visit(x, y):
        if 0 <= x < W and 0 <= y < H and (x, y) not in removed and substrate(x, y):
            removed.add((x, y)); queue.append((x, y))
    # Seed both the outer card and the inner printed panel to remove enclosed paper too.
    for x in range(W):
        for y in (0, 7, 23, H-24, H-8, H-1): visit(x, y)
    for y in range(H):
        for x in (0, 7, 23, W-24, W-8, W-1): visit(x, y)
    while queue:
        x, y = queue.popleft()
        visit(x-1, y); visit(x+1, y); visit(x, y-1); visit(x, y+1)
    ink = original.copy()
    output = ink.load()
    for y in range(H):
        for x in range(W):
            p = px[x, y]
            if (x, y) in removed or x < 5 or x >= W-5 or y < 5 or y >= H-5:
                output[x, y] = (0, 0, 0, 0)
            else:
                # A little transmission remains through the printed picture, as enamel on glass.
                colour = (132, 167, 173) if max(p[:3]) < 85 else p[:3]
                output[x, y] = (*colour, round(p[3]*.92))
    key = item['file'].removesuffix('.png').replace('/', '__')
    ink.save(OUT / f'{key}-ink.png')
    records.append({'source':item['file'], 'ink':f'glass/{key}-ink.png',
                    'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
                    'clear_fraction':round(len(removed)/(W*H), 4)})
(OUT / 'manifest.json').write_text(json.dumps({'method':'connected paper palette removal; clear substrate with surface ink',
    'copyright':'Derived artwork retains the source attribution; see ../THIRD-PARTY.md.',
    'items':records},ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Generated {len(records)} transparent glass ink layers.')
