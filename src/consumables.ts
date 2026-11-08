import { HANDS, type HandKey } from './scoring';
export type ConsumableFamily='tarot'|'planet'|'spectral';
export type ConsumableDefinition={id:string;name:string;en:string;family:ConsumableFamily;description:string;min:number;max:number;hand?:boolean;handKey?:HandKey;hidden?:boolean;file:string;price:number};
export type Consumable={id:string;kind:string;edition?:'negative';sellBonus?:number};
export const familyNames={tarot:'塔罗牌',planet:'星球牌',spectral:'幻灵牌'};
type Row=[string,string,string,string,number?,number?,boolean?];
const tarot:Row[]=[
 ['fool','愚者','The Fool','生成本局最后使用的塔罗牌或星球牌；不包括愚者。须有空位。'],
 ['magician','魔术师','The Magician','将至多 2 张选中的牌增强为幸运牌。',1,2],
 ['high_priestess','女祭司','The High Priestess','生成至多 2 张随机星球牌；须有空位。'],
 ['empress','皇后','The Empress','将至多 2 张选中的牌增强为倍率牌。',1,2],
 ['emperor','皇帝','The Emperor','生成至多 2 张随机塔罗牌；须有空位。'],
 ['hierophant','教皇','The Hierophant','将至多 2 张选中的牌增强为奖励牌。',1,2],
 ['lovers','恋人','The Lovers','将 1 张选中的牌增强为万能牌。',1,1],
 ['chariot','战车','The Chariot','将 1 张选中的牌增强为钢铁牌。',1,1],
 ['justice','正义','Justice','将 1 张选中的牌增强为玻璃牌。',1,1],
 ['hermit','隐者','The Hermit','金钱翻倍，最多增加 $20。'],
 ['wheel_of_fortune','命运之轮','The Wheel of Fortune','有 1/4 概率为随机一张基础版本小丑添加闪箔、镭射或多彩。'],
 ['strength','力量','Strength','将至多 2 张选中的牌的点数提升 1；A 变为 2。',1,2],
 ['hanged_man','倒吊人','The Hanged Man','摧毁至多 2 张选中的牌。',1,2],
 ['death','死神','Death','选择 2 张牌，将手牌中左侧的牌变为右侧牌的完整副本；可拖动排序。',2,2],
 ['temperance','节制','Temperance','获得当前所有小丑牌的总出售价值，最多 $50。'],
 ['devil','恶魔','The Devil','将 1 张选中的牌增强为黄金牌。',1,1],
 ['tower','塔','The Tower','将 1 张选中的牌增强为石头牌。',1,1],
 ['star','星星','The Star','将至多 3 张选中的牌转换为方块。',1,3],
 ['moon','月亮','The Moon','将至多 3 张选中的牌转换为梅花。',1,3],
 ['sun','太阳','The Sun','将至多 3 张选中的牌转换为红桃。',1,3],
 ['judgement','审判','Judgement','生成一张随机小丑牌；须有空位。'],
 ['world','世界','The World','将至多 3 张选中的牌转换为黑桃。',1,3],
];
const spectral:Row[]=[
 ['familiar','使魔','Familiar','摧毁 1 张随机手牌，添加 3 张随机增强人头牌。',0,0,true],
 ['grim','严峻','Grim','摧毁 1 张随机手牌，添加 2 张随机增强 A。',0,0,true],
 ['incantation','咒语','Incantation','摧毁 1 张随机手牌，添加 4 张随机增强数字牌。',0,0,true],
 ['talisman','护身符','Talisman','为 1 张选中的牌添加金色蜡封。',1,1],
 ['aura','光环','Aura','为 1 张选中的牌添加闪箔、镭射或多彩版本。',1,1],
 ['wraith','幽灵','Wraith','生成一张随机稀有小丑，金钱归零；须有空位。'],
 ['sigil','符印','Sigil','所有手牌转换为同一种随机花色。',0,0,true],
 ['ouija','占卜','Ouija','所有手牌转换为同一个随机点数，手牌上限 −1。',0,0,true],
 ['ectoplasm','灵质','Ectoplasm','为一张随机基础版本小丑添加负片。每次使用的手牌上限惩罚依次为 −1、−2、−3……。'],
 ['immolate','火祭','Immolate','摧毁 5 张随机手牌，获得 $20。',0,0,true],
 ['ankh','生命十字章','Ankh','保留一张随机小丑并复制它，摧毁其他小丑；副本去除负片。'],
 ['deja_vu','既视感','Deja Vu','为 1 张选中的牌添加红色蜡封。',1,1],
 ['hex','妖法','Hex','为一张随机基础版本小丑添加多彩，摧毁其他小丑。'],
 ['trance','入迷','Trance','为 1 张选中的牌添加蓝色蜡封。',1,1],
 ['medium','灵媒','Medium','为 1 张选中的牌添加紫色蜡封。',1,1],
 ['cryptid','神秘生物','Cryptid','在手牌中生成选中牌的 2 个完整副本。',1,1],
 ['soul','灵魂','The Soul','生成一张随机传奇小丑牌；须有空位。'],
 ['black_hole','黑洞','Black Hole','全部 12 种计分牌型各提升 1 级，包含尚未解锁的隐藏牌型。'],
];
function fromRows(rows:Row[],family:ConsumableFamily):ConsumableDefinition[]{return rows.map(([id,name,en,description,min=0,max=0,hand=false])=>({id,name,en,family,description,min,max,hand:hand||min>0,file:`consumables/${id}.png`,price:family==='spectral'?4:3}));}
export const consumableCatalog:ConsumableDefinition[]=[...fromRows(tarot,'tarot'),...Object.entries(HANDS).map(([key,h])=>({id:h.planet,name:h.planetName,en:h.planetEn,family:'planet' as const,description:`${h.name}等级 +1：每级 +${h.chipStep} 筹码、+${h.multStep} 倍率。`,min:0,max:0,handKey:key as HandKey,hidden:h.hidden,file:`consumables/${h.planet}.png`,price:3})),...fromRows(spectral,'spectral')];
export const consumableById=Object.fromEntries(consumableCatalog.map(c=>[c.id,c])) as Record<string,ConsumableDefinition>;
