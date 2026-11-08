"""Derive simple 2.5D print/subject planes from the existing reference and study art.

This is a graphic cutout heuristic, not a reconstructed 3D model or a semantic depth map.
"""
from collections import Counter, deque
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets'
OUT = ASSETS / 'holograms'
OUT.mkdir(exist_ok=True)
items = json.loads((ASSETS / 'manifest.json').read_text(encoding='utf-8'))['assets']
records = []
W, H = 142, 190

for item in items:
    source = ASSETS / item['file']
    original = Image.open(source).convert('RGBA').resize((W, H), Image.Resampling.NEAREST)
    pixels = original.load()
    # Leave corner indices and the printed frame on the paper plane.
    left, top, right, bottom = 24, 27, 122, 166
    counts = Counter(pixels[x, y][:3] for y in range(top, bottom) for x in range(left, right) if pixels[x, y][3] > 220)
    paper = counts.most_common(1)[0][0] if counts else (230, 239, 236)
    background = set()
    queue = deque()
    def is_paper(x, y):
        p = pixels[x, y]
        return p[3] < 32 or max(abs(p[c] - paper[c]) for c in range(3)) < 46
    def visit(x, y):
        if left <= x < right and top <= y < bottom and (x, y) not in background and is_paper(x, y):
            background.add((x, y)); queue.append((x, y))
    for x in range(left, right):
        visit(x, top); visit(x, bottom - 1)
    for y in range(top, bottom):
        visit(left, y); visit(right - 1, y)
    while queue:
        x, y = queue.popleft()
        visit(x - 1, y); visit(x + 1, y); visit(x, y - 1); visit(x, y + 1)
    remaining = {(x, y) for y in range(top, bottom) for x in range(left, right)
                 if (x, y) not in background and pixels[x, y][3] >= 32}
    subject_pixels = set()
    while remaining:
        seed = remaining.pop(); component = {seed}; queue = deque([seed])
        while queue:
            x, y = queue.popleft()
            for neighbor in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if neighbor in remaining:
                    remaining.remove(neighbor); component.add(neighbor); queue.append(neighbor)
        # Keep detached frame lettering and dust on the paper plane.
        if len(component) >= 12 and any(left+20 < x < right-20 and top+8 < y < bottom-8 for x,y in component):
            subject_pixels.update(component)
    subject = Image.new('RGBA', (W, H))
    foreground = subject.load()
    base = original.copy()
    backing = base.load()
    lifted = 0
    for y in range(top, bottom):
        for x in range(left, right):
            if (x, y) not in subject_pixels:
                continue
            # A short edge taper avoids a rectangular cut through elaborate illustrations.
            weight = min(1., (x-left+1)/3, (right-x)/3, (y-top+1)/3, (bottom-y)/3)
            p = pixels[x, y]
            foreground[x, y] = (*p[:3], round(p[3] * weight))
            backing[x, y] = (*(round(p[c]*(1-weight)+paper[c]*weight) for c in range(3)), p[3])
            lifted += 1
    key = item['file'].removesuffix('.png').replace('/', '__')
    base.save(OUT / f'{key}-base.png')
    subject.save(OUT / f'{key}-subject.png')
    records.append({'source': item['file'], 'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                    'base': f'holograms/{key}-base.png', 'subject': f'holograms/{key}-subject.png',
                    'lifted_pixels': lifted, 'size': [W, H]})

(OUT / 'manifest.json').write_text(json.dumps({'method': 'background-connected cutout; illustrative 2.5D planes',
    'copyright': 'Derived Joker artwork retains the original LocalThunk / Playstack attribution; see ../THIRD-PARTY.md.',
    'items': records}, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Generated {len(records)} holographic base/subject pairs.')
