import baseCSS from './sdk-base.css?inline';
import editionCSS from './editions.css?inline';
import modifierCSS from './modifiers.css?inline';
import packagingCSS from './packaging.css?inline';
import gameCSS from './game.css?inline';
import {createGame,type GameOptions,type GamePort,type ActionResult} from './run-api';
import {acquireFont} from './sdk-font';
import {createGameAudio,type AudioOptions} from './game-audio';
import type {PackKind} from './packaging';
import {catalogSearchIndex,normalizeCatalogQuery} from './catalog-search';
const escape=(text:unknown)=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const fmt=(n:number)=>Number.isFinite(n)?n>=1e10?n.toExponential(2):n.toLocaleString('en-US',{maximumFractionDigits:2}):'∞';
import {createBackground} from './background';
import {bindEditionRenderer} from './edition-renderer';
import {packFace as renderPackFace,bindSurfaceLight} from './packaging';
import {assetFor,HANDS,suitName,type Card} from './scoring';
import {consumableById,familyNames} from './consumables';
import {evaluateRun,blindId,blindTarget,shopPrice,rerollPrice,sellValue,jokerCapacity,consumableCapacity,allCards,type RunAction} from './run-engine';
import {jokerDefs,voucherDefs,content,deckInfo,stakes,stakeDescriptions,voucherInfo,blindInfo,tagNames} from './run-content';
import type {Offer,PackOffer} from './run-types';
const mounted=new WeakSet<HTMLElement>();
export interface MountOptions extends GameOptions,AudioOptions {
 assetBaseUrl?:string;
 speed?:number;
 reducedMotion?:boolean;
}
export interface ViewOptions extends AudioOptions {speed?:number;reducedMotion?:boolean}
export interface MountedGame extends GamePort {
 dispatch(action:RunAction):Promise<ActionResult>;
 showMenu():void;
 showCollection():void;
 setOptions(options:ViewOptions):void;
 destroy():void;
}

