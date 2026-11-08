import {random,pick,shuffle,uid,jokerCapacity,consumableCapacity,addConsumable} from './consumable-engine';
import type {Joker} from './consumable-engine';
import {HANDS,type Card,type HandKey,type Suit} from './scoring';
import {consumableCatalog} from './consumables';
import {content,jokerDefs} from './run-content';
import {suits,type RunState,type JokerAbility} from './run-types';
export const canonical=(kind:string)=>kind==='sly'?'sly_joker':kind==='half'?'half_joker':kind;
export const living=(j:Joker)=>!j.disabled&&(j.perishable===undefined||j.perishable>0);
export const has=(s:RunState,kind:string)=>s.jokers.some(j=>canonical(j.kind)===kind&&living(j));
export const count=(s:RunState,kind:string)=>s.jokers.filter(j=>canonical(j.kind)===kind&&living(j)).length;
export const allCards=(s:RunState)=>[...s.hand,...s.drawPile,...s.discardPile,...s.playedPile];
export const isFace=(s:RunState,c:Card)=>c.enhancement!=='stone'&&(has(s,'pareidolia')||(c.rank>=11&&c.rank<=13));
export const suitMatches=(s:RunState,c:Card,suit:Suit)=>c.enhancement!=='stone'&&((c.enhancement==='wild'&&!c.debuffed)||c.suit===suit||(has(s,'smeared_joker')&&(('HD'.includes(c.suit)&&'HD'.includes(suit))||('SC'.includes(c.suit)&&'SC'.includes(suit)))));
export function probability(s:RunState,n:number){return random(s)<Math.min(1,(2**count(s,'oops_all_6s'))/n);}
export function abilities(s:RunState):JokerAbility[]{
 const resolve=(j:Joker,seen:Set<string>):Joker|undefined=>{
  if(!living(j)||seen.has(j.id))return;seen.add(j.id);const kind=canonical(j.kind);
  if(kind==='blueprint'||kind==='brainstorm'){
   const target=kind==='blueprint'?s.jokers[s.jokers.indexOf(j)+1]:s.jokers[0];
   const source=target?resolve(target,seen):undefined;
   return source&&!content.copy_fully_incompatible_jokers.includes(canonical(source.kind))?source:undefined;
  }return j;
 };
 return s.jokers.flatMap(owner=>{const source=resolve(owner,new Set());return source?[{owner,source}]:[];});
}
export const owned=(s:RunState,kind:string)=>s.jokers.filter(j=>canonical(j.kind)===kind&&living(j));
export const sellValue=(j:Joker)=>(j.rental?1:Math.max(1,Math.floor(((jokerDefs[canonical(j.kind)]?.cost??2)+({foil:2,holographic:3,polychrome:5,negative:5}[j.edition??'foil']??0)*(j.edition?1:0))/2)))+(j.sellBonus??0);
export function makeJoker(s:RunState,kind:string):Joker{
 const multiplier=['joker_stencil','steel_joker','constellation','madness','hologram','lucky_cat','glass_joker','campfire','obelisk','hit_the_road','canio','yorick','throwback','vampire'];
 const power=kind==='ice_cream'?100:kind==='popcorn'?20:kind==='ramen'?2:kind==='turtle_bean'?5:kind==='seltzer'?10:kind==='rocket'?1:multiplier.includes(kind)?1:0;
 return {id:uid(s,'joker'),kind,power,counter:0,baseCost:jokerDefs[kind]?.cost??2,rank:2+Math.floor(random(s)*13),suit:pick(s,suits),handKey:pick(s,Object.keys(HANDS) as HandKey[])};
}
export function refreshPools(s:RunState){
 const cards=allCards(s);s.allowDuplicates=has(s,'showman');s.probabilityMultiplier=2**count(s,'oops_all_6s');
 const enabled=(id:string)=>id!=='cavendish'||s.grosMichelDestroyed;
 const conditional=(id:string)=>id==='steel_joker'?cards.some(c=>c.enhancement==='steel'):id==='glass_joker'?cards.some(c=>c.enhancement==='glass'):id==='stone_joker'?cards.some(c=>c.enhancement==='stone'):id==='golden_ticket'?cards.some(c=>c.enhancement==='gold'):id==='lucky_cat'?cards.some(c=>c.enhancement==='lucky'):true;
 s.jokerPools=Object.fromEntries(['Common','Uncommon','Rare','Legendary'].map(r=>[r.toLowerCase(),content.jokers.filter(j=>j.rarity===r&&enabled(j.id)&&conditional(j.id)).map(j=>j.id)])) as NonNullable<RunState['jokerPools']>;
}
export function randomJoker(s:RunState,rarity?:string,stickers=true){
 refreshPools(s);const roll=random(s),r=rarity??(roll<.7?'common':roll<.95?'uncommon':'rare');
 const pool=s.jokerPools![r as keyof NonNullable<RunState['jokerPools']>].filter(k=>s.allowDuplicates||!s.jokers.some(j=>canonical(j.kind)===k));
 if(!pool.length)return undefined;const j=makeJoker(s,pick(s,pool));
 const edition=random(s),foil=s.vouchers.includes('glow_up')?.08:s.vouchers.includes('hone')?.04:.02,holo=foil*.7,poly=foil===.08?.021:foil===.04?.009:.003;
 if(edition<.003)j.edition='negative';else if(edition<.003+poly)j.edition='polychrome';else if(edition<.003+poly+holo)j.edition='holographic';else if(edition<.003+poly+holo+foil)j.edition='foil';
 if(stickers){const sticker=random(s);if(s.stake>=3&&sticker<.3&&!content.eternal_incompatible_jokers.includes(j.kind))j.eternal=true;else if(s.stake>=6&&sticker>=.3&&sticker<.6&&!content.perishable_incompatible_jokers.includes(j.kind))j.perishable=5;if(s.stake>=7&&random(s)<.3)j.rental=true;}
 return j;
}
export function generate(s:RunState,family:'tarot'|'planet'|'spectral'){
 const choices=consumableCatalog.filter(c=>c.family===family&&c.id!=='soul'&&c.id!=='black_hole'&&(!c.hidden||s.unlockedHands.includes(c.handKey!))&&(has(s,'showman')||!s.consumables.some(o=>o.kind===c.id)));
 return choices.length?addConsumable(s,pick(s,choices).id):false;
}
export function addedCards(s:RunState,amount:number){for(const j of owned(s,'hologram'))j.power=(j.power??1)+.25*amount;}
export function destroyedCards(s:RunState,cards:Card[]){
 for(const j of owned(s,'canio'))j.power=(j.power??1)+cards.filter(c=>isFace(s,c)).length;
 for(const j of owned(s,'glass_joker'))j.power=(j.power??1)+.75*cards.filter(c=>c.enhancement==='glass').length;
}
export function destroyCards(s:RunState,cards:Card[]){
 destroyedCards(s,cards);const ids=new Set(cards.map(c=>c.id));
 for(const zone of ['hand','drawPile','discardPile','playedPile'] as const)s[zone]=s[zone].filter(c=>!ids.has(c.id));s.selected=s.selected.filter(id=>!ids.has(id));
}
export function recalculate(s:RunState){
 const v=(id:string)=>Number(s.vouchers.includes(id));
 s.jokerSlots=5+Number(s.deck==='black_deck')-Number(s.deck==='painted_deck')+v('antimatter');
 s.consumableSlots=2-Number(s.deck==='nebula_deck')+v('crystal_ball');
 s.handSize=Math.max(1,8+2*Number(s.deck==='painted_deck')+v('paint_brush')+v('palette')+count(s,'juggler')+2*count(s,'troubadour')-count(s,'merry_andy')-2*count(s,'stuntman')+owned(s,'turtle_bean').reduce((n,j)=>n+(j.power??5),0)-s.handSizePenalty+s.juggle-Number(s.phase==='playing'&&s.boss==='the_manacle'&&s.blindIndex===2&&!s.bossDisabled));
 refreshPools(s);
}
export function onBlind(s:RunState){
 for(const {owner,source:j} of abilities(s)){
  const kind=canonical(j.kind);
  if(kind==='burglar'){s.hands+=3;s.discards=0;}
  if(kind==='cartomancer')generate(s,'tarot');
  if(kind==='certificate'){const c:Card={id:uid(s,'card'),rank:2+Math.floor(random(s)*13),suit:pick(s,suits),seal:pick(s,['red','blue','gold','purple'] as const)};s.hand.push(c);addedCards(s,1);}
  if(kind==='marble_joker'){s.drawPile.push({id:uid(s,'card'),rank:2+Math.floor(random(s)*13),suit:pick(s,suits),enhancement:'stone'});addedCards(s,1);}
  if(kind==='riff_raff')for(let i=0;i<2&&s.jokers.length<jokerCapacity(s);i++){const next=randomJoker(s,'common',false);if(next){delete next.edition;s.jokers.push(next);}}
  if(kind==='ceremonial_dagger'&&owner===j){const target=s.jokers[s.jokers.indexOf(j)+1];if(target&&!target.eternal){j.power=(j.power??0)+2*sellValue(target);s.jokers=s.jokers.filter(o=>o!==target);}}
  if(kind==='madness'&&owner===j&&s.blindIndex<2){j.power=(j.power??1)+.5;const targets=s.jokers.filter(o=>o!==j&&!o.eternal);if(targets.length){const target=pick(s,targets);s.jokers=s.jokers.filter(o=>o!==target);}}
 }
 recalculate(s);shuffle(s,s.drawPile);
}
export function onDiscard(s:RunState,cards:Card[],hand:HandKey){
 const first=s.discardsUsed===0;
 for(const {owner,source:j} of abilities(s)){
  const k=canonical(j.kind);
  if(k==='burnt_joker'&&first)s.handLevels[hand]++;
  if(k==='faceless_joker'&&cards.filter(c=>isFace(s,c)).length>=3)s.money+=5;
  if(k==='mail_in_rebate')s.money+=5*cards.filter(c=>c.rank===j.rank&&c.enhancement!=='stone').length;
  if(owner!==j)continue;
  if(k==='green_joker')j.power=Math.max(0,(j.power??0)-1);
  if(k==='ramen')j.power=Math.max(1,(j.power??2)-.01*cards.length);
  if(k==='castle')j.power=(j.power??0)+3*cards.filter(c=>suitMatches(s,c,j.suit??'S')).length;
  if(k==='hit_the_road')j.power=(j.power??1)+.5*cards.filter(c=>c.rank===11&&c.enhancement!=='stone').length;
  if(k==='yorick'){j.counter=(j.counter??0)+cards.length;while(j.counter>=23){j.counter-=23;j.power=(j.power??1)+1;}}
 }
 if(first&&cards.length===1&&has(s,'trading_card')){destroyCards(s,cards);s.money+=3;}
 else{for(const c of cards)if(c.seal==='purple'&&!c.debuffed)generate(s,'tarot');const ids=new Set(cards.map(c=>c.id));s.hand=s.hand.filter(c=>!ids.has(c.id));s.discardPile.push(...cards);}
 s.discardsUsed++;s.cardsDiscarded+=cards.length;s.selected=[];s.jokers=s.jokers.filter(j=>j.kind!=='ramen'||(j.power??2)>1||j.eternal);
}
export function onSold(s:RunState){for(const j of owned(s,'campfire'))j.power=(j.power??1)+.25;}
export function newRoundTargets(s:RunState){
 const cards=allCards(s).filter(c=>c.enhancement!=='stone');
 for(const j of s.jokers){
  if(['mail_in_rebate','ancient_joker','castle','the_idol'].includes(j.kind)){const c=cards.length?pick(s,cards):{rank:14,suit:'S' as Suit};j.rank=c.rank;j.suit=j.kind==='ancient_joker'?pick(s,suits):c.suit;}
  if(j.kind==='to_do_list')j.handKey=pick(s,Object.keys(HANDS).filter(k=>s.unlockedHands.includes(k as HandKey)) as HandKey[]);
  if(j.kind==='hit_the_road')j.power=1;
 }
}
export {random,pick,shuffle,uid,jokerCapacity,consumableCapacity,addConsumable};
