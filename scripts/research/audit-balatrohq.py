"""Snapshot the public Chinese BalatroHQ sitemap and server-rendered text.

Run with Python + lxml. Does not execute scripts or fetch images. Reuses successful
snapshots unless --refresh is passed. Source claims remain unverified reference.
"""
from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import time
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlparse
from lxml import etree, html

BASE = Path(__file__).resolve().parents[2] / 'docs' / 'balatro' / 'data' / 'balatrohq'
HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; BalatroReferenceAudit/1.0)'}


def clean(value):
    return re.sub(r'\s+', ' ', value).strip()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def fetch(url):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers=HEADERS), timeout=25) as response:
                return response.read(), response.status, response.url
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def extract(url):
    try:
        data, status, final = fetch(url)
        root = html.fromstring(data.decode('utf-8'))
        main = (root.xpath('//main') or root.xpath('//body'))[0]
        # Exclude code and navigation from the reference text; never execute it.
        for element in main.xpath('.//script|.//style|.//nav|.//footer|.//svg'):
            element.drop_tree()
        record = {
            'url': url, 'final_url': final, 'status': status,
            'retrieved_at': datetime.now(timezone.utc).isoformat(),
            'html_sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
            'title': clean(' '.join(root.xpath('//title/text()'))),
            'headings': [{'level': int(e.tag[1]), 'text': clean(e.text_content())}
                         for e in main.xpath('.//h1|.//h2|.//h3|.//h4')],
            'text': '\n'.join(clean(t) for t in main.itertext() if clean(t)),
            'tables': [[[' '.join(clean(t) for t in c.itertext() if clean(t))
                         for c in r.xpath('./th|./td')]
                        for r in table.xpath('.//tr')] for table in main.xpath('.//table')],
            'links': [{'text': clean(a.text_content()), 'url': urljoin(final, a.get('href'))}
                      for a in main.xpath('.//a[@href]')],
        }
        if url == 'https://balatrohq.com/zh/jokers/':
            record['joker_cards'] = []
            for e in main.xpath('.//button[@id][.//*[@role="img"]]'):
                metadata = e.xpath('.//div[contains(@class,"uppercase mb-1")]')
                effect = e.xpath('.//div[contains(@class,"leading-snug")]')
                label = clean(' '.join(metadata[0].itertext()))
                match = re.fullmatch(r'(common|uncommon|rare|legendary)\s*·\s*\$\s*(\d+)', label)
                assert match, label
                record['joker_cards'].append({
                    'site_id': e.get('id'),
                    'zh_name': e.xpath('.//*[@role="img"]/@aria-label')[0],
                    'rarity': match[1], 'cost_dollars': int(match[2]),
                    'effect': clean(effect[0].text_content()), 'text': clean(e.text_content())})
        return record
    except Exception as error:
        return {'url': url, 'error': str(error)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    BASE.mkdir(parents=True, exist_ok=True)
    sitemap = BASE / 'sitemap.xml'
    if args.refresh or not sitemap.exists():
        sitemap.write_bytes(fetch('https://balatrohq.com/sitemap.xml')[0])
    tree = etree.fromstring(sitemap.read_bytes())
    urls = sorted(set(tree.xpath('//*[local-name()="loc"]/text()')))
    urls = [u for u in urls if u.startswith('https://balatrohq.com/zh/')]
    inventory = [{'url': u, 'category': urlparse(u).path.split('/')[2] or 'home'} for u in urls]
    save(BASE / 'inventory.json', {'count': len(urls),
         'category_counts': dict(Counter(i['category'] for i in inventory)), 'pages': inventory})
    destination = BASE / 'pages.json'
    previous = json.loads(destination.read_text(encoding='utf-8')) if destination.exists() else []
    records = {r['url']: r for r in previous
               if r.get('status') == 200 and r['url'] in urls and not args.refresh}
    pending = [u for u in urls if u not in records]
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(extract, u): u for u in pending}
        for number, future in enumerate(as_completed(futures), 1):
            record = future.result()
            records[record['url']] = record
            save(destination, [records[u] for u in urls if u in records])
            if number % 15 == 0 or record.get('error'):
                print(number, '/', len(pending), record['url'], record.get('error', 'OK'), flush=True)
    save(destination, [records[u] for u in urls])
    summary = {'captured_at': datetime.now(timezone.utc).isoformat(),
               'inventory_count': len(urls), 'successful_pages': sum(r.get('status') == 200 for r in records.values()),
               'errors': [r for r in records.values() if r.get('error')],
               'scope': 'HTTP snapshots of Chinese sitemap pages; content claims need manual cross-checks; tools not executed'}
    save(BASE / 'capture-report.json', summary)
    print(json.dumps(summary, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
