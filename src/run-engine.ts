import {initialRules,useConsumable,randomEdition} from './consumable-engine';
import {consumableCatalog,consumableById,type Consumable} from './consumables';
import {HANDS,initialLevels,type Card,type HandKey,type Suit} from './scoring';
import {content,jokerDefs,voucherDefs,blindDefs,tagNames} from './run-content';
import {abilities,owned,has,count,allCards,canonical,isFace,suitMatches,living,sellValue,makeJoker,randomJoker,generate,addedCards,destroyedCards,destroyCards,recalculate,onBlind,onDiscard,onSold,newRoundTargets,probability,random,pick,shuffle,uid,jokerCapacity,consumableCapacity,addConsumable} from './run-jokers';
import {evaluateRun,scoreRun} from './run-score';
import {suits,type RunState,type RunAction,type RunResult,type Offer,type PackOffer,type PackState} from './run-types';
export type {RunState,RunAction,RunResult};
export {evaluateRun,jokerCapacity,consumableCapacity,sellValue,allCards};
const handKeys=Object.keys(HANDS) as HandKey[];
const v=(s:RunState,id:string)=>Number(s.vouchers.includes(id));
const note=(s:RunState,text:string)=>{s.lastEffect=text;s.log.push(text);s.log=s.log.slice(-80);};
const hash=(text:string)=>{let n=2166136261;for(const char of text)n=Math.imul(n^char.charCodeAt(0),16777619);return n>>>0||1;};
function fail(message:string):never{throw new Error(message);}
const requirePhase=(s:RunState,...phases:RunState['phase'][])=>{if(!phases.includes(s.phase))fail('当前阶段不能执行此操作');};
const cardIds=(s:RunState,value:unknown,min=0,max=5)=>{if(!Array.isArray(value)||value.some(x=>typeof x!=='string')||new Set(value).size!==value.length||value.length<min||value.length>max||value.some(id=>!s.hand.some(c=>c.id===id)))fail(`请选择 ${min}–${max} 张当前手牌`);return value as string[];};
export function createRun(options:{seed?:string;deck?:string;stake?:number}={}):RunState{
 const seed=options.seed?.trim().slice(0,32)||'JIMBO',deck=options.deck??'red_deck',stake=options.stake??0;
 if(!content.decks.some(d=>d.id===deck)||!Number.isInteger(stake)||stake<0||stake>7)throw new Error('牌组或难度无效');
 const base=initialRules(hash(seed));
 const s:RunState={...base,forcedCardId:null,voucherAnte:0,schema:'balatro-run/1',revision:0,seed,deck,stake,allUnlocked:true,phase:'blind_select',money:4,hand:[],drawPile:[],playedPile:[],discardPile:[],jokers:[],consumables:[],round:0,handLevels:initialLevels(),ante:1,blindIndex:0,boss:'the_hook',bossHistory:[],bossDisabled:false,bossHand:null,bossRank:'high',hands:4,discards:3,discardsUsed:0,total:0,target:300,roundHands:{},handCounts:Object.fromEntries(handKeys.map(k=>[k,0])) as Record<HandKey,number>,totalHands:0,skipped:0,unusedDiscards:0,tarotsUsed:0,planetsUsed:[],startingDeckSize:52,handSizePenalty:0,vouchers:[],voucherOffers:[],offers:[],packs:[],pack:null,tags:[],blindTags:[],juggle:0,rerolls:0,freeRerolls:0,bossRerolled:false,cashout:[],scoreSteps:[],lastScore:0,playedIds:[],grosMichelDestroyed:false,log:[],lastError:null,elapsedRounds:0,bestHand:0,won:false,orbitalHand:'high'};
 for(const suit of suits)for(let rank=2;rank<=14;rank++){
  if(deck==='abandoned_deck'&&rank>=11&&rank<=13)continue;
  s.drawPile.push({id:uid(s,'card'),rank:deck==='erratic_deck'?2+Math.floor(random(s)*13):rank,suit:deck==='checkered_deck'?(suit==='C'?'S':suit==='D'?'H':suit):deck==='erratic_deck'?pick(s,suits):suit});
 }
 s.startingDeckSize=s.drawPile.length;
 if(deck==='yellow_deck')s.money+=10;
 if(deck==='magic_deck'){s.vouchers=['crystal_ball'];s.consumables=[{id:uid(s,'cons'),kind:'fool'},{id:uid(s,'cons'),kind:'fool'}];}
 if(deck==='nebula_deck')s.vouchers=['telescope'];
 if(deck==='ghost_deck')s.consumables=[{id:uid(s,'cons'),kind:'hex'}];
 if(deck==='zodiac_deck')s.vouchers=['tarot_merchant','planet_merchant','overstock'];
 s.forcedCardId=null;recalculate(s);shuffle(s,s.drawPile);rollAnte(s);note(s,'新的一局 · 所有局外内容已解锁');return s;
}
function rollBoss(s:RunState){
 const showdown=s.ante%8===0;
 let pool=content.blinds.filter(b=>b.id!=='small_blind'&&b.id!=='big_blind'&&(showdown?b.minimum_ante_text==='8':b.minimum_ante_text!=='8'&&(b.minimum_ante_text==='Any'||Number(b.minimum_ante_text)<=s.ante))&&!s.bossHistory.includes(b.id));
 if(!pool.length){s.bossHistory=[];pool=content.blinds.filter(b=>showdown?b.minimum_ante_text==='8':b.id!=='small_blind'&&b.id!=='big_blind'&&b.minimum_ante_text!=='8'&&(b.minimum_ante_text==='Any'||Number(b.minimum_ante_text)<=s.ante));}
 s.boss=pick(s,pool).id;s.bossHistory.push(s.boss);
}
function rollAnte(s:RunState){
 rollBoss(s);s.bossRerolled=false;
 const tagPool=content.tags.filter(t=>s.ante>1||!['negative_tag','standard_tag','meteor_tag','buffoon_tag','handy_tag','garbage_tag','ethereal_tag','top_up_tag','orbital_tag','economy_tag'].includes(t.id));
 s.blindTags=[pick(s,tagPool).id,pick(s,tagPool).id];s.orbitalHand=pick(s,handKeys.filter(k=>s.unlockedHands.includes(k)));
 s.bossRank=handKeys.reduce((best,k)=>s.handCounts[k]>s.handCounts[best]?k:best,'high');
}
export function blindId(s:RunState,index=s.blindIndex){return index===0?'small_blind':index===1?'big_blind':s.boss;}
export function blindTarget(s:RunState,index=s.blindIndex){
 const ante=Math.max(1,s.ante),row=content.ante_base_scores[Math.min(8,ante)-1],base=s.ante<=0?100:s.stake>=5?row.purple_through_gold:s.stake>=2?row.green_through_blue:row.white_or_red;
 const endless=ante<=8?1:Math.pow(2.2,Math.pow(ante-8,1.75));
 return Math.floor(base*endless*(blindDefs[blindId(s,index)]?.score_multiplier??2)*(s.deck==='plasma_deck'?2:1));
}
export function shopPrice(s:RunState,offer:Offer|PackOffer|string):number{
 if(typeof offer==='string')return Math.max(1,Math.floor(10*(v(s,'liquidation')?.5:v(s,'clearance_sale')?.75:1)));
 if(offer.free)return 0;
 let cost=0;
 if('size'in offer){cost=offer.size==='mega'?8:offer.size==='jumbo'?6:4;if(offer.kind==='celestial'&&has(s,'astronomer'))return 0;}
 else if(offer.type==='joker'){const j=offer.joker!;if(j.rental)return 1;cost=(jokerDefs[canonical(j.kind)]?.cost??2)+(j.edition?{foil:2,holographic:3,polychrome:5,negative:5}[j.edition]:0);}
 else if(offer.type==='consumable'){cost=consumableById[offer.kind!].price;if(consumableById[offer.kind!].family==='planet'&&has(s,'astronomer'))return 0;}
 else cost=1+(offer.card?.enhancement?1:0)+(offer.card?.edition?{foil:2,holographic:3,polychrome:5}[offer.card.edition]:0);
 return Math.max(1,Math.floor(cost*(v(s,'liquidation')?.5:v(s,'clearance_sale')?.75:1)));
}
export const rerollPrice=(s:RunState)=>s.freeRerolls>0?0:Math.max(0,5-2*v(s,'reroll_surplus')-2*v(s,'reroll_glut')+s.rerolls);
function pay(s:RunState,price:number){if(!Number.isFinite(price)||s.money-price<(has(s,'credit_card')?-20:0))fail('资金不足');s.money-=price;}
function randomCard(s:RunState,enhanced=false,standard=false):Card{
 const c:Card={id:uid(s,'card'),rank:2+Math.floor(random(s)*13),suit:pick(s,suits)};
 if(enhanced&&random(s)<.4)c.enhancement=pick(s,['bonus','mult','wild','glass','steel','stone','gold','lucky'] as const);
 const roll=random(s);if((standard||enhanced)&&roll<.08)c.edition=roll<.012?'polychrome':roll<.04?'holographic':'foil';
 if(standard&&random(s)<.2)c.seal=pick(s,['red','blue','gold','purple'] as const);return c;
}
function randomConsume(s:RunState,family:'tarot'|'planet'|'spectral'){
 const pool=consumableCatalog.filter(c=>c.family===family&&c.id!=='soul'&&c.id!=='black_hole'&&(!c.hidden||s.unlockedHands.includes(c.handKey!))&&(has(s,'showman')||(!s.consumables.some(o=>o.kind===c.id)&&!s.offers.some(o=>o.kind===c.id))));
 return pool.length?pick(s,pool).id:undefined;
}
function fillOffers(s:RunState){
 const total=2+v(s,'overstock')+v(s,'overstock_plus');
 for(let attempt=0;s.offers.length<total&&attempt<200;attempt++){
  const tarot=4*(v(s,'tarot_tycoon')?4:v(s,'tarot_merchant')?2:1),planet=4*(v(s,'planet_tycoon')?4:v(s,'planet_merchant')?2:1),playing=v(s,'magic_trick')?4:0,spectral=s.deck==='ghost_deck'?2:0;
  const roll=random(s)*(20+tarot+planet+playing+spectral);let offer:Offer;
  if(roll<20){const j=randomJoker(s);if(!j)break;offer={id:uid(s,'offer'),type:'joker',joker:j};}
  else if(roll<20+tarot+planet){const kind=randomConsume(s,roll<20+tarot?'tarot':'planet');if(!kind)continue;offer={id:uid(s,'offer'),type:'consumable',kind};}
  else if(roll<20+tarot+planet+playing)offer={id:uid(s,'offer'),type:'card',card:randomCard(s,!!v(s,'illusion'))};
  else{const kind=randomConsume(s,'spectral');if(!kind)continue;offer={id:uid(s,'offer'),type:'consumable',kind};}
  if(!has(s,'showman')&&offer.joker&&s.offers.some(o=>o.joker?.kind===offer.joker!.kind))continue;
  s.offers.push(offer);
 }
}
function voucherPool(s:RunState){return content.vouchers.filter(x=>!s.vouchers.includes(x.id)&&!s.voucherOffers.includes(x.id)&&(!x.upgrade_of||s.vouchers.includes(x.upgrade_of))).map(x=>x.id);}
function enterShop(s:RunState){
 s.phase='shop';s.selected=[];s.rerolls=0;s.freeRerolls=count(s,'chaos_the_clown');s.offers=[];fillOffers(s);
 if(s.voucherAnte!==s.ante){s.voucherOffers=[];const pool=voucherPool(s);if(pool.length)s.voucherOffers=[pick(s,pool)];s.voucherAnte=s.ante;}
 const pack=():PackOffer=>{const r=random(s),kind=r<.2667?'arcana':r<.5334?'celestial':r<.8?'standard':r<.9334?'buffoon':'spectral',size=random(s);return {id:uid(s,'pack'),kind,size:size<.7?'normal':size<.9?'jumbo':'mega'};};
 s.packs=[pack(),pack()];if(s.elapsedRounds===1&&s.skipped===0)s.packs[0]={id:uid(s,'pack'),kind:'buffoon',size:'normal'};
 const pending=s.tags;s.tags=[];
 for(const tag of pending){
  if(tag==='coupon_tag'){s.offers.forEach(o=>o.free=true);s.packs.forEach(p=>p.free=true);}
  else if(tag==='d6_tag'){s.rerolls=-Math.max(0,5-2*v(s,'reroll_surplus')-2*v(s,'reroll_glut'));}
  else if(tag==='voucher_tag'){const pool=voucherPool(s);if(pool.length)s.voucherOffers.push(pick(s,pool));}
  else if(tag==='rare_tag'||tag==='uncommon_tag'){const j=randomJoker(s,tag==='rare_tag'?'rare':'uncommon');if(j)s.offers.push({id:uid(s,'offer'),type:'joker',joker:j,free:true});}
  else if(['negative_tag','foil_tag','holographic_tag','polychrome_tag'].includes(tag)){
   const offer=s.offers.find(o=>o.joker&&!o.joker.edition);if(offer){offer.joker!.edition=tag.replace('_tag','') as NonNullable<typeof offer.joker>['edition'];offer.free=true;}else s.tags.push(tag);
  }else s.tags.push(tag);
 }
 note(s,'进入商店');
}
function applyPendingEditions(s:RunState){
 for(const tag of [...s.tags])if(['negative_tag','foil_tag','holographic_tag','polychrome_tag'].includes(tag)){
  const offer=s.offers.find(o=>o.joker&&!o.joker.edition);
  if(offer){offer.joker!.edition=tag.replace('_tag','') as NonNullable<typeof offer.joker>['edition'];offer.free=true;s.tags.splice(s.tags.indexOf(tag),1);}
 }
}
export function applyBoss(s:RunState){
 s.bossDisabled=s.bossDisabled||has(s,'chicot');
 const boss=s.blindIndex===2&&!s.bossDisabled?s.boss:'';
 for(const c of allCards(s))c.debuffed=false;
 for(const c of allCards(s)){c.debuffed=boss==='verdant_leaf'||boss==='the_club'&&suitMatches(s,c,'C')||boss==='the_goad'&&suitMatches(s,c,'S')||boss==='the_window'&&suitMatches(s,c,'D')||boss==='the_head'&&suitMatches(s,c,'H')||boss==='the_plant'&&isFace(s,c)||boss==='the_pillar'&&s.playedIds.includes(c.id);}
 recalculate(s);
}
function forceSelection(s:RunState){
 const forced=s.phase==='playing'&&s.blindIndex===2&&!s.bossDisabled&&s.boss==='cerulean_bell';
 if(!forced)s.forcedCardId=null;
 else if(!s.hand.some(c=>c.id===s.forcedCardId))s.forcedCardId=s.hand.length?pick(s,s.hand).id:null;
 if(s.forcedCardId&&!s.selected.includes(s.forcedCardId))s.selected=[s.forcedCardId,...s.selected].slice(0,5);
}
function draw(s:RunState,initial=false,afterPlay=false){
 const boss=s.blindIndex===2&&!s.bossDisabled?s.boss:'',amount=boss==='the_serpent'&&!initial?3:Math.max(0,s.handSize-s.hand.length);
 for(let i=0;i<amount&&s.drawPile.length;i++){
  const c=s.drawPile.pop()!;c.faceDown=boss==='the_house'&&initial||boss==='the_fish'&&afterPlay||boss==='the_wheel'&&probability(s,7)||boss==='the_mark'&&isFace(s,c);s.hand.push(c);
 }
 applyBoss(s);
 forceSelection(s);
}
function selectBlind(s:RunState){
 requirePhase(s,'blind_select');
 s.phase='playing';s.bossDisabled=has(s,'chicot');s.bossHand=null;s.forcedCardId=null;s.lastHand=null;s.roundHands={};s.total=0;s.lastScore=0;s.scoreSteps=[];s.selected=[];s.discardsUsed=0;s.roundEnded=false;s.handsPlayed=0;s.round++;
 s.drawPile=allCards(s).map(c=>({...c,debuffed:false,faceDown:false}));s.hand=[];s.playedPile=[];s.discardPile=[];
 for(const j of s.jokers)j.disabled=false;
 recalculate(s);s.target=blindTarget(s);
 s.hands=Math.max(1,4+Number(s.deck==='blue_deck')-Number(s.deck==='black_deck')+v(s,'grabber')+v(s,'nacho_tong')-v(s,'hieroglyph')-count(s,'troubadour'));
 s.discards=Math.max(0,3+Number(s.deck==='red_deck')-Number(s.stake>=4)+v(s,'wasteful')+v(s,'recyclomancy')-v(s,'petroglyph')+count(s,'drunkard')+3*count(s,'merry_andy'));
 newRoundTargets(s);onBlind(s);
 if(s.blindIndex===2&&!s.bossDisabled){if(s.boss==='the_water')s.discards=0;if(s.boss==='the_needle')s.hands=1;if(s.boss==='amber_acorn')shuffle(s,s.jokers);}
 draw(s,true);disableHeart(s);note(s,'盲注开始');
}
function disableHeart(s:RunState){
 for(const j of s.jokers)j.disabled=false;
 if(s.blindIndex===2&&s.boss==='crimson_heart'&&!s.bossDisabled&&s.jokers.length)pick(s,s.jokers).disabled=true;
}
function finishRound(s:RunState){
 s.roundEnded=true;s.forcedCardId=null;s.elapsedRounds++;s.unusedDiscards+=s.discards;const boss=s.blindIndex===2;
 const lines:{label:string;amount:number}[]=[];const income=(label:string,amount:number)=>{if(amount){s.money+=amount;lines.push({label,amount});}};
 // Sticker expiry precedes cash-out Joker abilities. Rental remains active on expired cards.
 for(const j of s.jokers)if(j.perishable!==undefined&&j.perishable>0)j.perishable--;
 for(const c of s.hand)if(!c.debuffed){const repeats=1+Number(c.seal==='red')+abilities(s).filter(a=>a.source.kind==='mime').length;for(let i=0;i<repeats;i++){if(c.enhancement==='gold')income('留手黄金牌',3);if(c.seal==='blue'&&s.lastHand)addConsumable(s,HANDS[s.lastHand].planet);}}
 for(const j of s.jokers){
  if(living(j)){
   if(j.kind==='golden_joker')income('黄金小丑',4);
   if(j.kind==='cloud_9')income('9 霄云外',allCards(s).filter(c=>c.rank===9&&c.enhancement!=='stone').length);
   if(j.kind==='rocket'){if(boss)j.power=(j.power??1)+2;income('火箭',j.power??1);}
   if(j.kind==='satellite')income('卫星',s.planetsUsed.length);
   if(j.kind==='delayed_gratification'&&s.discardsUsed===0)income('延迟满足',s.discards*2);
   if(j.kind==='egg')j.sellBonus=(j.sellBonus??0)+3;
   if(j.kind==='gift_card'){for(const o of [...s.jokers,...s.consumables])o.sellBonus=(o.sellBonus??0)+1;}
   if(j.kind==='popcorn')j.power=(j.power??20)-4;
   if(j.kind==='turtle_bean')j.power=(j.power??5)-1;
   if(j.kind==='invisible_joker')j.counter=(j.counter??0)+1;
   if(j.kind==='campfire'&&boss)j.power=1;
  }
  if(j.rental)income('租用费用',-3);
 }
 for(const j of [...s.jokers]){
  if(j.eternal)continue;
  const gone=j.kind==='gros_michel'&&living(j)&&probability(s,6)||j.kind==='cavendish'&&living(j)&&probability(s,1000)||j.kind==='popcorn'&&(j.power??20)<=0||j.kind==='turtle_bean'&&(j.power??5)<=0;
  if(gone){if(j.kind==='gros_michel')s.grosMichelDestroyed=true;s.jokers=s.jokers.filter(o=>o!==j);}
 }
 if(boss){const investments=s.tags.filter(t=>t==='investment_tag').length;income('投资标签',25*investments);s.tags=s.tags.filter(t=>t!=='investment_tag');if(s.deck==='anaglyph_deck')s.tags.push('double_tag');}
 const cap=v(s,'money_tree')?20:v(s,'seed_money')?10:5,interest=s.deck==='green_deck'?0:Math.min(cap,Math.max(0,Math.floor(s.money/5)))*(1+count(s,'to_the_moon'));
 const baseReward=s.blindIndex===0&&s.stake>=1?0:blindDefs[blindId(s)].reward_dollars;
 const hands=s.hands*(s.deck==='green_deck'?2:1),discards=s.deck==='green_deck'?s.discards:0;
 // Already-earned card/Joker money is listed as informational; the remaining payout is applied once by cash_out.
 s.cashout=[...lines.map(l=>({...l,label:l.label+'（已入账）'})),{label:'盲注奖励',amount:baseReward},{label:'剩余出牌',amount:hands},...(discards?[{label:'剩余弃牌',amount:discards}]:[]),{label:'利息',amount:interest}];
 s.phase='cash_out';s.juggle=0;recalculate(s);note(s,'盲注完成 · 领取奖励');
}
function handlePlay(s:RunState,ids:string[]){
 const cards=s.hand.filter(c=>ids.includes(c.id));if(!cards.length||s.hands<=0)fail('请选择要打出的牌');
 if(s.forcedCardId&&!ids.includes(s.forcedCardId))fail('必须包含天青之铃选中的牌');
 applyBoss(s);const result=scoreRun(s,cards);s.lastScore=result.score;s.scoreSteps=result.steps;s.total+=result.score;s.bestHand=Math.max(s.bestHand,result.score);s.hands--;
 const before=new Set(allCards(s).map(c=>c.id));
 const broken=cards.filter(c=>result.evaluation.scoring.includes(c.id)&&!c.debuffed&&c.enhancement==='glass'&&probability(s,4));destroyCards(s,broken);
 const brokenIds=new Set(broken.map(c=>c.id));const remain=cards.filter(c=>before.has(c.id)&&!brokenIds.has(c.id)&&allCards(s).some(o=>o.id===c.id));
 s.hand=s.hand.filter(c=>!ids.includes(c.id));s.playedPile.push(...remain);s.playedIds=[...new Set([...s.playedIds,...cards.map(c=>c.id)])];s.selected=[];
 if(s.blindIndex===2&&s.boss==='the_hook'&&!s.bossDisabled){const removed=shuffle(s,[...s.hand]).slice(0,2);s.hand=s.hand.filter(c=>!removed.includes(c));s.discardPile.push(...removed);for(const c of removed)if(c.seal==='purple'&&!c.debuffed)generate(s,'tarot');}
 if(s.total>=s.target)finishRound(s);
 else if(s.hands<=0||(!s.hand.length&&!s.drawPile.length)){
  const bones=s.jokers.find(j=>j.kind==='mr_bones'&&living(j));if(bones&&s.total>=s.target*.25){s.jokers=s.jokers.filter(j=>j!==bones);finishRound(s);}else{s.phase='lost';s.roundEnded=true;note(s,'本局结束 · 未达到盲注目标');}
 }else{disableHeart(s);s.forcedCardId=null;draw(s,false,true);note(s,`${result.evaluation.name} · ${result.score.toLocaleString()} 分`);}
}
function closePack(s:RunState){
 const pack=s.pack!;if(pack.temporaryHand){s.drawPile.push(...s.hand);s.hand=[];s.selected=[];}
 s.phase=pack.returnTo;s.pack=null;recalculate(s);
 if(pack.returnTo==='blind_select'){
  const next=s.tags.find(t=>['standard_tag','charm_tag','meteor_tag','buffoon_tag','ethereal_tag'].includes(t));
  if(next){s.tags.splice(s.tags.indexOf(next),1);applyTag(s,next);}
 }
}
function openPack(s:RunState,offer:PackOffer,returnTo:'shop'|'blind_select'='shop'){
 pay(s,shopPrice(s,offer));s.packs=s.packs.filter(p=>p.id!==offer.id);
 const count=offer.kind==='spectral'||offer.kind==='buffoon'?(offer.size==='normal'?2:4):(offer.size==='normal'?3:5),options:Offer[]=[];
 for(let attempt=0;options.length<count&&attempt<200;attempt++){
  const i=options.length;
  if(offer.kind==='buffoon'){const j=randomJoker(s);if(j&&(has(s,'showman')||!options.some(o=>o.joker?.kind===j.kind)))options.push({id:uid(s,'option'),type:'joker',joker:j});}
  else if(offer.kind==='standard')options.push({id:uid(s,'option'),type:'card',card:randomCard(s,true,true)});
  else{
   let family=offer.kind==='celestial'?'planet' as const:offer.kind==='arcana'?'tarot' as const:'spectral' as const;
   if(offer.kind==='arcana'&&v(s,'omen_globe')&&random(s)<.2)family='spectral';
   let kind=randomConsume(s,family);if(!kind)continue;
   if(offer.kind!=='celestial'&&random(s)<.003)kind='soul';else if(offer.kind!=='arcana'&&random(s)<.003)kind='black_hole';
   if(offer.kind==='celestial'&&i===0&&v(s,'telescope')){const hand=handKeys.reduce((a,b)=>s.handCounts[b]>s.handCounts[a]?b:a,'high');kind=HANDS[hand].planet;}
   if(options.some(o=>o.kind===kind)&&!has(s,'showman'))continue;options.push({id:uid(s,'option'),type:'consumable',kind});
  }
 }
 const temporaryHand=offer.kind==='arcana'||offer.kind==='spectral';
 if(temporaryHand){s.drawPile=shuffle(s,allCards(s).map(c=>({...c,debuffed:false,faceDown:false})));s.hand=[];s.playedPile=[];s.discardPile=[];while(s.hand.length<s.handSize&&s.drawPile.length)s.hand.push(s.drawPile.pop()!);}
 s.pack={kind:offer.kind,size:offer.size,options,remaining:offer.size==='mega'?2:1,returnTo,temporaryHand};s.phase='pack';s.selected=[];
 for(const a of abilities(s))if(a.source.kind==='hallucination'&&probability(s,2))generate(s,'tarot');note(s,'选择卡包内容');
}
function consume(s:RunState,kind:string,instanceId?:string,ids?:string[]):RunState{
 recalculate(s);const before=structuredClone(allCards(s)),beforeJokers=structuredClone(s.jokers),oldSize=s.handSize;
 const result=useConsumable(s,kind,{instanceId,cardIds:ids,handAvailable:s.phase==='playing'||s.phase==='pack'&&!!s.pack?.temporaryHand});
 if(!result.ok)fail(result.message);Object.assign(s,result.state);
 // The shared consumable kernel preserves the run's extra state. Feed permanent card changes into growth events.
 for(const j of s.jokers)if(j.kind==='canio'){const previous=beforeJokers.find(o=>o.id===j.id);if(previous)j.power=previous.power;}
 const after=allCards(s),removed=before.filter(c=>!after.some(o=>o.id===c.id)),added=after.filter(c=>!before.some(o=>o.id===c.id));destroyedCards(s,removed);addedCards(s,added.length);
 s.handSizePenalty+=oldSize-s.handSize;
 const definition=consumableById[kind];if(definition.family==='tarot')s.tarotsUsed++;
 if(definition.family==='planet'){if(!s.planetsUsed.includes(kind))s.planetsUsed.push(kind);for(const j of owned(s,'constellation'))j.power=(j.power??1)+.1;}
 for(const j of s.jokers)if(!beforeJokers.some(o=>o.id===j.id)){const initialized=makeJoker(s,j.kind);j.power??=initialized.power;j.counter??=0;j.rank??=initialized.rank;j.suit??=initialized.suit;j.handKey??=initialized.handKey;j.baseCost=initialized.baseCost;}
 recalculate(s);if(s.phase==='playing'){applyBoss(s);forceSelection(s);}note(s,result.message);return s;
}
function applyTag(s:RunState,tag:string){
 if(tag==='double_tag'){s.tags.push(tag);return;}
 const copies=1+s.tags.filter(t=>t==='double_tag').length;s.tags=s.tags.filter(t=>t!=='double_tag');
 for(let i=0;i<copies;i++){
  const packs:Record<string,PackOffer['kind']>={standard_tag:'standard',charm_tag:'arcana',meteor_tag:'celestial',buffoon_tag:'buffoon',ethereal_tag:'spectral'};
  if(packs[tag]){
   if(s.pack){s.tags.push(tag);continue;}openPack(s,{id:uid(s,'tag-pack'),kind:packs[tag],size:tag==='ethereal_tag'?'normal':'mega',free:true},'blind_select');
  }else if(tag==='boss_tag'){rollBoss(s);}
  else if(tag==='handy_tag')s.money+=s.totalHands;
  else if(tag==='garbage_tag')s.money+=s.unusedDiscards;
  else if(tag==='speed_tag')s.money+=5*s.skipped;
  else if(tag==='economy_tag')s.money+=Math.max(0,Math.min(40,s.money));
  else if(tag==='orbital_tag')s.handLevels[s.orbitalHand]+=3;
  else if(tag==='juggle_tag')s.juggle+=3;
  else if(tag==='top_up_tag'){for(let n=0;n<2&&s.jokers.length<jokerCapacity(s);n++){const j=randomJoker(s,'common',false);if(j){delete j.edition;s.jokers.push(j);}}}
  else s.tags.push(tag);
 }
 note(s,'获得 '+(tagNames[tag]??tag));
}
function mutate(s:RunState,a:RunAction){
 if(a.type==='select_blind'){selectBlind(s);return;}
 if(a.type==='skip_blind'){
  requirePhase(s,'blind_select');if(s.blindIndex===2)fail('Boss 盲注不能跳过');const tag=s.blindTags[s.blindIndex];s.blindIndex++;s.skipped++;applyTag(s,tag);return;
 }
 if(a.type==='select_cards'){
  requirePhase(s,'playing','pack');const max=s.phase==='pack'?3:5;const ids=cardIds(s,a.cardIds,0,max);
  if(s.phase==='playing'&&s.forcedCardId&&!ids.includes(s.forcedCardId))fail('天青之铃强制选择的牌不能取消');s.selected=ids;return;
 }
 if(a.type==='clear_selection'){requirePhase(s,'playing','pack');s.selected=[];forceSelection(s);return;}
 if(a.type==='sort_hand'){requirePhase(s,'playing','pack');s.hand.sort(a.by==='suit'?(a,b)=>suits.indexOf(a.suit)-suits.indexOf(b.suit)||b.rank-a.rank:(a,b)=>b.rank-a.rank||suits.indexOf(a.suit)-suits.indexOf(b.suit));return;}
 if(a.type==='reorder_hand'){requirePhase(s,'playing','pack');const ids=cardIds(s,a.cardIds,s.hand.length,s.hand.length);s.hand=ids.map(id=>s.hand.find(c=>c.id===id)!);return;}
 if(a.type==='reorder_jokers'){
  if(!['playing','shop','pack','blind_select','cash_out'].includes(s.phase))fail('当前不能排序');const ids=a.jokerIds;if(!Array.isArray(ids)||ids.length!==s.jokers.length||new Set(ids).size!==ids.length||ids.some(id=>!s.jokers.some(j=>j.id===id)))fail('小丑顺序无效');s.jokers=(ids as string[]).map(id=>s.jokers.find(j=>j.id===id)!);return;
 }
 if(a.type==='play'){requirePhase(s,'playing');handlePlay(s,cardIds(s,a.cardIds??s.selected,1,5));return;}
 if(a.type==='discard'){requirePhase(s,'playing');if(s.discards<=0)fail('没有剩余弃牌次数');const ids=cardIds(s,a.cardIds??s.selected,1,5);if(s.forcedCardId&&!ids.includes(s.forcedCardId))fail('必须包含天青之铃选中的牌');const cards=s.hand.filter(c=>ids.includes(c.id));onDiscard(s,cards,evaluateRun(s,cards).key);s.discards--;s.forcedCardId=null;draw(s);note(s,'弃掉 '+cards.length+' 张牌');return;}
 if(a.type==='cash_out'){
  requirePhase(s,'cash_out');s.money+=s.cashout.filter(l=>!l.label.includes('已入账')).reduce((n,l)=>n+l.amount,0);
  if(s.blindIndex===2){if(s.ante===8&&!s.won){s.phase='won';s.won=true;note(s,'Ante 8 通关！');return;}s.ante++;s.blindIndex=0;s.voucherOffers=[];s.playedIds=[];rollAnte(s);}else s.blindIndex++;
  enterShop(s);return;
 }
 if(a.type==='continue_endless'){requirePhase(s,'won');s.ante=9;s.blindIndex=0;s.voucherOffers=[];s.playedIds=[];rollAnte(s);enterShop(s);return;}
 if(a.type==='next_round'){
  requirePhase(s,'shop');for(const {source:j} of abilities(s))if(j.kind==='perkeo'&&s.consumables.length){const c=pick(s,s.consumables);addConsumable(s,c.kind,true);}
  s.phase='blind_select';s.offers=[];s.packs=[];s.selected=[];for(const c of allCards(s)){c.debuffed=false;c.faceDown=false;}
  // Delayed free-pack tags are opened one at a time, preserving each selection.
  const tag=s.tags.find(t=>['standard_tag','charm_tag','meteor_tag','buffoon_tag','ethereal_tag'].includes(t));if(tag){s.tags.splice(s.tags.indexOf(tag),1);applyTag(s,tag);}recalculate(s);return;
 }
 if(a.type==='buy'){
  requirePhase(s,'shop');const offer=s.offers.find(o=>o.id===a.offerId);if(!offer)fail('商品不存在或已售出');
  if(offer.type==='joker'&&s.jokers.length>=jokerCapacity(s)+Number(offer.joker?.edition==='negative'))fail('小丑槽位已满');
  if(offer.type==='consumable'&&s.consumables.length>=consumableCapacity(s))fail('消耗品槽位已满');pay(s,shopPrice(s,offer));
  if(offer.joker){s.jokers.push(offer.joker);if(s.blindIndex===2&&offer.joker.kind==='chicot')s.bossDisabled=true;}else if(offer.card){s.drawPile.push(offer.card);addedCards(s,1);}else addConsumable(s,offer.kind!);
  s.offers=s.offers.filter(o=>o!==offer);recalculate(s);note(s,'购买成功');return;
 }
 if(a.type==='reroll'){
  requirePhase(s,'shop');pay(s,rerollPrice(s));if(s.freeRerolls>0)s.freeRerolls--;else s.rerolls++;s.offers=[];fillOffers(s);applyPendingEditions(s);for(const j of owned(s,'flash_card'))j.power=(j.power??0)+2;note(s,'商店已刷新');return;
 }
 if(a.type==='redeem_voucher'){
  requirePhase(s,'shop');const id=String(a.voucherId);if(!s.voucherOffers.includes(id)||!voucherDefs[id])fail('优惠券不可兑换');pay(s,shopPrice(s,id));s.vouchers.push(id);s.voucherOffers=s.voucherOffers.filter(v=>v!==id);
  if(id==='hieroglyph'||id==='petroglyph')s.ante=Math.max(0,s.ante-1);recalculate(s);if(id==='overstock'||id==='overstock_plus')fillOffers(s);note(s,'优惠券已兑换');return;
 }
 if(a.type==='reroll_boss'){
  requirePhase(s,'blind_select','shop');if(!v(s,'director_s_cut')&&!v(s,'retcon'))fail('需要导演剪辑版优惠券');if(s.bossRerolled&&!v(s,'retcon'))fail('本底注已重抽过 Boss');pay(s,10);rollBoss(s);s.bossRerolled=true;note(s,'Boss 已重抽');return;
 }
 if(a.type==='open_pack'){requirePhase(s,'shop');const offer=s.packs.find(p=>p.id===a.offerId);if(!offer)fail('卡包不存在或已售出');openPack(s,offer);return;}
 if(a.type==='pick_pack'){
  requirePhase(s,'pack');const option=s.pack!.options.find(o=>o.id===a.optionId);if(!option)fail('候选不存在');
  if(option.joker){if(s.jokers.length>=jokerCapacity(s)+Number(option.joker.edition==='negative'))fail('小丑槽位已满');s.jokers.push(option.joker);}
  else if(option.card){s.drawPile.push(option.card);addedCards(s,1);}
  else consume(s,option.kind!,undefined,a.cardIds===undefined?undefined:cardIds(s,a.cardIds,0,3));
  s.pack!.options=s.pack!.options.filter(o=>o.id!==option.id);s.pack!.remaining--;if(s.pack!.remaining<=0||!s.pack!.options.length)closePack(s);recalculate(s);return;
 }
 if(a.type==='skip_pack'){requirePhase(s,'pack');for(const j of owned(s,'red_card'))j.power=(j.power??0)+3;closePack(s);note(s,'已跳过剩余卡包内容');return;}
 if(a.type==='use_consumable'){
  requirePhase(s,'playing','shop','pack','blind_select');const c=s.consumables.find(c=>c.id===a.consumableId);if(!c)fail('消耗牌不存在');consume(s,c.kind,c.id,a.cardIds===undefined?undefined:cardIds(s,a.cardIds,0,3));return;
 }
 if(a.type==='sell_consumable'){
  requirePhase(s,'playing','shop','pack','blind_select');const c=s.consumables.find(c=>c.id===a.consumableId);if(!c)fail('消耗牌不存在');s.money+=Math.max(1,Math.floor((consumableById[c.kind].price+(c.edition==='negative'?5:0))/2))+(c.sellBonus??0);s.consumables=s.consumables.filter(o=>o!==c);onSold(s);note(s,'消耗牌已出售');return;
 }
 if(a.type==='sell_joker'){
  requirePhase(s,'playing','shop','pack','blind_select');const j=s.jokers.find(j=>j.id===a.jokerId);if(!j)fail('小丑牌不存在');if(j.eternal)fail('永恒小丑无法出售');
  s.money+=sellValue(j);s.jokers=s.jokers.filter(o=>o!==j);
  if(living(j)){if(j.kind==='diet_cola')s.tags.push('double_tag');if(j.kind==='luchador'&&s.phase==='playing'&&s.blindIndex===2)s.bossDisabled=true;if(j.kind==='invisible_joker'&&(j.counter??0)>=2&&s.jokers.length){const copy={...pick(s,s.jokers),id:uid(s,'joker')};if(copy.edition==='negative')delete copy.edition;s.jokers.push(copy);}}
  if(s.phase==='playing'&&s.blindIndex===2&&s.boss==='verdant_leaf')s.bossDisabled=true;onSold(s);recalculate(s);if(s.phase==='playing')applyBoss(s);note(s,'小丑牌已出售');return;
 }
 fail('未知操作：'+a.type);
}
export function dispatchRun(input:RunState,action:RunAction):RunResult{
 if(!action||typeof action.type!=='string')return {ok:false,state:input,error:'INVALID_ACTION',message:'操作格式无效'};
 try{
  if(action.type==='new_run'){
   if(action.seed!==undefined&&typeof action.seed!=='string')fail('种子必须是字符串');const state=createRun({seed:action.seed as string|undefined,deck:action.deck as string|undefined,stake:action.stake as number|undefined});state.revision=input.revision+1;return {ok:true,state};
  }
  const state=structuredClone(input);mutate(state,action);state.revision++;state.lastError=null;return {ok:true,state};
 }catch(e){return {ok:false,state:input,error:'INVALID_ACTION',message:e instanceof Error?e.message:String(e)};}
}
export function snapshot(s:RunState){return structuredClone({...s,apiVersion:'game/1',isDemo:false,limits:{jokers:jokerCapacity(s),consumables:consumableCapacity(s)},legalActions:legalActions(s)});}
export function legalActions(s:RunState){
 const phases:Record<RunState['phase'],string[]>={setup:['new_run'],blind_select:['select_blind','skip_blind','use_consumable','sell_joker','sell_consumable','reroll_boss'],playing:['select_cards','clear_selection','play','discard','sort_hand','reorder_hand','reorder_jokers','use_consumable','sell_joker','sell_consumable'],cash_out:['cash_out','reorder_jokers'],shop:['buy','redeem_voucher','reroll','open_pack','next_round','use_consumable','sell_joker','sell_consumable','reroll_boss','reorder_jokers'],pack:['pick_pack','skip_pack','select_cards','sort_hand','reorder_hand','reorder_jokers','use_consumable','sell_joker','sell_consumable'],won:['continue_endless','new_run'],lost:['new_run']};return phases[s.phase].filter(a=>!(a==='skip_blind'&&s.blindIndex===2));
}
