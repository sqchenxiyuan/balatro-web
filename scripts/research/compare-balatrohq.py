"""Compare stable IDs, Joker price/rarity and poker-hand numbers, not effect execution."""
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'docs/balatro/data/balatrohq'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def normalized(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return re.sub('[^a-z0-9]', '', value).replace('joker', '')


def clean(value):
    return re.sub(r'\s+', ' ', value).strip()


def main():
    catalog = read(ROOT / 'docs/balatro/data/catalogs.json')
    pages = {p['url']: p for p in read(BASE / 'pages.json') if p.get('status') == 200}
    source = pages['https://balatrohq.com/zh/jokers/']
    site = {c['site_id']: c for c in source['joker_cards']}
    aliases = {
        'gluttonous_joker': 'gluttenous-joker', 'ceremonial_dagger': 'ceremonial',
        'chaos_the_clown': 'chaos', 'delayed_gratification': 'delayed-grat',
        'business_card': 'business', 's_ance': 'seance', 'gift_card': 'gift',
        'mail_in_rebate': 'mail', 'baseball_card': 'baseball', 'trading_card': 'trading',
        'flash_card': 'flash', 'spare_trousers': 'trousers', 'seltzer': 'selzer',
        'smiley_face': 'smiley', 'golden_ticket': 'ticket', 'showman': 'ring-master',
        'oops_all_6s': 'oops', 'the_idol': 'idol', 'the_duo': 'duo',
        'the_trio': 'trio', 'the_family': 'family', 'the_order': 'order', 'the_tribe': 'tribe',
    }
    lookup = {normalized(key): key for key in site}
    results = []
    for card in catalog['jokers']:
        key = aliases.get(card['id']) or lookup.get(normalized(card['id']))
        assert key in site, f'Unmapped Joker: {card["id"]}'
        other = site[key]
        rarity, cost, effect = other['rarity'], other['cost_dollars'], other['effect']
        results.append({
            'id': card['id'], 'name_en': card['name'], 'site_id': key,
            'site_name_zh': other['zh_name'], 'site_effect_zh': effect,
            'canonical_effect_en': card['effect'], 'canonical_unlock_en': card['unlock'],
            'canonical_cost': card['cost_dollars'], 'site_cost': int(cost),
            'canonical_rarity': card['rarity'], 'site_rarity': rarity,
            'price_matches': card['cost_dollars'] == int(cost) if card['cost_dollars'] is not None else None,
            'rarity_matches': card['rarity'].lower() == rarity,
            'site_source': {'url': source['url'], 'html_sha256': source['html_sha256']},
            'canonical_source': card['source'],
            'translation_status': 'community-reference-only; not verified original Simplified Chinese localization',
            'effect_review': 'not-exhaustive; see findings.json for known conflicts',
        })
    assert len(results) == 150 and len({r['site_id'] for r in results}) == 150
    save(BASE / 'joker-crosswalk.json', results)
    hands = pages['https://balatrohq.com/zh/poker-hands/']['tables'][0][1:]
    canonical_hands = {r['name_zh']: r for r in catalog['poker_hands']}
    comparisons = []
    for row in hands:
        name = row[0]
        canonical_name = '同花顺' if name == '皇家同花顺' else name
        ref = canonical_hands[canonical_name]
        values = [int(re.sub(r'\D', '', value)) for value in row[1:]]
        expected = [ref['base_chips'], ref['base_mult'], ref['base_chips'] * ref['base_mult'],
                    ref['chips_per_level'], ref['mult_per_level']]
        comparisons.append({'name_zh': name, 'canonical_id': ref['id'], 'site_values': values,
                            'canonical_values': expected, 'matches': values == expected,
                            'display_variant': name == '皇家同花顺'})
    assert len(comparisons) == 13 and len({r['canonical_id'] for r in comparisons}) == 12
    findings = read(BASE / 'findings.json')
    original_pages = {p['id']: p for p in read(ROOT / 'docs/balatro/data/source-pages.json')}
    assert len({f['id'] for f in findings}) == len(findings)
    for finding in findings:
        assert clean(finding['site_excerpt']) in clean(pages[finding['site_url']]['text']), finding['id']
        for ref in finding.get('canonical_refs', []):
            assert any(r.get('id') == ref['id'] for r in catalog[ref['collection']]), ref
        if finding.get('wiki_page_id'):
            assert clean(finding['wiki_excerpt']) in clean(original_pages[finding['wiki_page_id']]['text']), finding['id']
    report = {
        'checks': {
            'joker_id_mapping': len(results),
            'joker_prices_comparable': sum(r['price_matches'] is not None for r in results),
            'joker_price_match': sum(r['price_matches'] is True for r in results),
            'joker_rarity_match': sum(r['rarity_matches'] for r in results),
            'poker_hand_display_rows': len(comparisons),
            'poker_hand_numeric_match': sum(r['matches'] for r in comparisons),
            'independent_poker_hands': len({r['canonical_id'] for r in comparisons}),
            'findings_with_verified_quotes_and_references': len(findings),
        },
        'joker_differences': [r for r in results if r['price_matches'] is False or not r['rarity_matches']],
        'poker_hand_comparisons': comparisons,
        'scope': 'IDs, price, rarity, five numeric hand fields and finding reference integrity; not exhaustive effect, translation, unlock or runtime validation',
    }
    save(BASE / 'comparison-report.json', report)
    print(json.dumps(report['checks'], ensure_ascii=False))
    print('Joker numeric differences:', json.dumps(report['joker_differences'], ensure_ascii=False))


if __name__ == '__main__':
    main()
