"""Normalize the collected public Wiki tables and render research appendices."""

from collections import Counter
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[2] / "docs" / "balatro"
PAGES = {p["id"]: p for p in json.loads((ROOT / "data/source-pages.json").read_text(encoding="utf-8"))}


def slug(name):
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def provenance(key, table, row):
    page = PAGES[key]
    return {"page_id": key, "url": page["resolved_url"], "wiki_revision_id": page.get("wiki_revision_id"), "table_index": table, "row_index": row}


def rows(key, table=0):
    return PAGES[key]["tables"][table]["rows"]


def money(value):
    return int(value[1:]) if re.fullmatch(r"\$\d+", value) else None


def simple_cards(key):
    return [{"id": slug(r[1]), "name": r[1], "effect": r[2], "source": provenance(key, 0, i)} for i, r in enumerate(rows(key)) if i and len(r) == 3]


def escape(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def table(headers, data):
    return "\n".join(["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"] + ["| " + " | ".join(escape(v) for v in row) + " |" for row in data]) + "\n"


def write(name, content):
    (ROOT / name).write_text(content.rstrip() + "\n", encoding="utf-8")


def main():
    data = {"schema_version": 1, "research_date": "2026-11-07", "target_baseline": "1.0.1-series; current community tables, cross-checked against official 1.0.1f patch notes", "status": "public-reference transcription; not runtime-verified game definitions"}
    data["jokers"] = [{"id": slug(r[1]), "collection_number": int(r[0]), "name": r[1], "effect": r[2], "cost_text": r[3], "cost_dollars": money(r[3]), "rarity": r[4], "unlock": r[5], "effect_type": r[6], "activation_type": r[7], "source": provenance("Jokers", 1, i)} for i, r in enumerate(rows("Jokers", 1)) if i and len(r) == 8]
    data["tarot_cards"] = simple_cards("Tarot_cards")
    data["planet_cards"] = simple_cards("Planet_cards")
    data["spectral_cards"] = simple_cards("Spectral_cards")
    data["decks"] = [{"id": slug(r[1]), "collection_number": int(r[0]), "name": r[1], "effect": r[2], "unlock": r[3], "source": provenance("Decks", 0, i)} for i, r in enumerate(rows("Decks")) if i and len(r) == 4]
    data["stakes"] = [{"id": slug(r[1]), "name": r[1], "added_effect": r[2], "deck_unlock": r[3], "source": provenance("Stakes", 0, i)} for i, r in enumerate(rows("Stakes")) if i and len(r) == 4]
    data["tags"] = [{"id": slug(r[1]), "name": r[1], "effect": r[2], "minimum_ante_text": r[3], "source": provenance("Tags", 0, i)} for i, r in enumerate(rows("Tags")) if i and len(r) == 4]
    data["blinds"] = [{"id": slug(r[1]), "name": r[1], "effect": r[2], "minimum_ante_text": r[3], "score_multiplier": float(re.search(r"([\d.]+)x", r[4]).group(1)), "reward_dollars": money(r[5]), "matador_compatible_text": r[6], "source": provenance("Blinds", 0, i)} for i, r in enumerate(rows("Blinds")) if i and len(r) == 7]
    data["challenges"] = [{"id": slug(r[1]), "number": int(r[0]), "name": r[1], "custom_rules": r[2], "starting_items": r[3], "starting_deck": r[4], "restrictions": r[5], "source": provenance("Challenges", 0, i)} for i, r in enumerate(rows("Challenges")) if i and len(r) == 6]
    data["vouchers"] = []
    for i, r in enumerate(rows("Vouchers")):
        if i < 2 or len(r) != 6:
            continue
        for tier, start in [(1, 0), (2, 2)]:
            data["vouchers"].append({"id": slug(r[start]), "name": r[start], "effect": r[start + 1], "tier": tier, "base_cost_dollars": 10, "upgrade_of": slug(r[0]) if tier == 2 else None, "collection_unlock": r[4] if tier == 2 else "Base voucher", "notes": r[5], "source": provenance("Vouchers", 0, i)})
    data["booster_rules"] = []
    family = None
    for i, r in enumerate(rows("Booster_Packs")):
        if len(r) == 1:
            family = r[0]
        elif i and len(r) == 4:
            data["booster_rules"].append({"family": family, "size": r[2], "cost_dollars": money(r[1]), "effect": r[3], "source": provenance("Booster_Packs", 0, i)})
    for key, index in [("enhancements", 0), ("seals", 1), ("editions", 2), ("stickers", 3)]:
        data[key] = [{"id": slug(r[1]), "name": r[1], "effect": r[2], "source": provenance("Card_modifiers", index, i)} for i, r in enumerate(rows("Card_modifiers", index)) if i and len(r) == 3]
    hand_names = {"High Card": "高牌", "Pair": "对子", "Two Pair": "两对", "Three of a Kind": "三条", "Straight": "顺子", "Flush": "同花", "Full House": "葫芦", "Four of a Kind": "四条", "Straight Flush": "同花顺", "Five of a Kind": "五条", "Flush House": "同花葫芦", "Flush Five": "同花五条"}
    data["poker_hands"] = []
    for i, r in enumerate(rows("Poker_hands")):
        if not i or len(r) != 5:
            continue
        score = re.fullmatch(r"(\d+) Chips x (\d+) Mult", r[1])
        planet = re.fullmatch(r"(.+?)\s*\+(\d+) Mult, \+(\d+) Chips", r[2])
        if not score or not planet:
            raise ValueError(f"Unexpected poker hand row: {r}")
        data["poker_hands"].append({"id": slug(r[0]), "name": r[0], "name_zh": hand_names[r[0]], "base_chips": int(score[1]), "base_mult": int(score[2]), "planet": planet[1].strip(), "chips_per_level": int(planet[3]), "mult_per_level": int(planet[2]), "description": r[3], "source": provenance("Poker_hands", 0, i)})
    data["ante_base_scores"] = []
    for i, r in enumerate(rows("Blinds", 1)):
        if len(r) != 4 or not re.match(r"^[1-8](?:\s|$)", r[0]):
            continue
        data["ante_base_scores"].append({"ante": int(r[0].split()[0]), "white_or_red": int(r[1].replace(",", "")), "green_through_blue": int(r[2].replace(",", "")), "purple_through_gold": int(r[3].replace(",", "")), "source": provenance("Blinds", 1, i)})

    for key, page in [("eternal_incompatible_jokers", "Eternal"), ("perishable_incompatible_jokers", "Perishable"), ("copy_fully_incompatible_jokers", "Blueprint")]:
        data[key] = [{"name": r[0], "rarity": r[1], "effect": r[2], "source": provenance(page, 0, i)} for i, r in enumerate(rows(page)) if i and len(r) == 3]
    data["base_configuration"] = {
        "starting_deck_size": 52, "hand_size": 8, "hands_per_round": 4,
        "discards_per_round": 3, "jokers_limit": 5, "consumables_limit": 2,
        "starting_money_dollars": 4, "maximum_selected_cards": 5,
        "sources": [provenance(key, None, None) for key in ["Playing_cards", "Hand_size", "Hand", "Discard", "Jokers", "Decks", "Money"]],
    }
    data["shop_rules"] = {
        "random_card_slots": 2, "booster_slots": 2, "voucher_slots": 1,
        "card_type_weights": {"joker": 20, "tarot": 4, "planet": 4},
        "optional_type_weights": {"playing_card_with_magic_trick": 4, "spectral_with_ghost_deck": 2},
        "joker_rarity_chances_conditional_on_joker": {"Common": 0.70, "Uncommon": 0.25, "Rare": 0.05},
        "initial_reroll_cost_dollars": 5, "reroll_cost_increment_dollars": 1,
        "edition_extra_cost_dollars": {"Foil": 2, "Holographic": 3, "Polychrome": 5, "Negative": 5},
        "tarot_cost_dollars": 3, "planet_cost_dollars": 3, "spectral_cost_dollars": 4,
        "playing_card_cost_dollars": 1, "voucher_cost_dollars": 10,
        "source": provenance("Shop", None, None),
    }
    data["interest_rules"] = {
        "dollars_held_per_interest_dollar": 5, "base_interest_cap_dollars": 5,
        "seed_money_cap_dollars": 10, "money_tree_cap_dollars": 20,
        "timing_note": "Use eligible money before cash-out rewards. Gold cards and Reserved Parking count; Golden Joker and Rocket cash-out payouts do not count that round.",
        "source": provenance("Interest", None, None),
    }
    data["booster_weights"] = [{"family": r[0], "normal_weight": float(r[1]), "jumbo_weight": float(r[3]), "mega_weight": float(r[5]), "combined_weight": float(r[7]), "source": provenance("Booster_Packs", 1, i)} for i, r in enumerate(rows("Booster_Packs", 1)) if i > 1 and len(r) == 9]

    expected = {"jokers": 150, "tarot_cards": 22, "planet_cards": 12, "spectral_cards": 18, "decks": 15, "stakes": 8, "tags": 24, "blinds": 30, "challenges": 20, "vouchers": 32, "booster_rules": 15, "enhancements": 8, "seals": 4, "editions": 5, "stickers": 3, "poker_hands": 12, "ante_base_scores": 8, "eternal_incompatible_jokers": 11, "perishable_incompatible_jokers": 18, "copy_fully_incompatible_jokers": 29, "booster_weights": 5}
    counts = {key: len(data[key]) for key in expected}
    assert counts == expected, (counts, expected)
    rarity_counts = dict(Counter(j["rarity"] for j in data["jokers"]))
    assert rarity_counts == {"Common": 61, "Uncommon": 64, "Rare": 20, "Legendary": 5}, rarity_counts
    for key in ["jokers", "tarot_cards", "planet_cards", "spectral_cards", "vouchers", "decks", "blinds", "tags", "challenges"]:
        assert len({r["id"] for r in data[key]}) == len(data[key]), key
    data["counts"] = counts
    data["joker_rarity_counts"] = rarity_counts
    (ROOT / "data/catalogs.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "data/coverage.json").write_text(json.dumps({"counts": counts, "joker_rarities": rarity_counts, "successful_source_records": sum("error" not in p for p in PAGES.values()), "source_errors": [{"id": p["id"], "error": p["error"]} for p in PAGES.values() if "error" in p]}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    prefix = "调研日期：2026-11-07。以下为公开社区 Wiki 的事实表转录，保留英文名称用于稳定检索；不是原版运行验证。每条 JSON 记录包含来源 URL、页面修订号、表号和行号（表号、行号从 0 开始）。\n\n"
    write("04-joker-catalog.md", "# 150 张 Joker 完整目录\n\n" + prefix + "来源：[Jokers](https://balatrowiki.org/w/Jokers)。Common 61、Uncommon 64、Rare 20、Legendary 5。表内价格为基础价格；N/A 表示不在商店自然售卖，不能当成价格 0。Act 是社区整理的触发分类，空白不能解释成无效果。\n\n" + table(["编号", "Joker", "稀有度", "基础价", "效果 / 数值", "触发分类", "解锁条件"], [[j["collection_number"], j["name"], j["rarity"], j["cost_text"], j["effect"], j["activation_type"], j["unlock"]] for j in data["jokers"]]))
    content = "# 消耗品与优惠券完整目录\n\n" + prefix
    for title, key, source in [("塔罗牌：22 张", "tarot_cards", "Tarot_cards"), ("星球牌：12 张", "planet_cards", "Planet_cards"), ("幻灵牌：18 张", "spectral_cards", "Spectral_cards")]:
        content += f"## {title}\n\n来源：[{source}](https://balatrowiki.org/w/{source})。\n\n" + table(["名称", "效果 / 数值"], [[r["name"], r["effect"]] for r in data[key]]) + "\n"
    content += "## 优惠券：32 张，16 组基础 / 升级\n\n来源：[Vouchers](https://balatrowiki.org/w/Vouchers)。基础价格均为 $10；二级券需满足收藏解锁，并在该局买入对应一级券后进入可选池。Notes 中可能包含社区记录的版本缺陷，实施前应实机核对。\n\n" + table(["名称", "层级", "前置券", "效果", "收藏解锁", "备注"], [[r["name"], r["tier"], r["upgrade_of"] or "—", r["effect"], r["collection_unlock"], r["notes"]] for r in data["vouchers"]])
    write("05-consumables-vouchers.md", content)
    content = "# 牌组、难度、盲注、标签与挑战目录\n\n" + prefix
    for title, key, source, headers, fields in [
        ("15 种牌组", "decks", "Decks", ["名称", "规则", "解锁"], ["name", "effect", "unlock"]),
        ("8 种难度：效果逐级累加", "stakes", "Stakes", ["名称", "新增规则", "胜利解锁牌组"], ["name", "added_effect", "deck_unlock"]),
        ("30 种盲注：2 普通 + 23 普通 Boss + 5 终局 Boss", "blinds", "Blinds", ["名称", "效果", "最低 Ante", "目标倍率", "奖励 $", "Matador 兼容"], ["name", "effect", "minimum_ante_text", "score_multiplier", "reward_dollars", "matador_compatible_text"]),
        ("24 种跳关标签", "tags", "Tags", ["名称", "效果", "Ante 限制"], ["name", "effect", "minimum_ante_text"]),
        ("20 种挑战", "challenges", "Challenges", ["名称", "定制规则", "起始道具", "起始牌堆", "限制"], ["name", "custom_rules", "starting_items", "starting_deck", "restrictions"]),
    ]:
        content += f"## {title}\n\n来源：[{source}](https://balatrowiki.org/w/{source})。\n\n" + table(headers, [[r[field] for field in fields] for r in data[key]]) + "\n"
    write("06-decks-blinds-progression.md", content)
    content = "# 强化、蜡封、版本与补充包\n\n" + prefix
    for title, key in [("强化：8 种", "enhancements"), ("蜡封：4 种", "seals"), ("版本：含基础版共 5 种", "editions"), ("功能贴纸：3 种", "stickers")]:
        content += f"## {title}\n\n来源：[Card modifiers](https://balatrowiki.org/w/Card_modifiers)。\n\n" + table(["名称", "效果"], [[r["name"], r["effect"]] for r in data[key]]) + "\n"
    content += "## 补充包：5 类 × 3 种规格\n\n来源：[Booster Packs](https://balatrowiki.org/w/Booster_Packs)。这里的 15 是规则组合数量，外包装美术变体不另外计数。\n\n" + table(["类别", "规格", "基础价 $", "可选张数与用途"], [[r["family"], r["size"], r["cost_dollars"], r["effect"]] for r in data["booster_rules"]])
    write("07-modifiers-packs.md", content)

    source_rows = [[p["id"], f'[{p.get("title", p["id"])}]({p.get("resolved_url",p["url"])})', p.get("wiki_revision_id") or "—", p.get("retrieved_at_utc", "—"), p.get("error", p.get("http_status"))] for p in PAGES.values()]
    source_intro = "# 来源、版本与采集记录\n\n调研日期：2026-11-07（Asia/Shanghai）。Wiki 属于社区资料；官方商店、开发者网站与 Steam 官方公告用于交叉核对产品范围和补丁，不把社区攻略标成官方规则说明。\n\n`source-pages.json` 保存正文、表格和链接；`sources.json` 保存 HTTP 状态、最终跳转 URL、正文哈希及修订号。页面别名可能跳转到同一规范页面，记录数不等于独立文章数。\n\nSteam news API 同时返回官方公告和媒体转载；判断时必须查看 `feedname`。2026-09-16 的 1.1 文章属于 CGMagazine，不能据此证明 1.1 已发布。官方 1.0.1f 公告全文另外保存为 `data/official-1.0.1f-patch.txt`。\n\n"
    write("08-sources-versioning.md", source_intro + table(["来源 ID", "网页", "Wiki 修订号", "采集 UTC", "状态"], source_rows) + "\n本次只采集公开文字与事实表，没有下载原版美术、音乐或游戏程序。")
    news = PAGES["steam_news"]["news"]
    patch = next(n for n in news if n["title"] == "1.0.1f - Patch notes")
    (ROOT / "data/official-1.0.1f-patch.txt").write_text("Title: " + patch["title"] + "\nURL: " + patch["url"] + "\nFeed: " + patch["feedname"] + "\nUnix timestamp: " + str(patch["date"]) + "\n\n" + patch["contents"] + "\n", encoding="utf-8")
    print(json.dumps({"counts": counts, "rarities": rarity_counts}, ensure_ascii=True))


if __name__ == "__main__":
    main()