/** Mount only the game window. The caller owns navigation, persistence and strategy UI. */
export function mountBalatro(container:HTMLElement,options:MountOptions={}):MountedGame{
 if(mounted.has(container))throw new Error('此容器已有游戏实例，请先销毁');
 if(container.ownerDocument!==document)throw new Error('请在目标容器所在的页面调用 mountBalatro');
 const A=new URL(options.assetBaseUrl??(import.meta.env.DEV?'../assets/':'./assets/'),import.meta.url).href.replace(/\/?$/,'/');
 const game=createGame({...options,startInMenu:options.startInMenu??options.state===undefined});
 let state=game.getState(),busy=false,active:string|null=null,scale=1,speed=options.speed??1,
  reduced=options.reducedMotion??matchMedia('(prefers-reduced-motion: reduce)').matches;
 let selectedDeck=state.deck,selectedStake=state.stake,modal:'deck'|'info'|null=null,catalogTab='jokers',query='',seedDraft='',
  scoreCards:Card[]=[],shownStep=-1,packAnimating=false,disposed=false,menuOpen=options.state!==undefined&&options.startInMenu===true;
 validateViewOptions(options);
 const lifecycle=new AbortController(),timers=new Map<ReturnType<typeof setTimeout>,()=>void>();
 const audio=createGameAudio(options);
 const element=document.createElement('div');element.className='balatro-sdk-host';
 element.style.cssText='all:initial;display:block;width:100%;min-width:0;';
 const root=element.attachShadow({mode:'open'});
 const $=<T extends HTMLElement=HTMLElement>(q:string)=>root.querySelector<T>(q)!;
 const font=acquireFont(A);
 const style=document.createElement('style');style.textContent=[baseCSS,editionCSS,modifierCSS,packagingCSS,gameCSS].join('\n').replaceAll('VT323',font.family);
 root.append(style);
 const wrapper=document.createElement('div');wrapper.className='g-stage-wrap';
 wrapper.style.setProperty('--g-back-art',`url("${A}back-red.png")`);
 wrapper.innerHTML=`<section class="g-stage" id="g-stage" tabindex="0" aria-label="小丑牌游戏"><canvas id="g-background"></canvas><div class="g-vignette"></div><div class="g-crt"></div><div id="g-content"></div><div id="g-effects" aria-hidden="true"></div><div class="g-toast" id="g-toast" role="status"></div></section>`;
 root.append(wrapper);container.append(element);mounted.add(container);
 const stage=$('#g-stage'),layer=$('#g-content'),bg=createBackground($('#g-background'));
 const editions=bindEditionRenderer(stage,()=>reduced),light=bindSurfaceLight(stage,()=>reduced);
 const resize=new ResizeObserver(()=>{if(disposed)return;scale=wrapper.clientWidth/1280;stage.style.transform=`scale(${scale})`;});resize.observe(wrapper);
 bg.setReduced(reduced);
 const packFace=(kind:PackKind)=>renderPackFace(kind,A+'packaging/');
 function delay(ms:number){return new Promise<void>(resolve=>{const id=setTimeout(()=>{timers.delete(id);resolve();},ms);timers.set(id,resolve);});}
function image(file:string){return `<img class="pixel-art" crossorigin="anonymous" src="${A}${file}" alt="" draggable="false"/>`;}
function face(file:string,edition='',extra=''){
 const art=new URL(file,A).href;
 return `<div class="card-surface ${edition}" style="--art:url('${art}')">${image(file)}<div class="edition-overlay"></div><div class="edition-glint"></div>${extra}</div>`;
}
function playing(c:Card){
 if(c.faceDown)return face('back-red.png');
 const seal=c.seal?`<div class="modifier-seal" data-seal="${c.seal}">${image('seal-'+c.seal+'.png')}</div>`:'';
 return `<div class="modifier-print enhancement-${c.enhancement??'none'} modifier-version-${c.edition??'none'} ${c.debuffed?'g-debuffed':''}">${face(assetFor(c),c.edition??'',`<div class="modifier-enhancement"></div>${seal}`)}${c.debuffed?'<span class="g-debuff-mark">失效</span>':''}</div>`;
}
const tip=(name:string,description:string,extra='')=>`<span class="g-tip"><strong>${escape(name)}</strong><span>${escape(description)}</span>${extra}</span>`;
function cardTip(c:Card){return c.faceDown?'背面朝上的牌':`${suitName[c.suit]} ${c.rank===14?'A':c.rank===13?'K':c.rank===12?'Q':c.rank===11?'J':c.rank}${c.enhancement?' · '+({bonus:'奖励',mult:'倍率',wild:'万能',glass:'玻璃',steel:'钢铁',stone:'石头',gold:'黄金',lucky:'幸运'}[c.enhancement]):''}${c.edition?' · '+({foil:'闪箔',holographic:'镭射',polychrome:'多彩'}[c.edition]):''}${c.seal?' · '+({red:'红封',blue:'蓝封',gold:'金封',purple:'紫封'}[c.seal]):''}${c.bonusChips?' · 额外筹码 +'+c.bonusChips:''}`;}
const button=(text:string,type:string,extra='',disabled=false,color='orange')=>`<button class="game-button ${color}" data-action="${type}" ${extra} ${disabled?'disabled':''}>${text}</button>`;
function hud(){
 const id=blindId(state),info=blindInfo[id],ev=evaluateRun(state,state.hand.filter(c=>state.selected.includes(c.id))),step=busy?state.scoreSteps[shownStep]:undefined;
 return `<aside class="g-hud"><div class="g-blind-title ${state.blindIndex===2?'boss':''}"><span class="g-chip">✦</span><div>${escape(info[0])}<small>${state.bossDisabled&&state.blindIndex===2?'能力已禁用':state.phase==='shop'?'SHOP':state.phase==='blind_select'?'SELECT BLIND':'ROUND '+state.round}</small></div></div><div class="g-goal"><span>得分要求至少</span><strong>${fmt(state.phase==='playing'||busy||state.phase==='cash_out'?state.target:blindTarget(state))}</strong><small>${state.blindIndex===2?escape(info[1]):'奖励 '+('$'.repeat(state.blindIndex===0&&state.stake>=1?0:state.blindIndex===0?3:4)||'无')}</small></div><div class="g-round-score"><span>本回合<br/>得分</span><b>${fmt(state.total)}</b></div><div class="g-hand-label">${busy?escape(state.lastHand?HANDS[state.lastHand].name:'计分中'):state.phase==='shop'?'商店':escape(ev.name)}<small>${state.lastHand&&busy?'等级 '+state.handLevels[state.lastHand]:ev.scoring.length?'等级 '+ev.level:'筹码 × 倍率'}</small></div><div class="g-equation"><b class="blue-number">${fmt(step?.chips??ev.chips)}</b><i>×</i><b class="red-number">${fmt(step?.mult??ev.mult)}</b></div><div class="g-counters"><div>出牌<b class="blue-number">${state.hands}</b></div><div>弃牌<b class="red-number">${state.discards}</b></div></div><div class="g-money">$${fmt(state.money)}</div><div class="g-counters small"><div>底注<b>${state.ante}<small> / 8</small></b></div><div>回合<b>${state.round}</b></div></div><div class="g-deck-label"><span style="background:${deckInfo[state.deck][2]}"></span>${deckInfo[state.deck][0]}<small>${stakes[state.stake]}注</small></div><div class="g-hud-actions"><button class="g-hud-info" id="g-run-info" ${busy?'disabled':''}>本局信息</button><button class="g-hud-info g-collection-button" id="g-collection" ${busy?'disabled':''}>图鉴 ↗</button></div></aside>`;
}
function inventory(){
 const jokers=state.jokers.map((j,i)=>{const def=jokerDefs[j.kind];return `<div class="g-joker g-card ${j.disabled||j.perishable===0?'g-disabled':''} ${state.blindIndex===2&&state.boss==='amber_acorn'&&state.phase==='playing'&&!state.bossDisabled?'g-hidden-joker':''}" tabindex="0" role="button" aria-label="${escape(def?.zh??j.kind)}" data-joker="${j.id}" style="--n:${i};--count:${Math.max(state.jokers.length,5)}"><div class="card-inner">${face(`jokers/${j.kind}.png`,j.edition??'')}</div><span class="g-stickers">${j.eternal?'<b>∞</b>':''}${j.perishable!==undefined?`<b>${j.perishable}</b>`:''}${j.rental?'<b>$3</b>':''}</span>${tip(def?.zh??j.kind,def?.description??'',`<em>${j.power!==undefined&&j.power!==0?'当前 '+Number(j.power.toFixed(3)):''}${j.counter?' · 计数 '+j.counter:''}</em><span class="g-card-controls"><button data-sell-joker="${j.id}" ${j.eternal?'disabled':''}>${j.eternal?'永恒':`出售 $${sellValue(j)}`}</button><button data-move="${i}" data-direction="-1">←</button><button data-move="${i}" data-direction="1">→</button></span>`)}</div>`;}).join('');
 const consumables=state.consumables.map((c,i)=>{const d=consumableById[c.kind],chosen=active===c.id;return `<div class="g-consumable g-card ${chosen?'active':''}" data-consumable="${c.id}" role="button" tabindex="0" aria-label="${d.name}" style="--n:${i};--count:${Math.max(2,state.consumables.length)}"><div class="card-inner">${face(d.file,c.edition??'')}</div>${tip(d.name,d.description)}${chosen?`<div class="g-consumable-actions"><button data-use="${c.id}" ${busy?'disabled':''}>使用</button><button data-sell-consumable="${c.id}">出售</button></div>`:''}</div>`;}).join('');
 return `<section class="g-joker-row"><label>小丑牌 <b>${state.jokers.length} / ${jokerCapacity(state)}</b></label><div>${jokers||'<span class="g-empty">从商店找到你的第一张小丑牌</span>'}</div></section><section class="g-consumable-row"><label>消耗品 <b>${state.consumables.length} / ${consumableCapacity(state)}</b></label><div>${consumables||'<span class="g-empty">塔罗 · 星球 · 幻灵</span>'}</div></section>`;
}
function hand(){
 if(state.phase!=='playing'&&!(state.phase==='pack'&&state.pack?.temporaryHand)&&!busy)return '';
 const cards=busy?state.hand.filter(c=>!scoreCards.some(p=>p.id===c.id)):state.hand;
 return `<div class="g-hand" id="g-hand">${cards.map((c,i)=>`<button class="g-hand-card g-card ${state.selected.includes(c.id)?'selected':''}" data-card="${c.id}" style="--n:${i};--count:${cards.length};--angle:${(i-(cards.length-1)/2)*1.4}deg" aria-label="${cardTip(c)}" aria-pressed="${state.selected.includes(c.id)}" ${busy?'disabled':''}><div class="card-inner">${playing(c)}</div>${tip(cardTip(c),'点击选择 · 拖动调整左右顺序')}</button>`).join('')}</div><div class="g-hand-bottom"><span>${cards.length} / ${state.handSize} 手牌</span><div><button data-sort="rank">按点数</button><button data-sort="suit">按花色</button></div><button id="g-show-deck">牌组 ${allCards(state).length} ↗</button></div>${state.phase==='playing'&&!busy?`<div class="g-play-controls">${button('出牌','play','',!state.selected.length||state.hands<=0,'blue')}<span>已选 ${state.selected.length} / 5</span>${button('弃牌','discard','',!state.selected.length||state.discards<=0,'red')}</div>`:''}`;
}
function blindSelect(){return `<div class="g-select-heading"><small>ANTE ${state.ante}</small><h1>选择你的下一场盲注</h1><p>击败盲注，进入商店，构筑下一次更高的分数。</p></div><div class="g-blind-options">${[0,1,2].map(index=>{const id=blindId(state,index),info=blindInfo[id],past=index<state.blindIndex,locked=index>state.blindIndex;return `<article class="g-blind-option ${index===2?'boss':''} ${past?'past':''} ${locked?'locked':''}"><div class="g-blind-medallion">${index===2?'♜':index===1?'◆':'●'}</div><h2>${info[0]}</h2><strong>${fmt(blindTarget(state,index))}</strong><p>${info[1]}</p>${past?'<span class="g-passed">已完成 / 跳过</span>':button('选择','select_blind',`data-index="${index}"`,locked,'orange')}${index<2&&!past?`<button class="g-skip" data-skip="${index}" ${locked?'disabled':''}>跳过 · ${tagNames[state.blindTags[index]]??''}</button>`:''}</article>`;}).join('')}</div>${state.vouchers.includes('director_s_cut')||state.vouchers.includes('retcon')?`<div class="g-boss-reroll">${button('重抽 Boss · $10','reroll_boss','',false,'green')}</div>`:''}<div class="g-tags">${state.tags.map(t=>`<span>${tagNames[t]}</span>`).join('')}</div>`;}
function voucher(id:string,buttonEnabled=false){const info=voucherInfo[id];return `<div class="g-voucher g-card" style="--voucher-color:hsl(${content.vouchers.findIndex(v=>v.id===id)*41%360} 30% 45%)"><div class="g-voucher-ticket"><small>VOUCHER</small><span>✦</span><strong>${info[0]}</strong><small>${voucherDefs[id].tier===2?'UPGRADE':'PERMANENT'}</small></div>${tip(info[0],info[1])}${buttonEnabled?`<button data-voucher="${id}">兑换 $${shopPrice(state,id)}</button>`:''}</div>`;}
function offerMarkup(o:Offer,pack=false){
 const name=o.joker?jokerDefs[o.joker.kind].zh:o.card?cardTip(o.card):consumableById[o.kind!].name;
 const description=o.joker?jokerDefs[o.joker.kind].description:o.card?'将此牌永久加入牌组。':consumableById[o.kind!].description;
 const art=o.joker?face(`jokers/${o.joker.kind}.png`,o.joker.edition??''):o.card?playing(o.card):face(consumableById[o.kind!].file);
 return `<article class="g-offer g-card" data-offer="${o.id}"><div class="g-offer-art card-inner">${art}</div><strong>${escape(name)}</strong><small>${o.joker?jokerDefs[o.joker.kind].rarity+(o.joker.eternal?' · 永恒':'')+(o.joker.perishable!==undefined?' · 易腐':'')+(o.joker.rental?' · 租用':''):o.card?'扑克牌':familyNames[consumableById[o.kind!].family]}</small>${tip(name,description)}<button ${pack?`data-pick="${o.id}"`:`data-buy="${o.id}"`}>${pack?'选择':`购买 $${shopPrice(state,o)}`}</button></article>`;
}
function packMarkup(p:PackOffer){return `<button class="g-pack-offer" data-pack="${p.id}"><span class="g-pack-art">${packFace(p.kind)}</span><strong>${p.size==='mega'?'超级 ':p.size==='jumbo'?'巨型 ':''}${{arcana:'幻术包',celestial:'天体包',spectral:'幻灵包',standard:'标准包',buffoon:'丑角包'}[p.kind]}</strong><b>$${shopPrice(state,p)}</b></button>`;}
function shop(){return `<div class="g-shop"><div class="g-section-title"><h1>商 店</h1><span>为下一场盲注准备你的构筑</span></div><div class="g-shop-main"><div class="g-offers">${state.offers.map(o=>offerMarkup(o)).join('')||'<p class="g-shop-empty">商品已售出 · 可以刷新</p>'}</div><div class="g-vouchers"><label>本底注优惠券</label><div>${state.voucherOffers.map(id=>voucher(id,true)).join('')||'<span>已兑换</span>'}</div></div></div><div class="g-shop-packs">${state.packs.map(packMarkup).join('')||'<span class="g-empty">补充包已售出</span>'}</div><div class="g-shop-controls">${button('刷新 · $'+rerollPrice(state),'reroll','',false,'green')}${button('下一回合 →','next_round','',false,'orange')}</div></div>`;}
function pack(){const p=state.pack!;return `<div class="g-pack-open"><div class="g-section-title"><h1>${p.size==='mega'?'超级 ':p.size==='jumbo'?'巨型 ':''}${{arcana:'幻术包',celestial:'天体包',spectral:'幻灵包',standard:'标准包',buffoon:'丑角包'}[p.kind]}</h1><span>还可选择 <b>${p.remaining}</b> 张${p.temporaryHand?' · 目标牌在下方选择':''}</span></div><div class="g-pack-options">${p.options.map(o=>offerMarkup(o,true)).join('')}</div><div class="g-pack-controls">${button('跳过剩余','skip_pack','',false,'red')}<span>${p.kind==='buffoon'?'小丑直接加入你的阵容':p.kind==='standard'?'扑克牌永久加入牌组':'选中的消耗牌立即生效'}</span></div></div>`;}
function cashout(){const pending=state.cashout.filter(l=>!l.label.includes('已入账')).reduce((n,l)=>n+l.amount,0);return `<div class="g-receipt"><small>ROUND COMPLETE</small><h1>盲注已击败</h1><strong class="g-receipt-score">${fmt(state.total)}</strong><div class="g-receipt-lines">${state.cashout.map(l=>`<div><span>${l.label}</span><b>${l.amount<0?'−':'+'}$${Math.abs(l.amount)}</b></div>`).join('')}</div>${button('领取 $'+pending+' →','cash_out','',false,'orange')}<p>${state.blindIndex===2&&state.ante===8?'领取奖励后完成本局':'进入商店，继续你的构筑'}</p></div>`;}
function end(){return `<div class="g-end"><span>${state.phase==='won'?'✦':'♠'}</span><small>${state.phase==='won'?'RUN WON':'GAME OVER'}</small><h1>${state.phase==='won'?'漂亮，通关了！':'下局再来一手'}</h1><p>${state.phase==='won'?'你击败了 Ante 8 的终局 Boss。':'这次的构筑没能追上盲注。'}</p><div><span>最高单手<b>${fmt(state.bestHand)}</b></span><span>完成回合<b>${state.elapsedRounds}</b></span><span>底注<b>${state.ante}</b></span></div>${state.phase==='won'?button('继续无尽模式','continue_endless','',false,'green'):''}<button class="game-button orange" id="g-end-new">新的一局</button><small>SEED ${escape(state.seed)}</small></div>`;}
function setup(){return `<div class="g-setup"><div class="g-setup-intro"><small>ONE MORE HAND</small><h1>每一手，都能<br/>改写这一局。</h1><p>用扑克组成牌型，用小丑打破规则。<br/>所有牌组与难度直接开放。</p><div class="g-setup-cards">${face('jokers/joker.png')}${face('jokers/blueprint.png','polychrome')}${face('card-H-A.png')}</div></div><div class="g-setup-options"><div class="g-section-title"><h2>新的一局</h2><span>全部解锁</span></div><label>选择牌组</label><div class="g-deck-picker">${content.decks.map(d=>`<button data-deck="${d.id}" class="${selectedDeck===d.id?'selected':''}" style="--deck-color:${deckInfo[d.id][2]}" title="${deckInfo[d.id][1]}"><i></i>${deckInfo[d.id][0]}</button>`).join('')}</div><p class="g-deck-effect">${deckInfo[selectedDeck][1]}</p><div class="g-setup-fields"><label>注码难度<select id="g-stake">${stakes.map((s,i)=>`<option value="${i}" ${selectedStake===i?'selected':''}>${s}注${i?' · 累加前序效果':''}</option>`).join('')}</select></label><label>种子<input id="g-seed" maxlength="32" placeholder="留空随机生成" value="${escape(seedDraft)}"/></label></div><p class="g-stake-note">${stakeDescriptions[selectedStake]}</p><div class="g-setup-buttons"><button class="game-button orange" id="g-start">开始游戏</button>${state.phase!=='setup'?'<button class="game-button green" id="g-resume">继续当前局</button>':''}<button class="game-button blue" id="g-collection">图鉴 ↗</button></div><small>没有局外解锁与成长 · 存档由接入平台管理</small></div></div>`;}
function infoModal(){return `<div class="g-modal-backdrop"><section class="g-modal ${modal==='info'?'g-catalog-modal':''}" role="dialog" aria-modal="true" aria-labelledby="g-modal-title"><div class="g-section-title"><h2 id="g-modal-title">${modal==='deck'?'本局牌组':'图鉴与本局信息'}</h2><button id="g-close-modal">关闭 ×</button></div>${modal==='deck'?`<p>${deckInfo[state.deck][0]} · ${allCards(state).length} 张 · 抽牌堆 ${state.drawPile.length}</p><div class="g-deck-grid">${allCards(state).sort((a,b)=>suitsOrder(a)-suitsOrder(b)).map(c=>`<div class="g-mini-card" title="${cardTip(c)}">${playing({...c,faceDown:false})}</div>`).join('')}</div>`:`<div class="g-modal-tabs"><button data-catalog="jokers">小丑 150</button><button data-catalog="consumables">消耗品 52</button><button data-catalog="vouchers">优惠券 32</button><button data-catalog="hands">本局牌型</button></div>${catalogTab==='hands'?`<div class="g-hand-levels">${Object.entries(HANDS).map(([key,h])=>`<div><strong>${h.name}</strong><span>等级 ${state.handLevels[key as keyof typeof HANDS]}</span><b>${h.chips+(state.handLevels[key as keyof typeof HANDS]-1)*h.chipStep} × ${h.mult+(state.handLevels[key as keyof typeof HANDS]-1)*h.multStep}</b><small>打出 ${state.handCounts[key as keyof typeof HANDS]} 次</small></div>`).join('')}</div><p>种子 ${escape(state.seed)} · 本局已兑换 ${state.vouchers.length} 张优惠券 · 随机算法为本复刻自用，不兼容原版同种子结果。</p>`:`<input id="g-search" aria-label="搜索图鉴" placeholder="搜索名称、效果、拼音或首字母" value="${escape(query)}"/><div class="g-catalog-grid">${catalogRows().map(r=>`<article data-search="${escape(catalogSearchIndex(r.name,r.en,r.description))}"><div>${r.art}</div><section><strong>${escape(r.name)}</strong><small>${escape(r.en)}</small><p>${escape(r.description)}</p></section></article>`).join('')}</div><p class="g-catalog-empty" id="g-catalog-empty" role="status" hidden>没有匹配的卡牌，试试其他名称或效果。</p>`}`}</section></div>`;}
const suitsOrder=(c:Card)=>['S','H','C','D'].indexOf(c.suit)*100+14-c.rank;
function catalogRows(){return catalogTab==='jokers'?content.jokers.map(j=>({name:j.zh,en:j.name,description:j.description,art:face('jokers/'+j.id+'.png')})):catalogTab==='consumables'?Object.values(consumableById).map(c=>({name:c.name,en:c.en,description:c.description,art:face(c.file)})):content.vouchers.map(v=>({name:voucherInfo[v.id][0],en:v.name,description:voucherInfo[v.id][1],art:voucher(v.id)}));}
// Filter existing cards so typing keeps the input, selection and animated surfaces alive.
function filterCatalog(){
 const needle=normalizeCatalogQuery(query);let matches=0;
 layer.querySelectorAll<HTMLElement>('.g-catalog-grid>article').forEach(row=>{
  const hidden=!(row.dataset.search??'').includes(needle);
  if(row.hidden!==hidden)row.hidden=hidden;
  if(!hidden)matches++;
 });
 const empty=$('#g-catalog-empty');if(empty)empty.hidden=matches!==0;
}
function render(){
 if(disposed)return;
 bg.setShop(state.phase==='shop'||state.phase==='pack');
 layer.innerHTML=(menuOpen||state.phase==='setup'?setup():hud()+inventory()+(busy&&!packAnimating?`<div class="g-scoring"><div class="g-played">${scoreCards.map(c=>`<div class="g-played-card" data-played="${c.id}">${playing({...c,faceDown:false})}</div>`).join('')}</div><div class="g-score-tape" id="g-score-tape">正在计分…</div></div>`:state.phase==='blind_select'?blindSelect():state.phase==='playing'?`<div class="g-table-center"><small>${blindInfo[blindId(state)][0]}</small><h1>${state.lastScore?fmt(state.lastScore):'准备出牌'}</h1><p>${state.lastScore?'上一手得分':'选择至多 5 张牌，打出你的组合'}</p>${state.lastEffect?`<span>${escape(state.lastEffect)}</span>`:''}</div>`:state.phase==='shop'?shop():state.phase==='pack'?pack():state.phase==='cash_out'?cashout():end())+hand())+(modal?infoModal():'');
 stage.classList.toggle('g-reduced',reduced);stage.dataset.phase=busy?'scoring':state.phase;bind();
}
function toast(text:string){const el=$('#g-toast');el.textContent=text;el.classList.add('visible');void delay(2600).then(()=>{if(!disposed)el.classList.remove('visible');});}
function sound(index=0){audio.effect(index);}
async function dispatch(action:RunAction){
 if(disposed)return {ok:false,revision:state.revision,error:'DESTROYED',message:'游戏实例已销毁'};
 if(busy)return {ok:false,revision:state.revision,error:'BUSY',message:'正在播放动画'};
 const previous=state,result=game.dispatch(action);if(!result.ok){toast(result.message??'操作失败');return {ok:false,revision:state.revision,error:result.error,message:result.message};}
 state=game.getState();menuOpen=false;active=state.consumables.some(c=>c.id===active)?active:null;modal=null;$('#g-toast').classList.remove('visible');
 if(action.type==='play'&&action.animate!==false&&speed!==0&&!reduced){
  const ids=Array.isArray(action.cardIds)?action.cardIds as string[]:previous.selected;scoreCards=previous.hand.filter(c=>ids.includes(c.id));busy=true;shownStep=-1;render();
  for(let i=0;i<state.scoreSteps.length;i++){if(disposed)break;shownStep=i;const step=state.scoreSteps[i];$('#g-score-tape').innerHTML=`<small>${i+1} / ${state.scoreSteps.length}</small><strong>${escape(step.detail)}</strong><b>${fmt(step.chips)} <i>×</i> ${fmt(step.mult)}</b>`;const target=step.target?stage.querySelector<HTMLElement>(`[data-played="${step.target}"],[data-joker="${step.target}"]`):null;target?.animate([{transform:'scale(1)'},{transform:'scale(1.12) rotate(-2deg)'},{transform:'scale(1)'}],{duration:speed?220/speed:0});sound(i);await delay(speed?Math.max(15,170/speed):0);}
  busy=false;scoreCards=[];shownStep=-1;
 }
 if(disposed)return result;
 render();
 if(action.type==='open_pack'&&action.animate!==false&&speed!==0&&!reduced){
  busy=true;packAnimating=true;stage.classList.add('g-opening');$('#g-effects').innerHTML=`<div class="pack-unseal">${packFace(state.pack!.kind)}<div class="pack-burst"></div></div>`;
  const duration=650/speed;$('#g-effects').querySelectorAll<HTMLElement>('*').forEach(el=>{if(getComputedStyle(el).animationName!=='none')el.style.animationDuration=duration+'ms';});
  sound(2);await delay(duration);if(disposed)return result;$('#g-effects').innerHTML='';stage.classList.remove('g-opening');busy=false;packAnimating=false;render();
  layer.querySelector('.g-pack-options')?.animate([{opacity:0,transform:'translateY(35px)'},{opacity:1,transform:'translateY(0)'}],{duration:speed?300/speed:0});
 }
 return result;
}
function bind(){
 layer.querySelectorAll<HTMLElement>('[data-action]').forEach(b=>b.onclick=()=>void dispatch({type:b.dataset.action!}));
 layer.querySelectorAll<HTMLElement>('[data-skip]').forEach(b=>b.onclick=()=>void dispatch({type:'skip_blind'}));
 layer.querySelectorAll<HTMLElement>('[data-buy]').forEach(b=>b.onclick=()=>void dispatch({type:'buy',offerId:b.dataset.buy}));
 layer.querySelectorAll<HTMLElement>('[data-pack]').forEach(b=>b.onclick=()=>void dispatch({type:'open_pack',offerId:b.dataset.pack}));
 layer.querySelectorAll<HTMLElement>('[data-pick]').forEach(b=>b.onclick=()=>void dispatch({type:'pick_pack',optionId:b.dataset.pick}));
 layer.querySelectorAll<HTMLElement>('[data-voucher]').forEach(b=>b.onclick=()=>void dispatch({type:'redeem_voucher',voucherId:b.dataset.voucher}));
 layer.querySelectorAll<HTMLElement>('[data-use]').forEach(b=>b.onclick=e=>{e.stopPropagation();void dispatch({type:'use_consumable',consumableId:b.dataset.use});});
 layer.querySelectorAll<HTMLElement>('[data-sell-consumable]').forEach(b=>b.onclick=e=>{e.stopPropagation();void dispatch({type:'sell_consumable',consumableId:b.dataset.sellConsumable});});
 layer.querySelectorAll<HTMLElement>('[data-sell-joker]').forEach(b=>b.onclick=e=>{e.stopPropagation();void dispatch({type:'sell_joker',jokerId:b.dataset.sellJoker});});
 layer.querySelectorAll<HTMLElement>('[data-consumable]').forEach(b=>{b.onclick=()=>{if(busy)return;active=active===b.dataset.consumable?null:b.dataset.consumable!;render();};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}};});
 layer.querySelectorAll<HTMLElement>('[data-sort]').forEach(b=>b.onclick=()=>void dispatch({type:'sort_hand',by:b.dataset.sort}));
 layer.querySelectorAll<HTMLElement>('[data-move]').forEach(b=>b.onclick=e=>{e.stopPropagation();const ids=state.jokers.map(j=>j.id),from=Number(b.dataset.move),to=Math.max(0,Math.min(ids.length-1,from+Number(b.dataset.direction)));const [id]=ids.splice(from,1);ids.splice(to,0,id);void dispatch({type:'reorder_jokers',jokerIds:ids});});
 layer.querySelectorAll<HTMLElement>('[data-deck]').forEach(b=>b.onclick=()=>{selectedDeck=b.dataset.deck!;render();});
 const stake=$<HTMLSelectElement>('#g-stake');if(stake)stake.onchange=()=>{selectedStake=Number(stake.value);render();};
 const seed=$<HTMLInputElement>('#g-seed');if(seed)seed.oninput=()=>{seedDraft=seed.value;};
 const start=$('#g-start');if(start)start.onclick=()=>{const seed=$<HTMLInputElement>('#g-seed').value.trim()||Math.random().toString(36).slice(2,10).toUpperCase();void dispatch({type:'new_run',deck:selectedDeck,stake:selectedStake,seed});};
 const resume=$('#g-resume');if(resume)resume.onclick=()=>{menuOpen=false;render();};
 const collection=$('#g-collection');if(collection)collection.onclick=showCollection;
 for(const id of ['g-run-info','g-show-deck']){const b=$('#'+id);if(b)b.onclick=()=>{if(busy)return;modal=id==='g-show-deck'?'deck':'info';if(modal==='info')catalogTab='hands';render();$('#g-close-modal').focus({preventScroll:true});};}
 const close=$('#g-close-modal');if(close)close.onclick=closeModal;
 const endNew=$('#g-end-new');if(endNew)endNew.onclick=showSetup;
 layer.querySelectorAll<HTMLElement>('[data-catalog]').forEach(b=>b.onclick=()=>{catalogTab=b.dataset.catalog!;query='';render();});
 const search=$<HTMLInputElement>('#g-search');
 if(search){
  let composing=false;
  const update=()=>{query=search.value;filterCatalog();};
  search.addEventListener('compositionstart',()=>{composing=true;});
  search.addEventListener('compositionend',()=>{composing=false;update();});
  search.oninput=e=>{if(!composing&&!(e as InputEvent).isComposing)update();};
  filterCatalog();
 }
 for(const el of layer.querySelectorAll<HTMLElement>('[data-card],[data-joker]'))bindDrag(el);
}
function bindDrag(el:HTMLElement){
 let down=false,startX=0,startY=0,dragged=false;
 el.onpointerdown=e=>{if(e.button!==0||busy||(e.target as HTMLElement).closest('.g-tip,button:not(.g-hand-card)'))return;down=true;startX=e.clientX;startY=e.clientY;dragged=false;el.setPointerCapture(e.pointerId);};
 el.onpointermove=e=>{if(!down)return;const dx=(e.clientX-startX)/scale,dy=(e.clientY-startY)/scale;if(Math.hypot(dx,dy)>8){dragged=true;el.style.translate=`${dx}px ${dy}px`;el.classList.add('dragging');}};
 el.onpointerup=e=>{
  if(!down)return;down=false;el.style.translate='';el.classList.remove('dragging');
  const key=el.dataset.card?'card':'joker',id=el.dataset.card??el.dataset.joker!;
  if(dragged){const list=key==='card'?state.hand:state.jokers,ids=list.map(c=>c.id),from=ids.indexOf(id),dx=(e.clientX-startX)/scale,step=key==='card'?Math.min(98,700/Math.max(1,list.length)):Math.min(112,590/Math.max(1,list.length));ids.splice(from,1);ids.splice(Math.max(0,Math.min(ids.length,from+Math.round(dx/step))),0,id);void dispatch(key==='card'?{type:'reorder_hand',cardIds:ids}:{type:'reorder_jokers',jokerIds:ids});}
  else if(key==='card'){const ids=state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id];void dispatch({type:'select_cards',cardIds:ids});}
 };
 el.onpointercancel=()=>{down=false;el.style.translate='';el.classList.remove('dragging');};
 if(el.dataset.card)el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const id=el.dataset.card!;void dispatch({type:'select_cards',cardIds:state.selected.includes(id)?state.selected.filter(x=>x!==id):[...state.selected,id]});}};
}
function showSetup(){if(busy||disposed)return;menuOpen=true;modal=null;render();}
function showCollection(){if(busy||disposed)return;modal='info';catalogTab='jokers';query='';render();$('#g-close-modal').focus({preventScroll:true});}
function closeModal(){modal=null;render();stage.focus({preventScroll:true});}
function setOptions(next:ViewOptions){
 if(disposed)throw new Error('游戏实例已销毁');validateViewOptions(next);
 if(next.speed!==undefined)speed=next.speed;
 if(next.reducedMotion!==undefined){reduced=next.reducedMotion;bg.setReduced(reduced);}
 audio.setOptions(next);
 if(next.speed!==undefined||next.reducedMotion!==undefined)render();
}
stage.addEventListener('pointerdown',()=>audio.unlock(),{capture:true,signal:lifecycle.signal});
stage.addEventListener('keydown',()=>audio.unlock(),{capture:true,signal:lifecycle.signal});
stage.addEventListener('pointerdown',e=>{if(!(e.target as Element).closest('input,select,textarea,button,[tabindex]'))stage.focus({preventScroll:true});},{signal:lifecycle.signal});
stage.oncontextmenu=e=>{e.preventDefault();if(!busy&&!modal&&!menuOpen)void dispatch({type:'clear_selection'});};
stage.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.isComposing||e.keyCode===229||busy||disposed)return;
 if(e.key==='Escape'&&modal){e.preventDefault();closeModal();return;}
 if(modal||menuOpen||(e.target as HTMLElement).matches('input,select,textarea'))return;
 if(e.key==='Enter'&&!(e.target as HTMLElement).closest('button,[role=button]')&&state.phase==='playing'&&state.selected.length){e.preventDefault();void dispatch({type:'play'});}
 else if(e.key.toLowerCase()==='d'&&state.phase==='playing'&&state.selected.length){e.preventDefault();void dispatch({type:'discard'});}
},{signal:lifecycle.signal});
try{render();}catch(error){destroy();throw error;}
function destroy(){
 if(disposed)return;disposed=true;busy=false;lifecycle.abort();resize.disconnect();
 timers.forEach((resolve,id)=>{clearTimeout(id);resolve();});timers.clear();
 stage.getAnimations({subtree:true}).forEach(animation=>animation.cancel());
 editions.destroy();light.destroy();bg.destroy();font.release();audio.destroy();
 layer.replaceChildren();wrapper.replaceChildren();root.replaceChildren();element.remove();mounted.delete(container);
}
return {
 getState:()=>{const current=game.getState();return {...current,busy,legalActions:busy?[]:current.legalActions};},dispatch,
 showMenu:showSetup,showCollection,setOptions,
 destroy,
};
}

function validateViewOptions(options:ViewOptions){
 if(options.speed!==undefined&&(!Number.isFinite(options.speed)||options.speed<0||options.speed>16))throw new Error('speed 应在 0–16 之间');
 if(options.musicVolume!==undefined&&(!Number.isFinite(options.musicVolume)||options.musicVolume<0||options.musicVolume>1))throw new Error('musicVolume 应在 0–1 之间');
}
