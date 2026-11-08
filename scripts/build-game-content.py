"""Build the all-unlocked gameplay metadata from the reviewed research snapshots."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'docs/balatro/data/catalogs.json').read_text(encoding='utf-8'))
cross={x['id']:x for x in json.loads((root/'docs/balatro/data/balatrohq/joker-crosswalk.json').read_text(encoding='utf-8'))}
fixes={
 'bloodstone':'打出并计分的红桃牌有 1/2 概率提供 ×1.5 倍率。',
 '8_ball':'每张打出并计分的 8 有 1/4 概率生成一张塔罗牌；须有空位。',
 'perkeo':'离开商店时，生成一张随机持有消耗牌的负片副本。',
 'constellation':'每使用一张星球牌，X 倍率增加 0.1；初始 X1。',
 'hologram':'每向牌组添加一张扑克牌，X 倍率增加 0.25；初始 X1。',
 'glass_joker':'每摧毁一张玻璃牌，X 倍率增加 0.75；初始 X1。',
 'madness':'选择小盲注或大盲注时，X 倍率增加 0.5，并摧毁一张随机小丑；初始 X1。',
 'canio':'每摧毁一张人头牌，X 倍率增加 1；初始 X1。',
 'yorick':'每弃掉 23 张扑克牌，X 倍率增加 1；初始 X1。',
 'lucky_cat':'每次幸运牌成功触发，X 倍率增加 0.25；初始 X1。',
 'campfire':'每售出一张卡牌，X 倍率增加 0.25；击败 Boss 后重置为 X1。',
 'hit_the_road':'本回合每弃掉一张 J，X 倍率增加 0.5；初始 X1。',
 'obelisk':'连续打出非本局最常用牌型时，X 倍率增加 0.2；否则重置为 X1。',
 'steel_joker':'完整牌组中每张钢铁牌提供额外 0.2 X 倍率；基础 X1。',
 'throwback':'本局每跳过一个盲注，X 倍率增加 0.25；基础 X1。',
}
jokers=[{**{k:j[k] for k in ['id','name','rarity','effect']},'cost':j['cost_dollars'] or 20,'zh':cross[j['id']]['site_name_zh'],'description':fixes.get(j['id'],cross[j['id']]['site_effect_zh'])} for j in data['jokers']]
out={'jokers':jokers}
for key in ['vouchers','decks','blinds','tags','ante_base_scores']:
 out[key]=[{k:v for k,v in row.items() if k not in ['source','unlock','collection_unlock']} for row in data[key]]
for key in ['eternal_incompatible_jokers','perishable_incompatible_jokers','copy_fully_incompatible_jokers']:
 out[key]=[j['id'] for j in jokers if any(r['name']==j['name'] for r in data[key])]
dest=Path(__file__).resolve().parents[1]/'src/game-content.json'
dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Generated:',len(jokers),'Jokers; all-unlocked metadata')
