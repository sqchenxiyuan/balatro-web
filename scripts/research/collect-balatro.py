"""Collect public Balatro reference pages, text, and tables (no game assets).

Uses the bundled Python runtime's lxml package. Run from any directory.
The resulting tables are research transcriptions, not executable game definitions.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

from lxml import html


ROOT = Path(__file__).resolve().parents[2] / "docs" / "balatro" / "data"
WIKI_PAGES = [
    "Balatro", "Poker_hands", "Jokers", "Decks", "Shop", "Stakes",
    "Blinds_and_Antes", "Blinds", "Tags", "Tarot_cards", "Planet_cards",
    "Spectral_cards", "Vouchers", "Booster_Packs", "Card_modifiers",
    "Chips", "Mult", "Scoring", "Money", "Playing_cards", "Challenges",
    "Updates", "Probability", "Interest", "Hand_size", "Round", "Discard",
    "Eternal", "Perishable", "Rental", "Seeded", "The_Soul", "Black_Hole",
    "Hand", "Debuffed", "Blueprint", "Brainstorm", "Death", "Glass_cards", "Plasma_Deck",
]
EXTRA = {
    "official_site": "https://www.playbalatro.com/",
    "steam_store": "https://store.steampowered.com/app/2379780/Balatro/?l=english",
    "steam_news": "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2379780&count=30&maxlength=0",
    "localthunk_blog": "https://localthunk.com/blog",
    "update_1_1_preview": "https://www.cgmagonline.com/news/balatro-1-1-update-drops-new-mechanics/",
}


def clean_text(node):
    return re.sub(r"\s+", " ", node.text_content()).strip()


def fetch(item):
    key, url = item
    request = Request(url, headers={"User-Agent": "BalatroMechanicsResearch/1.0 (public reference collection)"})
    try:
        with urlopen(request, timeout=25) as response:
            raw = response.read()
            final_url = response.url
            status = response.status
        result = {
            "id": key, "url": url, "resolved_url": final_url, "http_status": status,
            "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
            "sha256": hashlib.sha256(raw).hexdigest(),
        }
        if key == "steam_news":
            result["news"] = json.loads(raw)["appnews"]["newsitems"]
            return result
        tree = html.fromstring(raw.decode("utf-8", "replace"))
        result["title"] = " ".join(tree.xpath("//title/text()"))
        revision = re.search(r'"wgRevisionId"\s*:\s*(\d+)', raw.decode("utf-8", "replace"))
        result["wiki_revision_id"] = int(revision.group(1)) if revision else None
        content = tree.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," mw-parser-output ")]')
        main = content[0] if content else tree
        # Hidden DPL metadata duplicates descriptions and includes raw template syntax.
        for node in main.xpath('.//script|.//style|.//*[contains(concat(" ",normalize-space(@class)," ")," metadata ")]|.//*[contains(concat(" ",normalize-space(@class)," ")," mw-editsection ")]'):
            node.drop_tree()
        for br in main.xpath('.//br'):
            br.tail = "\n" + (br.tail or "")
        result["text"] = re.sub(r"\n[ \t]*\n+", "\n\n", main.text_content()).strip()
        result["links"] = [{"text": clean_text(a), "href": a.get("href")} for a in main.xpath('.//a[@href]') if clean_text(a)]
        tables = []
        for index, table in enumerate(main.xpath('.//table')):
            rows = []
            for row in table.xpath('./tr|./thead/tr|./tbody/tr|./tfoot/tr'):
                cells = row.xpath('./th|./td')
                rows.append([clean_text(cell) for cell in cells])
            caption = table.xpath('./caption')
            tables.append({"index": index, "class": table.get("class", ""), "caption": clean_text(caption[0]) if caption else "", "rows": rows})
        result["tables"] = tables
        edited = tree.xpath('//*[@id="footer-info-lastmod"]')
        result["last_edited_text"] = clean_text(edited[0]) if edited else None
        return result
    except Exception as exc:
        return {"id": key, "url": url, "error": str(exc)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ids", nargs="*", help="Refresh only these IDs, keeping other saved sources")
    args = parser.parse_args()
    ROOT.mkdir(parents=True, exist_ok=True)
    targets = [(p, f"https://balatro.wiki/w/{p}") for p in WIKI_PAGES] + list(EXTRA.items())
    collected = {}
    saved = ROOT / "source-pages.json"
    if args.ids and saved.exists():
        collected = {page["id"]: page for page in json.loads(saved.read_text(encoding="utf-8"))}
    selected = [item for item in targets if args.ids is None or item[0] in args.ids]
    with ThreadPoolExecutor(max_workers=5) as pool:
        tasks = [pool.submit(fetch, item) for item in selected]
        for task in as_completed(tasks):
            result = task.result()
            collected[result["id"]] = result
            print(json.dumps({"id": result["id"], "status": result.get("http_status"), "error": result.get("error"), "tables": [len(t["rows"]) for t in result.get("tables", [])]}, ensure_ascii=True), flush=True)
    ordered = [collected[key] for key, _ in targets if key in collected]
    (ROOT / "source-pages.json").write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata = [{k: v for k, v in page.items() if k not in {"text", "tables", "links", "news"}} for page in ordered]
    (ROOT / "sources.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(ordered)} source records to {ROOT}", flush=True)


if __name__ == "__main__":
    main()
