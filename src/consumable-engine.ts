import { consumableCatalog,consumableById,type Consumable,type ConsumableFamily } from './consumables';
import { evaluate,HANDS,initialHand,initialLevels,cardChips,hasSuit,type Card,type Enhancement,type Edition,type HandKey,type HandLevels,type Suit } from './scoring';
export type Joker={id:string;kind:string;edition?:Edition;power?:number;counter?:number;eternal?:boolean;perishable?:number;rental?:boolean;disabled?:boolean;sellBonus?:number;rank?:number;suit?:Suit;handKey?:HandKey;baseCost?:number};
export type ScoreStep={label:string;detail:string;chips:number;mult:number;target?:string;tone:string};
export type RulesState={hand:Card[];drawPile:Card[];discardPile:Card[];playedPile:Card[];selected:string[];jokers:Joker[];consumables:Consumable[];money:number;handSize:number;handLevels:HandLevels;unlockedHands:HandKey[];rngState:number;nextId:number;ectoplasmUses:number;lastUsedConsumable:string|null;lastHand:HandKey|null;roundEnded:boolean;round:number;handsPlayed:number;cardsDiscarded:number;lastEffect:string;jokerSlots?:number;consumableSlots?:number;jokerPools?:{common:string[];uncommon:string[];rare:string[];legendary:string[]};allowDuplicates?:boolean;probabilityMultiplier?:number};
export const rarePool=['blueprint','brainstorm','the_duo','the_trio','the_family','the_order','the_tribe','baron'];
export const legendaryPool=['canio','triboulet','yorick','chicot','perkeo'];
export const supportedJokerPool=['joker','sly','half',...rarePool,...legendaryPool];
export const jokerAliases:Record<string,string>={sly:'sly_joker',half:'half_joker'};
export const jokerNames:Record<string,string>={joker:'小丑',sly:'狡猾小丑',half:'半张小丑',blueprint:'蓝图',brainstorm:'头脑风暴',the_duo:'二重奏',the_trio:'三重奏',the_family:'一家人',the_order:'秩序',the_tribe:'部落',baron:'男爵',canio:'卡尼奥',triboulet:'特里布莱',yorick:'约里克',chicot:'奇科',perkeo:'佩尔科'};
export const jokerPrices:Record<string,number>={joker:2,sly:3,half:5,blueprint:10,brainstorm:10,the_duo:8,the_trio:8,the_family:8,the_order:8,the_tribe:8,baron:8,canio:20,triboulet:20,yorick:20,chicot:20,perkeo:20};
export const jokerFile=(j:Joker)=>`jokers/${jokerAliases[j.kind]??j.kind}.png`;
export function initialRules(seed=0xBA1A7):RulesState {
 const hand=initialHand(),drawPile:Card[]=[];
 for(const suit of ['S','H','C','D'] as Suit[])for(let rank=2;rank<=14;rank++)if(!hand.some(c=>c.rank===rank&&c.suit===suit))drawPile.push({id:`deck-${suit}-${rank}`,rank,suit});
 const s:RulesState={hand,drawPile,discardPile:[],playedPile:[],selected:[],jokers:[{id:'j-sly',kind:'sly'},{id:'j-joker',kind:'joker'},{id:'j-half',kind:'half',edition:'polychrome'}],consumables:[{id:'c-jupiter',kind:'jupiter'}],money:16,handSize:8,handLevels:initialLevels(),unlockedHands:(Object.keys(HANDS) as HandKey[]).filter(k=>!HANDS[k].hidden),rngState:seed>>>0||1,nextId:1,ectoplasmUses:0,lastUsedConsumable:null,lastHand:null,roundEnded:false,round:1,handsPlayed:0,cardsDiscarded:0,lastEffect:''};
 shuffle(s,s.drawPile);return s;
}
export function random(s:RulesState){let x=s.rngState;x^=x<<13;x^=x>>>17;x^=x<<5;s.rngState=x>>>0;return s.rngState/4294967296;}
export const pick=<T>(s:RulesState,items:readonly T[]):T=>items[Math.floor(random(s)*items.length)];
export function randomEdition(s:RulesState):'foil'|'holographic'|'polychrome'{const roll=random(s);return roll<.5?'foil':roll<.85?'holographic':'polychrome';}
export const uid=(s:RulesState,prefix:string)=>`${prefix}-${s.nextId++}`;
export function shuffle<T>(s:RulesState,list:T[]){for(let i=list.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
export const jokerCapacity=(s:RulesState)=>(s.jokerSlots??5)+s.jokers.filter(j=>j.edition==='negative').length;
export const consumableCapacity=(s:RulesState)=>(s.consumableSlots??2)+s.consumables.filter(c=>c.edition==='negative').length;
export const jokerSellValue=(j:Joker)=>(j.rental?1:Math.max(1,Math.floor(((j.baseCost??jokerPrices[j.kind]??2)+(j.edition==='negative'?5:j.edition==='polychrome'?5:j.edition==='holographic'?3:j.edition==='foil'?2:0))/2)))+(j.sellBonus??0);
export function addConsumable(s:RulesState,kind:string,negative=false){if(!negative&&s.consumables.length>=consumableCapacity(s))return false;s.consumables.push({id:uid(s,'cons'),kind,...(negative?{edition:'negative' as const}:{})});return true;}
export function pool(s:RulesState,family:ConsumableFamily){return consumableCatalog.filter(c=>c.family===family&&(!c.hidden||s.unlockedHands.includes(c.handKey!))&&c.id!=='soul'&&c.id!=='black_hole'&&(s.allowDuplicates||!s.consumables.some(owned=>owned.kind===c.id)));}
export function generateConsumable(s:RulesState,family:ConsumableFamily){const choices=pool(s,family);return choices.length?addConsumable(s,pick(s,choices).id):false;}
export function packChoices(s:RulesState,kind:'celestial'|'arcana'|'spectral'){
 const family=kind==='celestial'?'planet':kind==='arcana'?'tarot':'spectral';
 const choices=shuffle(s,pool(s,family)).slice(0,kind==='spectral'?2:3).map(c=>c.id);
 for(let i=0;i<choices.length;i++){
  if(kind!=='celestial'&&!choices.includes('soul')&&!s.consumables.some(c=>c.kind==='soul')&&random(s)<.003)choices[i]='soul';
  else if(kind!=='arcana'&&!choices.includes('black_hole')&&!s.consumables.some(c=>c.kind==='black_hole')&&random(s)<.003)choices[i]='black_hole';
 }
 return choices;
}
export function fillHand(s:RulesState){while(s.hand.length<Math.max(0,s.handSize)&&s.drawPile.length)s.hand.push(s.drawPile.pop()!);}
export function startRound(s:RulesState){
 if(s.roundEnded){s.drawPile=shuffle(s,[...s.drawPile,...s.hand,...s.playedPile,...s.discardPile]);s.hand=[];s.playedPile=[];s.discardPile=[];s.round++;}
 s.roundEnded=false;s.handsPlayed=0;s.lastHand=null;s.selected=[];fillHand(s);
}
function destroy(s:RulesState,cards:Card[]){
 const faces=cards.filter(c=>c.enhancement!=='stone'&&c.rank>=11&&c.rank<=13).length;
 for(const j of s.jokers)if(j.kind==='canio')j.power=(j.power??1)+faces;
 const ids=new Set(cards.map(c=>c.id));s.hand=s.hand.filter(c=>!ids.has(c.id));s.selected=s.selected.filter(id=>!ids.has(id));
}
function createJoker(s:RulesState,kind:string){s.jokers.push({id:uid(s,'joker'),kind,...(kind==='canio'||kind==='yorick'?{power:1,counter:0}:{})});}
function availableJokers(s:RulesState,choices:string[]){return choices.filter(k=>s.allowDuplicates||!s.jokers.some(j=>j.kind===k));}
export type UseResult={ok:true;state:RulesState;message:string}|{ok:false;error:string;message:string};
/** Every attempt runs on a clone: rejected targets never consume cards, IDs or RNG. */
export function useConsumable(input:RulesState,kind:string,options:{instanceId?:string;cardIds?:string[];handAvailable:boolean}):UseResult {
 const d=consumableById[kind];const bad=(error:string,message:string):UseResult=>({ok:false,error,message});
 if(!d)return bad('UNKNOWN_CONSUMABLE','消耗牌不存在');
 const s=structuredClone(input) as RulesState;
 if(options.instanceId){const index=s.consumables.findIndex(c=>c.id===options.instanceId&&c.kind===kind);if(index<0)return bad('UNAVAILABLE','消耗牌已使用或不存在');s.consumables.splice(index,1);}
 const targetIds=options.cardIds??s.selected;
 if(new Set(targetIds).size!==targetIds.length||targetIds.some(id=>!s.hand.some(c=>c.id===id)))return bad('INVALID_SELECTION','目标必须是当前手牌，且不能重复');
 if(d.hand&&(!options.handAvailable||!s.hand.length))return bad('HAND_REQUIRED','此牌需要可操作的手牌；请在牌桌或开包时使用');
 if(d.min>0&&(targetIds.length<d.min||targetIds.length>d.max))return bad('TARGET_REQUIRED',`请选择 ${d.min===d.max?d.min:`${d.min}–${d.max}`} 张手牌`);
 const targets=s.hand.filter(c=>targetIds.includes(c.id)),baseJokers=s.jokers.filter(j=>!j.edition);
 const room=()=>s.consumables.length<consumableCapacity(s);
 let message=`${d.name}已使用`;
 const enhancements:Record<string,Enhancement>={magician:'lucky',empress:'mult',hierophant:'bonus',lovers:'wild',chariot:'steel',justice:'glass',devil:'gold',tower:'stone'};
 if(d.handKey){s.handLevels[d.handKey]++;message=`${HANDS[d.handKey].name} · 等级 ${s.handLevels[d.handKey]}`;}
 else if(enhancements[kind])targets.forEach(c=>c.enhancement=enhancements[kind]);
 else if(['star','moon','sun','world'].includes(kind)){const suit=({star:'D',moon:'C',sun:'H',world:'S'} as const)[kind as 'star'];targets.forEach(c=>c.suit=suit);}
 else switch(kind){
  case 'fool':if(!s.lastUsedConsumable)return bad('NO_HISTORY','本局尚未使用其他塔罗牌或星球牌');if(!room())return bad('CONSUMABLE_LIMIT','消耗牌槽已满');addConsumable(s,s.lastUsedConsumable);break;
  case 'high_priestess':case 'emperor':{
   if(!room())return bad('CONSUMABLE_LIMIT','消耗牌槽已满');const family=kind==='emperor'?'tarot':'planet';let count=0;for(let i=0;i<2&&room();i++)if(generateConsumable(s,family))count++;if(!count)return bad('EMPTY_POOL','没有可生成的牌');message=`生成 ${count} 张${family==='tarot'?'塔罗牌':'星球牌'}`;break;
  }
  case 'hermit':{const amount=Math.max(0,Math.min(20,s.money));s.money+=amount;message=`隐者 · +$${amount}`;break;}
  case 'wheel_of_fortune':if(!baseJokers.length)return bad('NO_ELIGIBLE_JOKER','需要一张基础版本小丑');if(random(s)<.25*(s.probabilityMultiplier??1)){pick(s,baseJokers).edition=randomEdition(s);}else message='命运之轮 · 未触发（1/4）';break;
  case 'strength':targets.forEach(c=>c.rank=c.rank===14?2:c.rank+1);break;
  case 'hanged_man':destroy(s,targets);break;
  case 'death':{const id=targets[0].id;Object.assign(targets[0],targets[1]);targets[0].id=id;for(const key of ['enhancement','edition','seal','bonusChips'] as const)if(!targets[1][key])delete targets[0][key];break;}
  case 'temperance':{const amount=Math.min(50,s.jokers.reduce((n,j)=>n+jokerSellValue(j),0));if(!amount)return bad('NO_VALUE','没有可结算的小丑出售价值');s.money+=amount;message=`节制 · +$${amount}`;break;}
  case 'judgement':case 'wraith':case 'soul':{
   if(s.jokers.length>=jokerCapacity(s))return bad('JOKER_LIMIT','小丑牌槽已满');
   const rarity=kind==='judgement'?random(s):0,choices=s.jokerPools?(kind==='soul'?s.jokerPools.legendary:kind==='wraith'?s.jokerPools.rare:rarity<.7?s.jokerPools.common:rarity<.95?s.jokerPools.uncommon:s.jokerPools.rare):kind==='soul'?legendaryPool:kind==='wraith'?rarePool:rarity<.7?['joker','sly']:random(s)<5/6?['half']:rarePool;
   let available=availableJokers(s,choices);if(!available.length)available=availableJokers(s,kind==='judgement'?['joker','sly','half',...rarePool]:choices);if(!available.length)return bad('EMPTY_POOL','当前已实现能力的牌池中没有未持有的小丑');
   const chosen=pick(s,available);createJoker(s,chosen);if(kind==='wraith')s.money=0;message=`生成${jokerNames[chosen]??chosen}`;break;
  }
  case 'familiar':case 'grim':case 'incantation':{
   if(s.hand.length<2)return bad('NOT_ENOUGH_CARDS','需要至少 2 张手牌');
   destroy(s,[pick(s,s.hand)]);const count=kind==='familiar'?3:kind==='grim'?2:4;
   for(let i=0;i<count;i++)s.hand.push({id:uid(s,'card'),rank:kind==='familiar'?pick(s,[11,12,13]):kind==='grim'?14:2+Math.floor(random(s)*9),suit:pick(s,['S','H','C','D'] as const),enhancement:pick(s,['bonus','mult','wild','glass','steel','gold','lucky'] as const)});break;
  }
  case 'talisman':case 'deja_vu':case 'trance':case 'medium':targets[0].seal=({talisman:'gold',deja_vu:'red',trance:'blue',medium:'purple'} as const)[kind];break;
  case 'aura':if(targets[0].edition)return bad('HAS_EDITION','光环需要基础版本的扑克牌');targets[0].edition=randomEdition(s);break;
  case 'sigil':{const suit=pick(s,['S','H','C','D'] as const);s.hand.forEach(c=>c.suit=suit);break;}
  case 'ouija':{const rank=2+Math.floor(random(s)*13);s.hand.forEach(c=>c.rank=rank);s.handSize--;break;}
  case 'ectoplasm':if(!baseJokers.length)return bad('NO_ELIGIBLE_JOKER','需要一张基础版本小丑');pick(s,baseJokers).edition='negative';s.ectoplasmUses++;s.handSize-=s.ectoplasmUses;break;
  case 'immolate':if(s.hand.length<2)return bad('NOT_ENOUGH_CARDS','火祭需要至少 2 张手牌');destroy(s,shuffle(s,[...s.hand]).slice(0,5));s.money+=20;break;
  case 'ankh':{
   if(!s.jokers.length)return bad('NO_ELIGIBLE_JOKER','需要一张小丑牌');if(s.jokers.length>=jokerCapacity(s))return bad('JOKER_LIMIT','生命十字章需要一个空小丑槽');const original=pick(s,s.jokers),copy={...original,id:uid(s,'joker')};if(copy.edition==='negative')delete copy.edition;s.jokers=[...s.jokers.filter(j=>j===original||j.eternal),copy];break;
  }
  case 'hex':if(!baseJokers.length)return bad('NO_ELIGIBLE_JOKER','需要一张基础版本小丑');{const chosen=pick(s,baseJokers);chosen.edition='polychrome';s.jokers=s.jokers.filter(j=>j===chosen||j.eternal);}break;
  case 'cryptid':for(let i=0;i<2;i++)s.hand.push({...targets[0],id:uid(s,'card')});break;
  case 'black_hole':for(const key of Object.keys(HANDS) as HandKey[])s.handLevels[key]++;break;
  default:return bad('UNSUPPORTED_CONSUMABLE','此消耗牌尚未接入');
 }
 if((d.family==='tarot'&&kind!=='fool')||d.family==='planet')s.lastUsedConsumable=kind;
 s.selected=[];s.lastEffect=message;return {ok:true,state:s,message};
}
export function discardCards(s:RulesState,ids:string[]){
 const cards=s.hand.filter(c=>ids.includes(c.id));s.hand=s.hand.filter(c=>!ids.includes(c.id));s.discardPile.push(...cards);s.cardsDiscarded+=cards.length;
 for(const j of s.jokers)if(j.kind==='yorick'){j.counter=(j.counter??0)+cards.length;while(j.counter>=23){j.counter-=23;j.power=(j.power??1)+1;}}
 for(const c of cards)if(c.seal==='purple')generateConsumable(s,'tarot');s.selected=[];fillHand(s);
}
function ability(s:RulesState,j:Joker,seen=new Set<string>()):Joker|undefined{
 if(seen.has(j.id))return;seen.add(j.id);
 if(j.kind==='blueprint'){const next=s.jokers[s.jokers.indexOf(j)+1];return next?ability(s,next,seen):undefined;}
 if(j.kind==='brainstorm'){const first=s.jokers[0];return first?ability(s,first,seen):undefined;}return j;
}
/** Mutates only rule-side random rewards; called once when an accepted hand starts. */
export function scoreHand(s:RulesState,cards:Card[]):ScoreStep[]{
 const ev=evaluate(cards,s.handLevels);s.lastHand=ev.key;if(!s.unlockedHands.includes(ev.key))s.unlockedHands.push(ev.key);s.handsPlayed++;
 let chips=ev.chips,mult=ev.mult;const steps:ScoreStep[]=[];
 const step=(label:string,detail:string,target?:string,tone='neutral')=>steps.push({label,detail,chips,mult,target,tone});
 step(ev.name,`基础 ${chips} × ${mult}`);
 const abilities=s.jokers.map(j=>({owner:j,source:ability(s,j)}));
 for(const c of cards.filter(c=>ev.scoring.includes(c.id))){
  const repeats=c.seal==='red'?2:1;
  for(let i=0;i<repeats;i++){
   chips+=cardChips(c);step(`+${cardChips(c)}`,`${i?'红封重触 · ':''}${c.enhancement==='stone'?'石头牌':'逐牌筹码'}`,`played-${c.id}`,'blue-number');
   if(c.enhancement==='mult'){mult+=4;step('+4','倍率牌',`played-${c.id}`,'red-number');}
   if(c.enhancement==='glass'){mult*=2;step('×2','玻璃牌',`played-${c.id}`,'poly-number');}
   if(c.enhancement==='lucky'){
    if(random(s)<.2){mult+=20;step('+20','幸运牌 · 倍率',`played-${c.id}`,'red-number');}
    if(random(s)<1/15){s.money+=20;step('+$20','幸运牌 · 金钱',`played-${c.id}`);}
   }
   if(c.seal==='gold'){s.money+=3;step('+$3','金色蜡封',`played-${c.id}`);}
   for(const a of abilities)if(a.source?.kind==='triboulet'&&c.enhancement!=='stone'&&(c.rank===12||c.rank===13)){mult*=2;step('×2','特里布莱 · K/Q',a.owner.id,'poly-number');}
   if(c.edition==='foil'){chips+=50;step('+50','闪箔',`played-${c.id}`,'blue-number');}
   if(c.edition==='holographic'){mult+=10;step('+10','镭射',`played-${c.id}`,'red-number');}
   if(c.edition==='polychrome'){mult*=1.5;step('×1.5','多彩',`played-${c.id}`,'poly-number');}
  }
 }
 for(const c of s.hand.filter(c=>!cards.some(p=>p.id===c.id))){
  for(let i=0;i<(c.seal==='red'?2:1);i++){
   if(c.enhancement==='steel'){mult*=1.5;step('×1.5',`${i?'红封重触 · ':''}钢铁牌留手`,undefined,'poly-number');}
   for(const a of abilities)if(a.source?.kind==='baron'&&c.rank===13&&c.enhancement!=='stone'){mult*=1.5;step('×1.5','男爵 · 留手 K',a.owner.id,'poly-number');}
  }
 }
 const ranked=cards.filter(c=>c.enhancement!=='stone');const maxCount=Math.max(0,...ranked.map(c=>ranked.filter(o=>o.rank===c.rank).length));
 for(const {owner:j,source} of abilities){
  if(j.edition==='foil'){chips+=50;step('+50','闪箔小丑',j.id,'blue-number');}
  if(j.edition==='holographic'){mult+=10;step('+10','镭射小丑',j.id,'red-number');}
  if(source?.kind==='sly'&&maxCount>=2){chips+=50;step('+50','狡猾小丑 · 包含对子',j.id,'blue-number');}
  if(source?.kind==='joker'){mult+=4;step('+4','小丑 · 倍率',j.id,'red-number');}
  if(source?.kind==='half'&&cards.length<=3){mult+=20;step('+20','半张小丑',j.id,'red-number');}
  const kind=source?.kind;
  const factor=kind==='the_duo'&&maxCount>=2?2:kind==='the_trio'&&maxCount>=3?3:kind==='the_family'&&maxCount>=4?4:kind==='the_order'&&['straight','straight_flush'].includes(ev.key)?3:kind==='the_tribe'&&ranked.length===5&&(['S','H','C','D'] as Suit[]).some(suit=>ranked.every(c=>hasSuit(c,suit)))?2:kind==='canio'||kind==='yorick'?source?.power??1:1;
  if(factor!==1){mult*=factor;step(`×${factor}`,jokerNames[kind!],j.id,'poly-number');}
  if(j.edition==='polychrome'){mult*=1.5;step('×1.5','多彩小丑',j.id,'poly-number');}
 }
 return steps;
}
export function finishPlayedCards(s:RulesState,cards:Card[]){
 const broken=cards.filter(c=>c.enhancement==='glass'&&random(s)<.25),brokenIds=new Set(broken.map(c=>c.id));
 destroy(s,broken);s.hand=s.hand.filter(c=>!cards.some(p=>p.id===c.id));s.playedPile.push(...cards.filter(c=>!brokenIds.has(c.id)));s.selected=[];
 return broken;
}
export function finishRound(s:RulesState){
 if(s.roundEnded)return;s.roundEnded=true;let dollars=0;
 for(const c of s.hand)for(let i=0;i<(c.seal==='red'?2:1);i++){
  if(c.enhancement==='gold'){s.money+=3;dollars+=3;}
  if(c.seal==='blue'&&s.lastHand)addConsumable(s,HANDS[s.lastHand].planet);
 }
 s.lastEffect=`回合结束${dollars?` · 留手黄金 +$${dollars}`:''}`;
}
export function leaveShop(s:RulesState){for(const j of s.jokers)if(ability(s,j)?.kind==='perkeo'&&s.consumables.length){const chosen=pick(s,s.consumables);addConsumable(s,chosen.kind,true);}startRound(s);}
