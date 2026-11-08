import {HANDS,evaluate,cardChips,type Card,type HandKey,type Evaluation} from './scoring';
import type {ScoreStep} from './consumable-engine';
import {abilities,owned,has,count,allCards,isFace,suitMatches,probability,canonical,sellValue,generate,addedCards,destroyCards,random,uid} from './run-jokers';
import {jokerDefs} from './run-content';
import {suits,type RunState} from './run-types';

export function evaluateRun(s:RunState,cards:Card[]):Evaluation{
 if(!cards.length)return evaluate(cards,s.handLevels);
 const valid=cards.filter(c=>c.enhancement!=='stone'),groups=new Map<number,Card[]>();
 for(const c of valid)groups.set(c.rank,[...(groups.get(c.rank)??[]),c]);
 const ordered=[...groups.values()].sort((a,b)=>b.length-a.length||b[0].rank-a[0].rank),goal=has(s,'four_fingers')?4:5;
 const flushes=suits.map(suit=>valid.filter(c=>suitMatches(s,c,suit))).filter(a=>a.length>=goal);
 const flush=flushes.sort((a,b)=>b.reduce((n,c)=>n+c.rank,0)-a.reduce((n,c)=>n+c.rank,0))[0];
 const ranks=[...groups.keys()].sort((a,b)=>b-a),gap=has(s,'shortcut')?2:1;
 let straightRanks:number[]=[];
 for(const options of [ranks,ranks.includes(14)?[...ranks.filter(n=>n!==14),1]:ranks]){
  for(let i=0;i<options.length;i++){
   const chain=[options[i]];for(let j=i+1;j<options.length;j++){if(chain.at(-1)!-options[j]<=gap)chain.push(options[j]);else break;}
   if(chain.length>=goal&&chain.length>straightRanks.length)straightRanks=chain;
  }
 }
 const straight=straightRanks.length>=goal,straightCards=straightRanks.map(rank=>valid.find(c=>c.rank===(rank===1?14:rank))!).filter(Boolean);
 const n=ordered[0]?.length??0,house=n===3&&ordered[1]?.length===2;
 let key:HandKey='high',scoring=ordered.length?ordered.reduce((a,b)=>a[0].rank>b[0].rank?a:b).slice(0,1):[];
 if(flush&&n===5){key='flush_five';scoring=valid;}
 else if(flush&&house){key='flush_house';scoring=valid;}
 else if(n===5){key='five';scoring=valid;}
 else if(flush&&straight){key='straight_flush';scoring=valid.filter(c=>flush.includes(c)||straightCards.includes(c));}
 else if(n===4){key='four';scoring=ordered[0];}
 else if(house){key='full_house';scoring=valid;}
 else if(flush){key='flush';scoring=flush;}
 else if(straight){key='straight';scoring=straightCards;}
 else if(n===3){key='three';scoring=ordered[0];}
 else if(n===2&&ordered[1]?.length===2){key='two_pair';scoring=[...ordered[0],...ordered[1]];}
 else if(n===2){key='pair';scoring=ordered[0];}
 const h=HANDS[key],level=Math.max(1,s.handLevels[key]);
 const name=key==='straight_flush'&&valid.length===5&&groups.size===5&&valid.every(c=>c.rank>=10)?'皇家同花顺':h.name;
 return {key,name,level,chips:h.chips+(level-1)*h.chipStep,mult:h.mult+(level-1)*h.multStep,scoring:cards.filter(c=>scoring.includes(c)||c.enhancement==='stone'||has(s,'splash')).map(c=>c.id)};
}
export function scoreRun(s:RunState,cards:Card[]):{score:number;steps:ScoreStep[];evaluation:Evaluation}{
 let ev=evaluateRun(s,cards);const previous=s.roundHands[ev.key]??0,priorMost=Math.max(0,...Object.values(s.handCounts));
 const active=abilities(s),scoring=cards.filter(c=>ev.scoring.includes(c.id)),held=s.hand.filter(c=>!cards.includes(c));
 const faceCards=scoring.filter(c=>isFace(s,c)&&!c.debuffed),firstFace=faceCards[0];
 const ranks=cards.filter(c=>c.enhancement!=='stone').map(c=>c.rank),maxCount=Math.max(0,...ranks.map(r=>ranks.filter(n=>n===r).length));
 const pair=maxCount>=2,three=maxCount>=3,four=maxCount>=4,twoPair=[...new Set(ranks)].filter(r=>ranks.filter(n=>n===r).length>=2).length>=2;
 const straight=['straight','straight_flush'].includes(ev.key),flush=['flush','straight_flush','flush_house','flush_five'].includes(ev.key);
 const boss=s.blindIndex===2&&!s.bossDisabled?s.boss:'';
 let blocked=boss==='the_psychic'&&cards.length!==5||boss==='the_eye'&&previous>0||boss==='the_mouth'&&s.bossHand!==null&&s.bossHand!==ev.key;
 for(const {source:j} of active)if(j.kind==='space_joker'&&probability(s,4))s.handLevels[ev.key]++;
 if(boss==='the_arm')s.handLevels[ev.key]=Math.max(1,s.handLevels[ev.key]-1);
 if(boss==='the_ox'&&ev.key===s.bossRank)s.money=0;
 if(boss==='the_tooth')s.money-=cards.length;
 for(const j of s.jokers.filter(j=>!j.disabled&&(j.perishable===undefined||j.perishable>0))){
  const k=canonical(j.kind);
  if(k==='green_joker')j.power=(j.power??0)+1;
  if(k==='ride_the_bus')j.power=faceCards.length?0:(j.power??0)+1;
  if(k==='runner'&&straight)j.power=(j.power??0)+15;
  if(k==='square_joker'&&cards.length===4)j.power=(j.power??0)+4;
  if(k==='spare_trousers'&&twoPair)j.power=(j.power??0)+2;
  if(k==='obelisk')j.power=s.handCounts[ev.key]>=priorMost?1:(j.power??1)+.2;
  if(k==='midas_mask')for(const c of scoring)if(isFace(s,c)&&!c.debuffed)c.enhancement='gold';
  if(k==='vampire')for(const c of scoring)if(c.enhancement&&!c.debuffed){j.power=(j.power??1)+.1;delete c.enhancement;}
 }
 // Enhancements can change during before-scoring abilities; the declared poker hand stays fixed.
 const hand=HANDS[ev.key],level=s.handLevels[ev.key];ev={...ev,level,chips:hand.chips+(level-1)*hand.chipStep,mult:hand.mult+(level-1)*hand.multStep};
 s.handsPlayed++;s.totalHands++;s.handCounts[ev.key]++;s.roundHands[ev.key]=previous+1;s.lastHand=ev.key;if(!s.unlockedHands.includes(ev.key))s.unlockedHands.push(ev.key);if(!s.bossHand)s.bossHand=ev.key;
 let chips=ev.chips,mult=ev.mult;const steps:ScoreStep[]=[];
 const step=(label:string,detail:string,target?:string,tone='neutral')=>steps.push({label,detail,chips,mult,...(target?{target}:{}),tone});
 const add=(amount:number,label:string,target?:string)=>{if(amount){chips+=amount;step(`+${amount}`,label,target,'blue-number');}};
 const plus=(amount:number,label:string,target?:string)=>{if(amount){mult+=amount;step(`+${amount}`,label,target,'red-number');}};
 const times=(amount:number,label:string,target?:string)=>{if(amount!==1){mult*=amount;step(`×${Number(amount.toFixed(4))}`,label,target,'poly-number');}};
 if(boss==='the_flint'){chips=Math.max(1,Math.round(chips/2));mult=Math.max(1,Math.round(mult/2));}
 step(ev.name,`等级 ${ev.level} · 基础 ${chips} × ${mult}`);
 if(blocked){chips=0;mult=0;ev={...ev,scoring:[]};step('无法计分','此手牌不符合 Boss 的出牌条件');for(const a of active)if(a.source.kind==='matador')s.money+=8;}
 else{
  for(const {source:j} of active){if(j.kind==='vagabond'&&s.money<=4)generate(s,'tarot');if(j.kind==='superposition'&&straight&&ranks.includes(14))generate(s,'tarot');if(j.kind==='s_ance'&&ev.key==='straight_flush')generate(s,'spectral');if(j.kind==='to_do_list'&&j.handKey===ev.key)s.money+=4;
   if(j.kind==='dna'&&s.handsPlayed===1&&cards.length===1){s.hand.push({...cards[0],id:uid(s,'card'),debuffed:false,faceDown:false});addedCards(s,1);}}
  for(const c of scoring){
   if(c.debuffed){step('失效','此牌不提供筹码或能力',c.id);continue;}
   let repeats=1+Number(c.seal==='red');
   for(const {source:j} of active){const k=canonical(j.kind);if(k==='hanging_chad'&&c===scoring[0])repeats+=2;if(k==='hack'&&c.enhancement!=='stone'&&c.rank>=2&&c.rank<=5)repeats++;if(k==='sock_and_buskin'&&isFace(s,c))repeats++;if(k==='dusk'&&s.hands===1)repeats++;if(k==='seltzer'&&(j.power??10)>0)repeats++;}
   for(let iteration=0;iteration<repeats;iteration++){
    add(cardChips(c),iteration?'重触发 · 逐牌筹码':'逐牌筹码',c.id);
    if(c.enhancement==='mult')plus(4,'倍率牌',c.id);
    if(c.enhancement==='glass')times(2,'玻璃牌',c.id);
    if(c.enhancement==='lucky'){
     let lucky=false;if(probability(s,5)){plus(20,'幸运牌',c.id);lucky=true;}if(probability(s,15)){s.money+=20;step('+$20','幸运牌',c.id);lucky=true;}
     if(lucky)for(const j of owned(s,'lucky_cat'))j.power=(j.power??1)+.25;
    }
    if(c.seal==='gold'){s.money+=3;step('+$3','金色蜡封',c.id);}
    if(c.edition==='foil')add(50,'闪箔',c.id);if(c.edition==='holographic')plus(10,'镭射',c.id);if(c.edition==='polychrome')times(1.5,'多彩',c.id);
    for(const {owner,source:j} of active){
     const k=canonical(j.kind),name=jokerDefs[k]?.zh??k,face=isFace(s,c),ranked=c.enhancement!=='stone';
     const suitBonus:Record<string,typeof suits[number]>={greedy_joker:'D',lusty_joker:'H',wrathful_joker:'S',gluttonous_joker:'C'};
     if(suitBonus[k]&&suitMatches(s,c,suitBonus[k]))plus(3,name,owner.id);
     if(k==='fibonacci'&&ranked&&[14,2,3,5,8].includes(c.rank))plus(8,name,owner.id);
     if(k==='scary_face'&&face)add(30,name,owner.id);
     if(k==='even_steven'&&ranked&&[2,4,6,8,10].includes(c.rank))plus(4,name,owner.id);
     if(k==='odd_todd'&&ranked&&[14,3,5,7,9].includes(c.rank))add(31,name,owner.id);
     if(k==='scholar'&&ranked&&c.rank===14){add(20,name,owner.id);plus(4,name,owner.id);}
     if(k==='business_card'&&face&&probability(s,2))s.money+=2;
     if(k==='8_ball'&&ranked&&c.rank===8&&probability(s,4))generate(s,'tarot');
     if(k==='hiker')c.bonusChips=(c.bonusChips??0)+5;
     if(k==='photograph'&&c===firstFace)times(2,name,owner.id);
     if(k==='triboulet'&&ranked&&[12,13].includes(c.rank))times(2,name,owner.id);
     if(k==='smiley_face'&&face)plus(5,name,owner.id);
     if(k==='walkie_talkie'&&ranked&&[4,10].includes(c.rank)){add(10,name,owner.id);plus(4,name,owner.id);}
     if(k==='golden_ticket'&&c.enhancement==='gold')s.money+=4;
     if(k==='rough_gem'&&suitMatches(s,c,'D'))s.money++;
     if(k==='bloodstone'&&suitMatches(s,c,'H')&&probability(s,2))times(1.5,name,owner.id);
     if(k==='arrowhead'&&suitMatches(s,c,'S'))add(50,name,owner.id);
     if(k==='onyx_agate'&&suitMatches(s,c,'C'))plus(7,name,owner.id);
     if(k==='ancient_joker'&&suitMatches(s,c,j.suit??'S'))times(1.5,name,owner.id);
     if(k==='the_idol'&&ranked&&c.rank===j.rank&&suitMatches(s,c,j.suit??'S'))times(2,name,owner.id);
     if(k==='wee_joker'&&ranked&&c.rank===2&&owner===j)j.power=(j.power??0)+8;
    }
   }
  }
  const rankedHeld=held.filter(c=>c.enhancement!=='stone'),lowest=rankedHeld.length?Math.min(...rankedHeld.map(c=>c.rank)):0;
  const fist=rankedHeld.filter(c=>c.rank===lowest).at(-1);
  for(const c of held){
   if(c.debuffed)continue;const repeats=1+Number(c.seal==='red')+active.filter(a=>a.source.kind==='mime').length;
   for(let i=0;i<repeats;i++){
    if(c.enhancement==='steel')times(1.5,'钢铁牌留手',c.id);
    for(const {owner,source:j} of active){if(j.kind==='baron'&&c.rank===13&&c.enhancement!=='stone')times(1.5,'男爵',owner.id);if(j.kind==='shoot_the_moon'&&c.rank===12&&c.enhancement!=='stone')plus(13,'射月',owner.id);if(j.kind==='reserved_parking'&&isFace(s,c)&&probability(s,2))s.money++;if(j.kind==='raised_fist'&&c===fist)plus(2*(c.rank===14?11:Math.min(10,c.rank)),'致胜之拳',owner.id);}
   }
  }
  // A four-suit match uses distinct cards; Wild cards cannot fill four slots alone.
  const fourSuits=(index:number,used:Set<string>):boolean=>index===4||scoring.some(c=>!used.has(c.id)&&suitMatches(s,c,suits[index])&&fourSuits(index+1,new Set([...used,c.id])));
  for(const owner of s.jokers){
   if(owner.disabled||(owner.perishable!==undefined&&owner.perishable<=0))continue;
   const source=active.find(a=>a.owner===owner)?.source,k=source?canonical(source.kind):'',name=jokerDefs[k]?.zh??k,j=source;
   if(owner.edition==='foil')add(50,'闪箔小丑',owner.id);if(owner.edition==='holographic')plus(10,'镭射小丑',owner.id);
   if(j){
    const chipsMap:Record<string,number>={sly_joker:pair?50:0,wily_joker:three?100:0,clever_joker:twoPair?80:0,devious_joker:straight?100:0,crafty_joker:flush?80:0,banner:s.discards*30,runner:j.power??0,ice_cream:j.power??100,blue_joker:s.drawPile.length*2,stone_joker:allCards(s).filter(c=>c.enhancement==='stone').length*25,bull:Math.max(0,s.money)*2,castle:j.power??0,wee_joker:j.power??0,square_joker:j.power??0,stuntman:250};
    const plusMap:Record<string,number>={joker:4,jolly_joker:pair?8:0,zany_joker:three?12:0,mad_joker:twoPair?10:0,crazy_joker:straight?12:0,droll_joker:flush?10:0,half_joker:cards.length<=3?20:0,mystic_summit:s.discards===0?15:0,ceremonial_dagger:j.power??0,abstract_joker:3*s.jokers.length,gros_michel:15,supernova:s.handCounts[ev.key],ride_the_bus:j.power??0,green_joker:j.power??0,red_card:j.power??0,fortune_teller:s.tarotsUsed,flash_card:j.power??0,popcorn:j.power??20,spare_trousers:j.power??0,erosion:Math.max(0,s.startingDeckSize-allCards(s).length)*4,swashbuckler:s.jokers.filter(o=>o!==j).reduce((n,o)=>n+sellValue(o),0),bootstraps:Math.max(0,Math.floor(s.money/5))*2};
    if(k in chipsMap)add(chipsMap[k],name,owner.id);if(k in plusMap)plus(plusMap[k],name,owner.id);if(k==='misprint')plus(Math.floor(random(s)*24),name,owner.id);
    let factor=1;
    if(['constellation','madness','hologram','obelisk','lucky_cat','campfire','hit_the_road','glass_joker','canio','yorick','vampire'].includes(k))factor=j.power??1;
    if(k==='joker_stencil')factor=Math.max(1,(s.jokerSlots??5)+s.jokers.filter(o=>o.edition==='negative').length-s.jokers.filter(o=>canonical(o.kind)!=='joker_stencil').length);
    if(k==='steel_joker')factor=1+.2*allCards(s).filter(c=>c.enhancement==='steel').length;
    if(k==='loyalty_card'&&((j.counter??0)+1)%6===0)factor=4;
    if(k==='blackboard'&&held.every(c=>suitMatches(s,c,'S')||suitMatches(s,c,'C')))factor=3;
    if(k==='cavendish')factor=3;if(k==='card_sharp'&&previous>0)factor=3;
    if(k==='ramen')factor=j.power??2;if(k==='acrobat'&&s.hands===1)factor=3;
    if(k==='throwback')factor=1+s.skipped*.25;
    if(k==='flower_pot'&&fourSuits(0,new Set()))factor=3;
    if(k==='seeing_double'&&scoring.some(c=>suitMatches(s,c,'C')&&scoring.some(other=>other!==c&&suits.some(suit=>suit!=='C'&&suitMatches(s,other,suit)))))factor=2;
    if(k==='driver_s_license'&&allCards(s).filter(c=>c.enhancement).length>=16)factor=3;
    if(k==='the_duo'&&pair)factor=2;if(k==='the_trio'&&three)factor=3;if(k==='the_family'&&four)factor=4;if(k==='the_order'&&straight)factor=3;if(k==='the_tribe'&&flush)factor=2;
    times(factor,name,owner.id);
    if(k==='matador'&&boss&&(boss==='the_ox'&&ev.key===s.bossRank||boss==='the_arm'||boss==='the_flint'||scoring.some(c=>c.debuffed)))s.money+=8;
   }
   if(owner.edition==='polychrome')times(1.5,'多彩小丑',owner.id);
   if(jokerDefs[canonical(owner.kind)]?.rarity==='Uncommon')for(const a of active)if(a.source.kind==='baseball_card')times(1.5,'棒球卡',a.owner.id);
  }
  if(s.vouchers.includes('observatory'))for(const c of s.consumables)if(c.kind===HANDS[ev.key].planet)times(1.5,'天文台');
  if(s.deck==='plasma_deck'){chips=mult=(chips+mult)/2;step('平衡','等离子：筹码与倍率取平均');}
 }
 for(const j of s.jokers){if(j.disabled)continue;if(j.kind==='loyalty_card')j.counter=(j.counter??0)+1;if(j.kind==='ice_cream')j.power=Math.max(0,(j.power??100)-5);if(j.kind==='seltzer')j.power=(j.power??10)-1;}
 s.jokers=s.jokers.filter(j=>!['ice_cream','seltzer'].includes(j.kind)||(j.power??1)>0||j.eternal);
 if(s.handsPlayed===1&&cards.length===1&&cards[0].rank===6&&has(s,'sixth_sense')){destroyCards(s,cards);generate(s,'spectral');}
 const score=Math.max(0,Math.floor(chips*mult));return {score,steps,evaluation:ev};
}
