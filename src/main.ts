import './style.css';
import './editions.css';
import './materials.css';
import './modifiers.css';
import './packaging.css';
import './consumables.css';
import {consumableCatalog,consumableById,familyNames} from './consumables';
import {mountConsumableLab} from './consumable-lab';
import {initialRules,useConsumable,scoreHand,finishPlayedCards,finishRound,fillHand,discardCards,leaveShop,jokerCapacity,consumableCapacity,jokerSellValue,jokerFile,jokerNames,pool,pick,packChoices,addConsumable,uid,type Joker,type ScoreStep} from './consumable-engine';
import { createBackground } from './background';
import { bindEditionRenderer } from './edition-renderer';
import { mountModifierLab } from './modifiers';
import { packFace, packKinds, bindSurfaceLight } from './packaging';
import jokerCatalog from './jokers.json';
import { evaluate as baseEvaluate, HANDS, assetFor, rankName, suitName, type Card } from './scoring';

type Scene = 'table'|'score'|'shop'|'materials';
type JokerKind = 'joker'|'sly'|'half'|'blueprint';
type Action = {type: string; [key: string]: unknown};
type Result = {ok: boolean; revision: number; error?: string};
const A = `${import.meta.env.BASE_URL}assets/`;
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const fmt = (n: number) => n.toLocaleString('en-US');
const jokerData: Record<JokerKind,{name:string;description:string;price:number}> = {
  joker:{name:'小丑',description:'每次计分提供 <em>+4</em> 倍率',price:2},
  sly:{name:'狡猾小丑',description:'打出的牌中包含对子时，获得 <b>+50</b> 筹码',price:3},
  half:{name:'半张小丑',description:'打出的牌不超过 3 张时，提供 <em>+20</em> 倍率',price:5},
  blueprint:{name:'蓝图',description:'复制右侧小丑牌的能力。复制能力已接入计分',price:10},
};
const state = {
  ...initialRules(),revision:0,scene:'table' as Scene,phase:'selecting',hands:4,discards:3,total:0,busy:false,
  chips:0,mult:0,scoreSteps:[] as ScoreStep[],scoreIndex:-1,
  offers:['blueprint','tarot','celestial','arcana','spectral'],offerConsumable:'star',rerollCost:5,
  pack:null as 'celestial'|'arcana'|'spectral'|null,packOptions:[] as string[],lastScore:0,
};
const prefs={speed:1,shake:true,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,sound:false};
const evaluate=(cards:Card[])=>baseEvaluate(cards,state.handLevels);
let activeConsumable:string|null=null;
let collectionReturn:Scene='table';
const handAvailable=()=>state.phase==='selecting'||(state.phase==='pack'&&state.pack!=='celestial');


let runId=0, scale=1, toastTimer=0, audio:AudioContext|undefined;
let selectedMaterial='joker-joker.png',edition='none';
let materialGroup:'jokers'|'other'|'modifiers'|'consumables'='jokers',catalogQuery='',catalogRarity='all',catalogPage=0;
const jokerAliases:Record<string,string>={'joker-joker.png':'jokers/joker.png','joker-sly.png':'jokers/sly_joker.png','joker-half.png':'jokers/half_joker.png','joker-blueprint.png':'jokers/blueprint.png'};
const materialFile=(file:string)=>jokerAliases[file]??file;
const legacyFile=(file:string)=>Object.keys(jokerAliases).find(key=>jokerAliases[key]===file)??file;
const rarityNames:Record<string,string>={Common:'普通',Uncommon:'罕见',Rare:'稀有',Legendary:'传奇'};
const localJokerNames:Record<string,string>={joker:'小丑',sly_joker:'狡猾小丑',half_joker:'半张小丑',blueprint:'蓝图',brainstorm:'头脑风暴',canio:'卡尼奥',triboulet:'特里布莱',yorick:'约里克',chicot:'奇科',perkeo:'佩尔科'};
const editionData=[
  {id:'none',name:'基础',en:'BASE',description:'原始纸面与像素色彩，保留卡图本身的明暗。'},
  {id:'foil',name:'闪箔',en:'FOIL',description:'+50 筹码。蓝紫金属底、同心环刻纹与十字反光随视角轻移。'},
  {id:'holographic',name:'镭射',en:'HOLOGRAPHIC',description:'+10 倍率。浅色三角镭射纹覆盖牌面，粉、青、紫光泽随视角变化。'},
  {id:'polychrome',name:'多彩',en:'POLYCHROME',description:'×1.5 倍率。原画油墨呈光谱色相变化，浅色纸面保留原有明度。'},
  {id:'negative',name:'负片',en:'NEGATIVE',description:'+1 对应槽位。深蓝负像纸面、浅色文字与亮色图案。用于小丑牌或特殊生成的消耗牌。'},
];
function materialEditions(){
  if(selectedMaterial.startsWith('card-'))return editionData.filter(e=>e.id!=='negative');
  if(selectedMaterial.startsWith('consumable-'))return editionData.filter(e=>e.id==='none'||e.id==='negative');
  if(jokerCatalog.some(j=>j.file===materialFile(selectedMaterial)))return editionData;
  return editionData.filter(e=>e.id==='none');
}
const sceneInfo: Record<Scene,{title:string;description:string;keys:string}> = {
  table:{title:'牌桌与选牌',description:'观察左侧信息层级、手牌弧线、悬停倾斜与选中抬升。拖动手牌或小丑可改变顺序。',keys:'左键选牌 · 拖动排序 · 右键取消全部 · 最多 5 张'},
  score:{title:'计分与反馈',description:'固定样例：两张 10 + 三张小丑，依次结算至 3,120。可调整速度、震屏与减少动态效果。',keys:'逐牌筹码 → 小丑从左到右 → 多彩倍率 → 总分落账'},
  shop:{title:'商店与开包',description:'体验悬停报价、购买反馈、递增刷新价格、卡包揭示与选择。支持消耗品购买、使用、出售及三类消耗牌开包。',keys:'天体包直接选择 · 幻术包与幻灵包按牌面要求选择目标'},
  materials:{title:'物料与材质',description:'150 张小丑牌、52 张消耗牌、65 张其他物料，以及 16 项卡牌修饰。增强、版本与蜡封分别展示，支持组合预览，另有五类像素卡包。',keys:'卡牌修饰 16：8 增强 + 4 版本 + 4 蜡封 · 基础版不计入 16 项'},
};

$('#app').innerHTML=`
<header class="lab-header"><a class="brand" href="#table"><span class="brand-mark">B<span>♦</span></span><div><strong>BALATRO <span>LOOKDEV</span></strong><small>界面 · 交互 · 物料确认</small></div></a><div class="header-meta"><a class="scene-tab" href="#play">游玩初版 ↗</a><span class="status-dot"></span>可交互样片 <span class="muted">/</span> 2026.11.07</div></header>
<main>
  <div class="lab-toolbar"><nav aria-label="样片切换">${(['table','score','shop','materials'] as Scene[]).map((s,i)=>`<button class="scene-tab" data-scene="${s}"><span>0${i+1}</span>${sceneInfo[s].title}</button>`).join('')}</nav><div class="view-settings"><label>速度 <select id="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label><button id="reduced-toggle" aria-pressed="${prefs.reduced}">减少动态</button><button id="audio-toggle" aria-pressed="false">音效 关</button><button id="zones-toggle" aria-pressed="false">布局标注</button></div></div>
  <div class="stage-wrap"><section class="stage" id="stage" aria-label="Balatro 交互样片">
    <canvas id="background" aria-hidden="true"></canvas><div class="vignette"></div>
    <div id="game-layer"></div><div id="effects" aria-hidden="true"></div><div id="tooltip" role="tooltip"></div><div id="toast" role="status"></div>
    <div class="crt" aria-hidden="true"></div><span class="sample-stamp">视觉交互样片 · 非完整游戏</span>
  </section></div>
  <section class="caption"><div><span class="eyebrow" id="caption-number">STUDY 01</span><h1 id="caption-title"></h1><p id="caption-description"></p></div><div class="caption-controls"><p id="caption-keys"></p><div><label class="range-label">CRT <input id="crt" type="range" min="0" max="100" value="35"/><span id="crt-value">35%</span></label><label class="check-label"><input id="shake" type="checkbox" checked/>计分震屏</label></div></div></section>
  <footer><span>小丑与消耗牌卡图：LocalThunk / Playstack，来源 Balatro Wiki；其他物料为自绘研究稿。此处为本地还原研究。</span><a href="./assets/THIRD-PARTY.md" target="_blank">物料来源 ↗</a></footer>
</main>`;

const stage=$('#stage'), layer=$('#game-layer'), effects=$('#effects');
const bg=createBackground($('#background'));
const surfaceLight=bindSurfaceLight(stage,()=>prefs.reduced);
bindEditionRenderer(stage,()=>prefs.reduced);
const applyScale=()=>{scale=$('.stage-wrap').clientWidth/1280;stage.style.transform=`scale(${scale})`;};
new ResizeObserver(applyScale).observe($('.stage-wrap'));applyScale();

function image(file: string, extra='') {return `<img class="pixel-art ${extra}" src="${A}${materialFile(file)}" alt="" draggable="false"/>`;}
function face(file:string,mod='',inner='',substrate='') {
  const pack=packKinds.find(kind=>file===`pack-${kind}.png`);
  if(pack)return packFace(pack);
  // CSS resolves a custom property's relative url() against the consuming stylesheet.
  // The production CSS lives in assets/, so the alpha mask needs a document-based absolute URL.
  const maskUrl=new URL(`${A}${materialFile(file)}`,document.baseURI).href;
  if(mod==='glass'){
    const key=materialFile(file).replace(/\.png$/,'').replaceAll('/','__');
    return `<div class="card-surface glass" style="--art:url('${maskUrl}')"><div class="glass-body"></div><div class="glass-bevel"></div>${image(`glass/${key}-ink.png`,'glass-ink')}${substrate}<div class="glass-reflection"></div><div class="glass-rim"></div>${inner}</div>`;
  }
  return `<div class="card-surface ${mod}" style="--art:url('${maskUrl}')">${image(file)}${substrate}<div class="edition-overlay"></div><div class="edition-glint"></div>${inner}</div>`;
}
function playingFace(c:Card){
 const enhancement=c.enhancement??'none',edition=c.edition??'none';
 const seal=c.seal?`<div class="modifier-seal" data-seal="${c.seal}">${image('seal-'+c.seal+'.png')}</div>`:'';
 const ink=enhancement==='glass'&&edition!=='none'?`<div class="glass-body"></div><div class="glass-bevel"></div>${image('glass/'+assetFor(c).replace('.png','-ink.png'),'glass-base-ink')}`:'';
 return `<div class="modifier-print enhancement-${enhancement} modifier-version-${edition}" data-target="playing" data-enhancement="${enhancement}" data-edition="${edition}" data-seal="${c.seal??'none'}">${face(assetFor(c),enhancement==='glass'&&edition==='none'?'glass':c.edition??'',seal,ink+'<div class="modifier-enhancement"></div>')}</div>`;
}
function jcard(j:Joker,i:number){const gap=Math.min(123,520/Math.max(1,state.jokers.length-1));return `<div class="joker-slot" id="${j.id}" data-joker="${j.id}" data-tip="joker:${j.id}" style="left:${352+i*gap}px;top:${84+(i%2)*3}px;--angle:${i%2?2:-2}deg"><div class="card-inner">${face(jokerFile(j),j.edition??'')}</div><button class="joker-sell" data-sell-joker="${j.id}">出售 $${jokerSellValue(j)}</button></div>`;}


function hud() {return `<aside class="hud">
  <div class="blind-header"><span class="blind-chip">●</span><span>小盲注<small>SMALL BLIND</small></span></div>
  <div class="blind-goal"><span>得分要求至少</span><strong class="score-red">${state.scene==='score'?'3,000':'300'}</strong><span class="reward">奖励 <b>$$$</b></span></div>
  <div class="round-total"><label>本回合得分</label><strong id="round-total">${fmt(state.total)}</strong></div>
  <div class="hand-name"><strong id="hand-name">${state.scene==='shop'?'商店':evaluate(state.hand.filter(c=>state.selected.includes(c.id))).name}</strong><small id="hand-level">等级 1</small></div>
  <div class="score-equation"><div class="chips" id="chips">${fmt(state.chips)}</div><span>×</span><div class="mult" id="mult">${state.mult}</div></div>
  <div class="hud-stats"><div><label>出牌</label><b class="blue-number" id="hands-left">${state.hands}</b></div><div><label>弃牌</label><b class="red-number" id="discards-left">${state.discards}</b></div></div>
  <div class="money" id="money">$${state.money}</div>
  <div class="hud-stats small"><div><label>底注</label><b>1<span> / 8</span></b></div><div><label>回合</label><b>${state.round}</b></div></div>
  <div class="hud-bottom"><button class="game-button orange" data-action="new_game">重开样片</button><button class="game-button red" id="open-notes">说明</button></div>
  </aside>`;}

function topRows(){const gap=Math.min(105,115/Math.max(1,state.consumables.length-1));return `<div class="area-outline joker-area"><span>小丑牌</span><small id="joker-count">${state.jokers.length} / ${jokerCapacity(state)}</small></div>${state.jokers.map(jcard).join('')}<div class="area-outline consumable-area"><span>消耗品</span><small>${state.consumables.length} / ${consumableCapacity(state)}</small></div>${state.consumables.map((c,i)=>{const d=consumableById[c.kind];return `<div class="consumable-card ${activeConsumable===c.id?'active':''}" role="button" tabindex="0" aria-label="${d.name}" aria-pressed="${activeConsumable===c.id}" style="left:${1028+i*gap}px;z-index:${activeConsumable===c.id?95:45+i}" data-consumable="${c.id}" data-tip="consumable:${c.kind}">${face(d.file,c.edition??'')}<div class="consumable-actions"><button class="game-button green" data-use-consumable="${c.id}">使用</button><button class="game-button orange" data-sell-consumable="${c.id}">出售 $${c.edition==='negative'?4:Math.floor(d.price/2)}</button></div></div>`}).join('')}<div class="consumable-hint" id="consumable-hint"></div>`;}
function deck(){const total=state.hand.length+state.drawPile.length+state.playedPile.length+state.discardPile.length;return `<div class="deck-stack" data-tip="deck">${image('back-red.png')}<span>${state.drawPile.length} / ${total}</span></div>`;}


function renderTable() {
  layer.innerHTML=hud()+topRows()+`
  <div class="table-seam"></div><div class="played-area"><div id="played-cards"></div><div class="table-center" id="table-center"><span class="table-glyph">♠</span><strong>${state.scene==='score'?'看看 60 分，如何变成 3,120 分':'选好你的下一手'}</strong><small>${state.scene==='score'?'对子 · 狡猾小丑 · 小丑 · 多彩半张小丑':'点击抬起手牌，拖动调整计分顺序'}</small></div></div>
  <div id="hand-area" class="hand-area"></div><div class="hand-counter" id="hand-counter">${state.hand.length} / ${state.handSize}</div>
  <div class="table-actions"><button class="game-button blue" id="play-button" data-action="play_hand">出牌</button><div class="sort-group"><span>排序</span><button class="game-button orange compact" data-sort="rank">点数</button><button class="game-button orange compact" data-sort="suit">花色</button></div><button class="game-button red" id="discard-button" data-action="discard">弃牌</button></div>
  <button class="consumable-library table-library">消耗品图鉴 · 52 ↗</button>${state.roundEnded?'<button class="game-button green round-continue" data-action="enter_shop">前往商店 →</button>':''}${deck()}<div class="selection-caption" id="selection-caption">最多选择 5 张</div>
  ${state.scene==='score'?'<button class="game-button orange score-preset" id="score-preset">播放固定计分样例</button><div class="score-tape" id="score-tape"><span>等待出牌</span></div>':''}
  <span class="zone-label zone-hud">信息区 · 约 22%</span><span class="zone-label zone-jokers">构筑区</span><span class="zone-label zone-play">计分区</span><span class="zone-label zone-hand">手牌与操作区</span>`;
  drawHand();bindGame();updateSelection();
  $('#score-preset')?.addEventListener('click',()=>{if(state.lastScore)switchScene('score');void dispatch({type:'play_hand',cardIds:['h-10','c-10']});});
}

function drawHand() {
  const area=$('#hand-area');if (!area) return;
  const old=new Map([...area.children].map(e=>[(e as HTMLElement).dataset.cardid,e as HTMLElement]));
  const width=state.pack ? 650 : 700;
  const gap=Math.min(82,(width-100)/Math.max(1,state.hand.length-1));
  const start=(state.pack?420:402)+(700-(gap*(state.hand.length-1)+96))/2;
  state.hand.forEach((c,i)=>{
    let el=old.get(c.id);old.delete(c.id);
    if(!el){el=document.createElement('div');el.className='hand-card';el.dataset.cardid=c.id;el.setAttribute('role','button');el.tabIndex=0;area.append(el);bindHandCard(el);}
    const center=(state.hand.length-1)/2,dist=i-center;
    el.dataset.x=String(start+gap*i);el.dataset.y=String(492+Math.abs(dist)*3);
    el.style.left=`${start+gap*i}px`;el.style.top=`${492+Math.abs(dist)*3}px`;
    el.style.setProperty('--angle',`${dist*1.2}deg`);el.style.zIndex=String(20+i);
    el.setAttribute('aria-label',`${suitName[c.suit]} ${rankName(c.rank)}`);
    el.innerHTML=`<div class="card-inner">${playingFace(c)}</div>`;
    el.classList.toggle('selected',state.selected.includes(c.id));el.setAttribute('aria-pressed',String(state.selected.includes(c.id)));
  });
  old.forEach(el=>el.remove());
  $('#hand-counter') && ($('#hand-counter').textContent=`${state.hand.length} / ${state.handSize}`);
}

function bindHandCard(el:HTMLElement) {
  let down=false,dragging=false,startX=0,startY=0;
  el.addEventListener('pointerdown',e=>{
    if(e.button!==0 || state.busy) return;
    down=true;dragging=false;startX=e.clientX;startY=e.clientY;el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove',e=>{
    const box=el.getBoundingClientRect();const rx=(e.clientY-box.top)/box.height-.5,ry=(e.clientX-box.left)/box.width-.5;
    if(!prefs.reduced)el.style.setProperty('--tilt',`${ry*9}deg`);
    if(!down)return;
    const dx=(e.clientX-startX)/scale,dy=(e.clientY-startY)/scale;
    if(Math.hypot(dx,dy)>7)dragging=true;
    if(dragging){el.classList.add('dragging');el.style.translate=`${dx}px ${dy}px`;el.style.zIndex='300';hideTip();}
    void rx;
  });
  el.addEventListener('pointerleave',()=>el.style.setProperty('--tilt','0deg'));
  el.addEventListener('pointerup',e=>{
    if(!down)return;down=false;el.classList.remove('dragging');el.style.translate='';
    if(dragging){
      const x=(e.clientX-stage.getBoundingClientRect().left)/scale;
      const from=state.hand.findIndex(c=>c.id===el.dataset.cardid);const ids=state.hand.map(c=>c.id);ids.splice(from,1);
      const others=[...$('#hand-area').children].filter(e=>(e as HTMLElement).dataset.cardid!==el.dataset.cardid) as HTMLElement[];
      let index=others.findIndex(e=>x<Number(e.dataset.x)+48);if(index<0)index=ids.length;ids.splice(index,0,el.dataset.cardid!);
      void dispatch({type:'reorder_hand',cardIds:ids});
    }else{void toggleCard(el.dataset.cardid!);}
  });
  el.addEventListener('pointercancel',()=>{down=false;el.classList.remove('dragging');el.style.translate='';drawHand();});
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void toggleCard(el.dataset.cardid!);}});
}

async function toggleCard(id:string) {
  const ids=state.selected.includes(id)?state.selected.filter(i=>i!==id):[...state.selected,id];
  return dispatch({type:'select_cards',cardIds:ids});
}

function updateSelection() {
  updateConsumableControls();
  const selected=state.hand.filter(c=>state.selected.includes(c.id));const ev=evaluate(selected);
  if(!state.busy){$('#hand-name') && ($('#hand-name').textContent=ev.name);$('#chips') && ($('#chips').textContent=String(ev.chips));$('#mult') && ($('#mult').textContent=String(ev.mult));}
  if(!state.busy&&$('#hand-level'))$('#hand-level').textContent=`等级 ${ev.level}`;
  document.querySelectorAll<HTMLElement>('[data-cardid]').forEach(el=>{el.classList.toggle('selected',state.selected.includes(el.dataset.cardid!));el.setAttribute('aria-pressed',String(state.selected.includes(el.dataset.cardid!)));});
  $('#selection-caption') && ($('#selection-caption').textContent=`已选 ${selected.length} / ${state.pack?3:5} 张`);
  for(const id of ['play-button','discard-button']){const button=$<HTMLButtonElement>(`#${id}`);if(button)button.disabled=!selected.length||state.busy||(id==='play-button'?state.hands===0||state.roundEnded:state.discards===0||state.roundEnded);}
}

function updateConsumableControls(){
 const c=state.consumables.find(c=>c.id===activeConsumable);const hint=$('#consumable-hint');if(!c){if(hint)hint.textContent='';return;}
 const result=useConsumable(state,c.kind,{instanceId:c.id,handAvailable:handAvailable()});
 const b=$<HTMLButtonElement>(`[data-use-consumable="${c.id}"]`);if(b)b.disabled=state.busy||!result.ok;
 if(hint)hint.textContent=result.ok?consumableById[c.kind].description:result.message;
}
function bindGame() {
 document.querySelectorAll<HTMLElement>('[data-consumable]').forEach(el=>{const select=()=>{activeConsumable=activeConsumable===el.dataset.consumable?null:el.dataset.consumable!;document.querySelectorAll<HTMLElement>('[data-consumable]').forEach(c=>{const on=c.dataset.consumable===activeConsumable;c.classList.toggle('active',on);c.setAttribute('aria-pressed',String(on));c.style.zIndex=on?'95':'45';});updateConsumableControls();};el.addEventListener('click',e=>{if(!(e.target as HTMLElement).closest('button'))select();});el.addEventListener('keydown',e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select();}});});
 document.querySelectorAll<HTMLElement>('[data-use-consumable]').forEach(b=>b.addEventListener('click',()=>void dispatch({type:'use_consumable',consumableId:b.dataset.useConsumable})));
 document.querySelectorAll<HTMLElement>('[data-sell-consumable]').forEach(b=>b.addEventListener('click',()=>void dispatch({type:'sell_consumable',consumableId:b.dataset.sellConsumable})));
 document.querySelectorAll<HTMLElement>('.consumable-library').forEach(b=>b.addEventListener('click',()=>{if(state.busy){toast('计分结束后可打开图鉴');return;}collectionReturn=state.scene;materialGroup='consumables';state.scene='materials';state.phase='materials';state.revision++;location.hash='materials';render();}));
 document.querySelectorAll<HTMLElement>('[data-sell-joker]').forEach(b=>{b.addEventListener('pointerdown',e=>e.stopPropagation());b.addEventListener('click',()=>void dispatch({type:'sell_joker',jokerId:b.dataset.sellJoker}));});
 updateConsumableControls();
  document.querySelectorAll<HTMLElement>('[data-action]').forEach(b=>b.addEventListener('click',()=>void dispatch({type:b.dataset.action!})));
  document.querySelectorAll<HTMLElement>('[data-sort]').forEach(b=>b.addEventListener('click',()=>void dispatch({type:'sort_hand',by:b.dataset.sort})));
  $('#open-notes')?.addEventListener('click',()=>toast('固定场景，用于确认界面与手感；还不是完整规则游戏。'));
  document.querySelectorAll<HTMLElement>('[data-tip]').forEach(el=>{
    el.addEventListener('pointerenter',()=>showTip(el,el.dataset.tip!));el.addEventListener('pointerleave',hideTip);
  });
  document.querySelectorAll<HTMLElement>('[data-joker]').forEach(el=>{
    let x=0,dx=0,active=false;
    el.addEventListener('pointerdown',e=>{if(e.button!==0||state.busy)return;x=e.clientX;dx=0;active=true;el.setPointerCapture(e.pointerId);});
    el.addEventListener('pointermove',e=>{if(!active)return;dx=(e.clientX-x)/scale;if(Math.abs(dx)>6){el.style.translate=`${dx}px 0`;el.classList.add('dragging');hideTip();}});
    el.addEventListener('pointerup',()=>{if(!active)return;active=false;el.classList.remove('dragging');el.style.translate='';if(Math.abs(dx)>35){const ids=state.jokers.map(j=>j.id);const i=ids.indexOf(el.dataset.joker!);const next=Math.max(0,Math.min(ids.length-1,i+Math.round(dx/123)));ids.splice(i,1);ids.splice(next,0,el.dataset.joker!);void dispatch({type:'reorder_jokers',jokerIds:ids});}});
    el.addEventListener('pointercancel',()=>{active=false;el.style.translate='';el.classList.remove('dragging');});
  });
}

function showTip(el:HTMLElement,key:string) {
  if(el.classList.contains('dragging'))return;
  const instance=key.startsWith('joker:')?state.jokers.find(j=>j.id===key.slice(6)):undefined;
  const definition=instance?jokerCatalog.find(j=>j.file===jokerFile(instance)):undefined;
  const consume=key.startsWith('consumable:')?consumableById[key.slice(11)]:undefined;
  const data=consume?{name:consume.name,description:consume.description}:instance?{name:jokerNames[instance.kind]??definition?.name??instance.kind,description:jokerData[instance.kind as JokerKind]?.description??definition?.effect??''}:key in jokerData?jokerData[key as JokerKind]:{name:'红色牌组',description:'牌组改动会保留；显示牌堆剩余 / 当前牌组总张数'};

  const tip=$('#tooltip');tip.innerHTML=`<strong>${data.name}</strong><p>${data.description}</p>${key==='half'?'<small class="poly-label">多彩 · ×1.5 倍率</small>':''}`;
  const r=el.getBoundingClientRect(),sr=stage.getBoundingClientRect();tip.style.left=`${Math.min(1020,Math.max(12,(r.left-sr.left)/scale-45))}px`;tip.style.top=`${(r.bottom-sr.top)/scale+14}px`;tip.classList.add('visible');
}
function hideTip() {$('#tooltip').classList.remove('visible');}
function toast(message:string) {const t=$('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>t.classList.remove('visible'),2600);}
function sound(type:'select'|'score'|'cash',index=0) {
  if(!prefs.sound)return;
  audio??=new AudioContext();void audio.resume();const o=audio.createOscillator(),g=audio.createGain();
  o.type=type==='cash'?'triangle':'sine';const f=type==='select'?460:type==='cash'?740:360+index*68;
  o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.65,audio.currentTime+.08);
  g.gain.setValueAtTime(.055,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.11);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.12);
}
function animate(el:HTMLElement|null,frames:Keyframe[],duration=280) {if(el)el.animate(frames,{duration:prefs.reduced?1:duration/prefs.speed,easing:'cubic-bezier(.2,.8,.3,1)'});}
const sleep=(ms:number)=>new Promise<void>(r=>setTimeout(r,prefs.reduced?0:ms/prefs.speed));
function pop(label:string,target:string|undefined,tone:string) {
  const el=target?document.getElementById(target):null;
  const p=document.createElement('div');p.className=`score-pop ${tone}`;p.textContent=label;
  if(el){const r=el.getBoundingClientRect(),sr=stage.getBoundingClientRect();p.style.left=`${(r.left-sr.left+r.width/2)/scale}px`;p.style.top=`${(r.top-sr.top)/scale-5}px`;animate(el,[{scale:'1'},{scale:'1.13',rotate:'-3deg'},{scale:'1'}]);}
  else{p.style.left='800px';p.style.top='300px';}
  effects.append(p);const a=p.animate([{opacity:0,transform:'translate(-50%,8px) scale(.7)'},{opacity:1,offset:.2,transform:'translate(-50%,-10px) scale(1.07)'},{opacity:0,transform:'translate(-50%,-55px) scale(.95)'}],{duration:prefs.reduced?1:820/prefs.speed,easing:'ease-out'});a.onfinish=()=>p.remove();
}
function confetti() {
  if(prefs.reduced)return;
  const colors=['#e7d7a6','#c7a2c8','#83bdb6','#cf9f77'];
  for(let i=0;i<22;i++){
    const el=document.createElement('i');el.style.cssText=`position:absolute;left:780px;top:350px;width:${i%2?4:6}px;height:${i%3?7:4}px;background:${colors[i%colors.length]};`;
    effects.append(el);const dx=Math.sin(i*2.4)*(75+i*5),dy=70+Math.cos(i)*45+i*2;
    const a=el.animate([{transform:'translate(0,0) rotate(0deg)',opacity:0},{transform:`translate(${dx*.55}px,-${45+i*2}px) rotate(${i*40}deg)`,opacity:1,offset:.35},{transform:`translate(${dx}px,${dy}px) rotate(${300+i*40}deg)`,opacity:0}],{duration:(1000+i*13)/prefs.speed,easing:'ease-out'});a.onfinish=()=>el.remove();
  }
}

function scoreSequence(cards:Card[]):ScoreStep[]{return scoreHand(state,cards);}

async function play(cards:Card[]) {
  const token=runId;state.busy=true;state.phase='scoring';state.scoreSteps=scoreSequence(cards);state.scoreIndex=-1;updateSelection();hideTip();
  $('#table-center')?.classList.add('hidden');
  const container=$('#played-cards');container.innerHTML=cards.map((c,i)=>`<div class="played-card" id="played-${c.id}" style="left:${(i-(cards.length-1)/2)*108}px;--angle:${(i-(cards.length-1)/2)*2}deg">${playingFace(c)}</div>`).join('');
  container.querySelectorAll<HTMLElement>('.played-card').forEach(el=>animate(el,[{transform:'translateY(210px) rotate(-4deg)',opacity:0},{transform:'translateY(0)',opacity:1}],350));
  state.hand=state.hand.filter(c=>!cards.includes(c));state.selected=[];drawHand();
  $('#hand-name').textContent=evaluate(cards).name;$('#chips').textContent='0';$('#mult').textContent='0';
  await sleep(400);
  for(let i=0;i<state.scoreSteps.length;i++){
    if(token!==runId)return;const step=state.scoreSteps[i];state.scoreIndex=i;state.chips=step.chips;state.mult=step.mult;
    $('#chips').textContent=fmt(step.chips);$('#mult').textContent=String(step.mult);
    pop(step.label,step.target,step.tone);sound('score',i);
    animate($('#chips'),[{scale:'1.08'},{scale:'1'}],180);animate($('#mult'),[{scale:'1.08'},{scale:'1'}],180);
    if($('#score-tape'))$('#score-tape').innerHTML=`<small>${i+1} / ${state.scoreSteps.length}</small><strong>${step.detail}</strong><span>${fmt(step.chips)} <i>×</i> ${step.mult}</span>`;
    await sleep(i===0?450:320);
  }
  if(token!==runId)return;
  const last=state.scoreSteps.at(-1)!;state.lastScore=Math.floor(last.chips*last.mult);state.total+=state.lastScore;state.hands--;state.revision++;
  $('#round-total').textContent=fmt(state.total);$('#hands-left').textContent=String(state.hands);
  const banner=document.createElement('div');banner.className='score-finish';banner.innerHTML=`<small>本次得分</small><strong>${fmt(state.lastScore)}</strong><span>${last.chips} × ${last.mult}</span>`;effects.append(banner);sound('cash');
  if(prefs.shake&&!prefs.reduced)animate(layer,[{translate:'0 0'},{translate:'-4px 3px'},{translate:'4px -2px'},{translate:'-2px 1px'},{translate:'0 0'}],330);
  await sleep(1100);if(token!==runId)return;banner.remove();
  const broken=finishPlayedCards(state,cards);
  const ended=state.scene==='table'&&(state.total>=300||state.hands===0||(!state.hand.length&&!state.drawPile.length));
  if(ended)finishRound(state);else if(state.scene!=='score')fillHand(state);
  state.busy=false;state.phase=ended?'round_end':'selecting';state.revision++;
  if(ended||state.scene==='table')render();else{drawHand();updateSelection();$('#money').textContent='$'+state.money;}
  if(broken.length)toast(`玻璃破碎 · 移除 ${broken.length} 张牌`);
  if(state.scene==='score')$('#score-preset').textContent='重置并再次播放';
}

function renderShop(){
 if(state.pack){renderPack();return;}
 const offer=consumableById[state.offerConsumable];
 layer.innerHTML=hud()+topRows()+`<div class="shop-panel"><div class="shop-banner">商 店 <small>SHOP</small></div><div class="shop-offers">
 ${state.offers.includes('blueprint')?`<div class="offer" data-offer="blueprint">${face('joker-blueprint.png')}<span class="price">$10</span><div class="offer-info"><strong>蓝图</strong><small>稀有小丑牌</small></div><button class="game-button green offer-buy" data-buy="blueprint">购买 $10</button></div>`:'<div class="sold-slot"><span>已售出</span></div>'}
 ${state.offers.includes('tarot')?`<div class="offer" data-offer="tarot" data-tip="consumable:${offer.id}">${face(offer.file)}<span class="price">$${offer.price}</span><div class="offer-info"><strong>${offer.name}</strong><small>${familyNames[offer.family]}</small></div><button class="game-button green offer-buy" data-buy="tarot">购买 $${offer.price}</button></div>`:'<div class="sold-slot"><span>已售出</span></div>'}
 </div><div class="pack-offers">${(['celestial','arcana','spectral'] as const).map(kind=>state.offers.includes(kind)?`<button class="pack-offer" data-pack="${kind}">${packFace(kind)}<div class="pack-offer-info"><strong>${kind==='celestial'?'天体包':kind==='arcana'?'幻术包':'幻灵包'}</strong><small>${kind==='spectral'?'2 选 1':'3 选 1'} · 直接使用</small><b>$4</b></div></button>`:'<div class="pack-sold">已售出</div>').join('')}</div>
 <div class="shop-bottom"><button class="game-button green" data-action="reroll">刷新 <strong>$${state.rerollCost}</strong></button><button class="game-button orange" id="next-round">下一回合</button></div></div>
 <div class="shop-note"><strong>52 张消耗牌</strong><p>塔罗 · 星球 · 幻灵<br/>购买后点击右上槽位使用或出售。需要手牌的效果在牌桌使用。</p><button class="consumable-library">查看 / 试用全部 ↗</button><button class="pack-library">查看五类包装 ↗</button></div>${deck()}`;
 bindGame();document.querySelectorAll<HTMLElement>('[data-buy]').forEach(b=>b.addEventListener('click',()=>void dispatch({type:'buy',offerId:b.dataset.buy})));
 document.querySelectorAll<HTMLElement>('[data-pack]').forEach(b=>b.addEventListener('click',()=>void dispatch({type:'open_pack',offerId:b.dataset.pack})));
 $('#next-round').addEventListener('click',()=>void dispatch({type:'next_round'}));
 $('.pack-library').addEventListener('click',()=>{materialGroup='other';catalogQuery='包';catalogPage=0;selectedMaterial='pack-celestial.png';switchScene('materials');});
}
function renderPack(animateOpening=true){
 const celestial=state.pack==='celestial',title=celestial?'天体包':state.pack==='arcana'?'幻术包':'幻灵包';
 layer.innerHTML=hud()+topRows()+`<div class="pack-title"><small>BOOSTER PACK</small><h2>${title}</h2><p>${celestial?'选择一张星球牌，立即升级牌型':'按牌面要求选择手牌，再选择一张消耗牌使用'}</p></div>
 <div class="pack-choices ${state.packOptions.length===2?'two-choices':''}">${state.packOptions.map((id,i)=>{const d=consumableById[id];return `<button class="pack-choice" data-pick="${i}" data-tip="consumable:${id}" style="--delay:${animateOpening?(230+i*100)/prefs.speed:0}ms;--arrive-duration:${360/prefs.speed}ms">${face(d.file)}<strong>${d.name}</strong><small>${d.description}</small><span class="choose-label">选择使用</span></button>`}).join('')}</div>
 ${celestial?'<div class="pack-floor">选择后立即生效</div>':'<div id="hand-area" class="hand-area"></div><div id="selection-caption" class="selection-caption">按消耗牌要求选择目标</div>'}
 <button class="game-button red skip-pack" data-action="skip_pack">跳过</button>${animateOpening?`<div class="pack-unseal" aria-hidden="true">${packFace(state.pack!)}<div class="pack-burst"></div></div>`:''}`;
 if(!celestial)drawHand();bindGame();document.querySelectorAll<HTMLElement>('[data-pick]').forEach(b=>b.addEventListener('click',()=>void dispatch({type:'pick_pack',optionId:Number(b.dataset.pick)})));
 if(animateOpening){const unseal=$('.pack-unseal');unseal.getAnimations({subtree:true}).forEach(animation=>animation.playbackRate=prefs.speed);confetti();setTimeout(()=>unseal.remove(),prefs.reduced?1:680/prefs.speed);}
 updateSelection();
}


const materialItems=[
  ...(['S','H','D','C'] as const).flatMap(s=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(r=>[`card-${s}-${r}.png`,`${suitName[s]} ${r}`])),
  ['back-red.png','红色卡背'],['back-blue.png','蓝色卡背'],['consumable-tarot.png','塔罗'],['consumable-planet.png','星球'],
  ['pack-arcana.png','幻术包'],['pack-celestial.png','天体包'],['pack-standard.png','标准包'],['pack-buffoon.png','丑角包'],['pack-spectral.png','幻灵包'],
  ...['red','blue','gold','purple'].map((s,i)=>[`seal-${s}.png`,`${['红','蓝','金','紫'][i]}蜡封`]),
];
const escapeText=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function selectedInfo(){
  const j=jokerCatalog.find(j=>j.file===materialFile(selectedMaterial));
  return j?{name:localJokerNames[j.id]??j.name,en:j.name,detail:j.effect,rarity:j.rarity,number:j.collection_number}:
    {name:materialItems.find(([file])=>file===selectedMaterial)?.[1]??'物料',en:'PIXEL ASSET STUDY',detail:'自绘像素结构样片 · 可切换版本进行材质对照',rarity:'',number:0};
}
function renderMaterialSelection(){
  const info=selectedInfo(),choices=materialEditions();
  if(!choices.some(e=>e.id===edition))edition='none';
  const ed=editionData.find(e=>e.id===edition)!;
  const isPack=packKinds.some(kind=>selectedMaterial===`pack-${kind}.png`);
  $('.edition-picker').innerHTML=choices.map(e=>`<button data-edition="${e.id}">${e.name}</button>`).join('');
  document.querySelectorAll<HTMLElement>('[data-edition]').forEach(b=>b.addEventListener('click',()=>{edition=b.dataset.edition!;renderMaterialSelection();}));
  $('#material-preview').innerHTML=face(selectedMaterial,edition);
  $('#material-preview').classList.toggle('is-pack',isPack);
  $('.material-inspector').classList.toggle('inspecting-pack',isPack);
  $('.comparison-panel').classList.toggle('comparing-packs',isPack);
  $('#material-preview').setAttribute('aria-label',`${info.name} · ${ed.name}，移动指针查看牌面光泽`);
  $('#material-name').textContent=info.name;$('#material-en').textContent=info.en;
  $('#material-detail').textContent=isPack?'分色印花、锯齿封边与折角，搭配微微凸起的像素标识。五类包装展示；商店支持天体包、幻术包与幻灵包的实际使用。':info.detail;
  $('#material-rarity').textContent=info.rarity?`${rarityNames[info.rarity]} · #${String(info.number).padStart(3,'0')}`:'其他物料';
  $('#material-rarity').dataset.rarity=info.rarity;
  $('#edition-description').textContent=isPack?'移动指针查看折边厚度与轻微视差。商店购买后会撕开顶封，再展开候选牌。':ed.description;
  $('#edition-name').textContent=isPack?'像素包装 / BOOSTER PACK':`${ed.name} / ${ed.en}`;
  $('#comparison-title').textContent=isPack?'五类 · 卡包工艺':'同卡 · 版本对照';
  $('#comparison-description').textContent=isPack?'幻术 / 天体 / 标准 / 丑角 / 幻灵':`${choices.map(e=>e.name).join(' / ')} · 玻璃归于增强，见卡牌修饰`;
  $('#edition-comparison').style.gridTemplateColumns=`repeat(${isPack?packKinds.length:choices.length},1fr)`;
  $('#edition-comparison').innerHTML=isPack?packKinds.map(kind=>`<button class="edition-example ${selectedMaterial===`pack-${kind}.png`?'active':''}" data-compare-pack="${kind}" aria-pressed="${selectedMaterial===`pack-${kind}.png`}"><span class="comparison-card">${packFace(kind)}</span><strong>${materialItems.find(([file])=>file===`pack-${kind}.png`)![1]}</strong><small>${kind.toUpperCase()}</small></button>`).join(''):choices.map(e=>`<button class="edition-example ${edition===e.id?'active':''}" data-compare-edition="${e.id}" aria-pressed="${edition===e.id}"><span class="comparison-card">${face(selectedMaterial,e.id)}</span><strong>${e.name}</strong><small>${e.en}</small></button>`).join('');
  document.querySelectorAll<HTMLElement>('[data-edition]').forEach(b=>{b.classList.toggle('active',edition===b.dataset.edition);b.setAttribute('aria-pressed',String(edition===b.dataset.edition));});
  document.querySelectorAll<HTMLElement>('[data-material]').forEach(b=>{b.classList.toggle('active',materialFile(b.dataset.material!)===materialFile(selectedMaterial));b.setAttribute('aria-pressed',String(materialFile(b.dataset.material!)===materialFile(selectedMaterial)));});
  document.querySelectorAll<HTMLElement>('[data-compare-edition]').forEach(b=>b.addEventListener('click',()=>{edition=b.dataset.compareEdition!;renderMaterialSelection();}));
  document.querySelectorAll<HTMLElement>('[data-compare-pack]').forEach(b=>b.addEventListener('click',()=>{selectedMaterial=`pack-${b.dataset.comparePack}.png`;renderMaterialSelection();}));
}
function renderMaterialGrid(){
  const query=catalogQuery.trim().toLocaleLowerCase();
  const list=materialGroup==='jokers'?jokerCatalog.filter(j=>(catalogRarity==='all'||j.rarity===catalogRarity)&&`${j.name} ${localJokerNames[j.id]??''} ${j.effect} ${j.collection_number}`.toLocaleLowerCase().includes(query)).map(j=>({file:legacyFile(j.file),name:localJokerNames[j.id]??j.name,en:j.name,rarity:j.rarity,number:j.collection_number})):
    materialItems.filter(([,name])=>name.toLocaleLowerCase().includes(query)).map(([file,name],i)=>({file,name,en:name,rarity:'',number:i+1}));
  const pageCount=Math.max(1,Math.ceil(list.length/16));catalogPage=Math.min(catalogPage,pageCount-1);
  $('#catalog-grid').classList.toggle('is-pack-catalog',list.length>0&&list.every(j=>j.file.startsWith('pack-')));
  $('#catalog-grid').innerHTML=list.slice(catalogPage*16,(catalogPage+1)*16).map(j=>`<button class="catalog-card" data-material="${j.file}" aria-label="${escapeText(j.name)}" title="${escapeText(j.en)}"><span class="catalog-number">${String(j.number).padStart(3,'0')}</span><span class="catalog-art">${j.file.startsWith('pack-')?face(j.file):image(j.file)}</span><strong>${escapeText(j.name)}</strong><span class="rarity-dot" data-rarity="${j.rarity}"></span></button>`).join('')||'<div class="catalog-empty">没有找到相符的卡牌</div>';
  $('#catalog-count').textContent=materialGroup==='jokers'?`${list.length} / 150 张小丑牌`:`${list.length} / ${materialItems.length} 张其他物料`;
  $('#catalog-page').textContent=`${catalogPage+1} / ${pageCount}`;
  $<HTMLButtonElement>('#catalog-prev').disabled=catalogPage===0;$<HTMLButtonElement>('#catalog-next').disabled=catalogPage>=pageCount-1;
  document.querySelectorAll<HTMLElement>('[data-material]').forEach(b=>b.addEventListener('click',()=>{selectedMaterial=b.dataset.material!;renderMaterialSelection();sound('select');}));
  renderMaterialSelection();
}
function materialTabs(){
  return `<button data-material-group="consumables" class="${materialGroup==='consumables'?'active':''}">消耗品 <b>52</b></button><button data-material-group="jokers" class="${materialGroup==='jokers'?'active':''}">小丑图鉴 <b>150</b></button><button data-material-group="other" class="${materialGroup==='other'?'active':''}">其他物料 <b>${materialItems.length}</b></button><button data-material-group="modifiers" class="${materialGroup==='modifiers'?'active':''}">卡牌修饰 <b>16</b></button>`;
}
function bindMaterialTabs(){
  document.querySelectorAll<HTMLElement>('[data-material-group]').forEach(b=>b.addEventListener('click',()=>{materialGroup=b.dataset.materialGroup as typeof materialGroup;catalogPage=0;catalogQuery='';catalogRarity='all';renderMaterials();}));
}
function renderMaterials() {
  if(materialGroup==='consumables'){mountConsumableLab(layer,face,materialTabs(),state.handLevels,kind=>void dispatch({type:'grant_consumable',kind}),()=>{state.scene=collectionReturn;state.phase=collectionReturn==='shop'?'shop':state.roundEnded?'round_end':'selecting';state.revision++;location.hash=state.scene;render();});bindMaterialTabs();return;}
  if(materialGroup==='modifiers'){mountModifierLab(layer,face,materialTabs());bindMaterialTabs();return;}
  layer.innerHTML=`<section class="material-inspector"><div class="inspector-heading"><small>THE PRINT ROOM</small><h2>一副牌的质感</h2><p>像素原画 · 版本工艺 · 光影反馈</p></div>
  <div class="material-preview"><div class="preview-shadow"></div><div class="preview-card" id="material-preview"></div></div>
  <div class="material-identity"><span id="material-rarity"></span><h3 id="material-name"></h3><small id="material-en"></small><p id="material-detail"></p></div>
  <div class="edition-picker" aria-label="版本"></div>
  <div class="edition-note"><strong id="edition-name"></strong><p id="edition-description"></p></div></section>
  <section class="catalog-panel"><div class="catalog-top"><div class="catalog-tabs">${materialTabs()}</div><span class="catalog-hint">点击物料，查看细节</span></div>
  <div class="catalog-tools"><label class="catalog-search"><span>⌕</span><input id="catalog-search" aria-label="搜索卡牌" placeholder="搜索名称、效果、编号…" value="${escapeText(catalogQuery)}"/></label><select id="catalog-rarity" aria-label="稀有度" ${materialGroup==='other'?'disabled':''}><option value="all">全部稀有度</option>${Object.entries(rarityNames).map(([key,name])=>`<option value="${key}" ${catalogRarity===key?'selected':''}>${name}</option>`).join('')}</select><span id="catalog-count"></span></div>
  <div id="catalog-grid" class="catalog-grid"></div><div class="catalog-pagination"><span>卡图完整展示 · 效果文本供查阅</span><div><button id="catalog-prev" aria-label="上一页">←</button><b id="catalog-page"></b><button id="catalog-next" aria-label="下一页">→</button></div></div></section>
  <section class="comparison-panel"><div class="comparison-heading"><strong id="comparison-title">同卡 · 材质对照</strong><span id="comparison-description"></span></div><div id="edition-comparison" class="edition-comparison"></div></section>`;
  $('#catalog-search').addEventListener('input',e=>{catalogQuery=(e.target as HTMLInputElement).value;catalogPage=0;renderMaterialGrid();});
  $('#catalog-rarity').addEventListener('change',e=>{catalogRarity=(e.target as HTMLSelectElement).value;catalogPage=0;renderMaterialGrid();});
  $('#catalog-prev').addEventListener('click',()=>{catalogPage--;renderMaterialGrid();});$('#catalog-next').addEventListener('click',()=>{catalogPage++;renderMaterialGrid();});
  bindMaterialTabs();
  $('#material-preview').addEventListener('pointermove',e=>{
    if(prefs.reduced)return;
    const card=$('#material-preview'),rect=card.getBoundingClientRect();
    const x=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height));
    const ownTilt=edition==='glass'||selectedMaterial.startsWith('pack-');
    card.style.setProperty('--rx',`${ownTilt?0:(y-.5)*-16}deg`);card.style.setProperty('--ry',`${ownTilt?0:(x-.5)*20}deg`);
    card.style.setProperty('--mx',`${x*100}%`);card.style.setProperty('--my',`${y*100}%`);
  });
  $('#material-preview').addEventListener('pointerleave',()=>{const card=$('#material-preview');card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');card.style.setProperty('--mx','50%');card.style.setProperty('--my','40%');});
  renderMaterialGrid();
}

function render() {
  hideTip();if(state.scene==='materials')renderMaterials();else if(state.scene==='shop')renderShop();else renderTable();
  document.querySelectorAll<HTMLElement>('[data-scene]').forEach(b=>{b.classList.toggle('active',b.dataset.scene===state.scene);b.setAttribute('aria-current',b.dataset.scene===state.scene?'page':'false');});
  const s=sceneInfo[state.scene];$('#caption-number').textContent=`STUDY 0${(['table','score','shop','materials'] as Scene[]).indexOf(state.scene)+1}`;$('#caption-title').textContent=s.title;$('#caption-description').textContent=s.description;$('#caption-keys').textContent=s.keys;bg.setShop(state.scene==='shop');
}

function switchScene(scene:Scene,preserve=false){
 clearTimeout(toastTimer);$('#toast').classList.remove('visible');runId++;effects.innerHTML='';activeConsumable=null;
 if(!preserve){Object.assign(state,initialRules());state.hands=4;state.discards=3;state.total=0;state.offers=['blueprint','tarot','celestial','arcana','spectral'];state.offerConsumable='star';state.rerollCost=5;}
 state.scene=scene;state.phase=scene==='shop'?'shop':scene==='materials'?'materials':state.roundEnded?'round_end':'selecting';state.busy=false;state.pack=null;state.packOptions=[];state.selected=[];state.chips=0;state.mult=0;state.scoreSteps=[];state.scoreIndex=-1;state.lastScore=0;
 state.revision++;location.hash=scene;render();
}


function fail(error:string,message:string):Result {toast(message);return {ok:false,error,revision:state.revision};}
function ids(value:unknown):string[]|null {return Array.isArray(value)&&value.every(i=>typeof i==='string')&&new Set(value).size===value.length?value:null;}
async function dispatch(action:Action):Promise<Result>{
 if(!action||typeof action.type!=='string')return fail('INVALID_ACTION','操作格式不正确');
 if(state.busy)return fail('BUSY','正在播放计分，请稍候');
 const done=():Result=>({ok:true,revision:state.revision});
 if(action.type==='new_game'){
  if(action.seed!==undefined&&(typeof action.seed!=='number'||!Number.isInteger(action.seed)||action.seed<1||action.seed>0xffffffff))return fail('INVALID_SEED','seed 须为 1–4294967295 的整数');
  switchScene(state.scene);if(typeof action.seed==='number'){Object.assign(state,initialRules(action.seed));render();}return done();
 }
 if(action.type==='grant_consumable'){
  const kind=typeof action.kind==='string'?action.kind:'';if(!consumableById[kind])return fail('UNKNOWN_CONSUMABLE','消耗牌不存在');
  if(!addConsumable(state,kind))return fail('CONSUMABLE_LIMIT','消耗品槽位已满，请先使用或出售');
  state.scene=state.roundEnded?'shop':'table';state.phase=state.roundEnded?'shop':'selecting';state.pack=null;state.packOptions=[];location.hash=state.scene;activeConsumable=state.consumables.at(-1)!.id;state.revision++;render();toast('已免费加入试用槽 · '+consumableById[kind].name);return done();
 }
 if(action.type==='use_consumable'||action.type==='sell_consumable'){
  if(!['selecting','shop','pack'].includes(state.phase))return fail('WRONG_PHASE','请在牌桌、商店或开包时操作消耗牌');
  const instance=state.consumables.find(c=>c.id===action.consumableId);if(!instance)return fail('UNAVAILABLE','消耗牌已使用、售出或不存在');
  const d=consumableById[instance.kind];let message='';
  if(action.type==='sell_consumable'){
   const price=instance.edition==='negative'?4:Math.floor(d.price/2);state.money+=price;state.consumables=state.consumables.filter(c=>c.id!==instance.id);message=d.name+' · 出售 +$'+price;
  }else{
   const targetIds=action.cardIds===undefined?undefined:ids(action.cardIds);if(targetIds===null)return fail('INVALID_SELECTION','目标格式不正确');
   const result=useConsumable(state,instance.kind,{instanceId:instance.id,cardIds:targetIds,handAvailable:handAvailable()});if(!result.ok)return fail(result.error,result.message);
   Object.assign(state,result.state);message=result.message;
  }
  activeConsumable=null;state.revision++;if(state.pack)renderPack(false);else render();toast(message);sound('cash');
  if(action.type==='use_consumable')useFlash(d.file);return done();
 }
 if(action.type==='sell_joker'){
  if(!['selecting','shop','pack'].includes(state.phase))return fail('WRONG_PHASE','当前阶段不能出售小丑');
  const joker=state.jokers.find(j=>j.id===action.jokerId);if(!joker)return fail('UNAVAILABLE','小丑牌不存在');state.money+=jokerSellValue(joker);state.jokers=state.jokers.filter(j=>j.id!==joker.id);state.revision++;if(state.pack)renderPack(false);else render();toast('已出售 · '+(jokerNames[joker.kind]??joker.kind));return done();
 }
 if(action.type==='select_cards'){
  const list=ids(action.cardIds),max=state.pack?3:5;
  if(!handAvailable())return fail('WRONG_PHASE','当前阶段不能选手牌');
  if(!list||list.length>max||list.some(id=>!state.hand.some(c=>c.id===id)))return fail('INVALID_SELECTION','最多选择 '+max+' 张当前手牌');
  state.selected=[...list];state.revision++;updateSelection();sound('select');return done();
 }
 if(action.type==='clear_selection'){state.selected=[];state.revision++;updateSelection();return done();}
 if(action.type==='reorder_hand'||action.type==='sort_hand'){
  if(!handAvailable())return fail('WRONG_PHASE','当前阶段不能排序');
  if(action.type==='reorder_hand'){const list=ids(action.cardIds);if(!list||list.length!==state.hand.length||list.some(id=>!state.hand.some(c=>c.id===id)))return fail('INVALID_ORDER','必须提供全部手牌且不能重复');state.hand=list.map(id=>state.hand.find(c=>c.id===id)!);}
  else{if(!['rank','suit'].includes(String(action.by)))return fail('INVALID_SORT','排序方式无效');state.hand.sort((a,b)=>action.by==='suit'?a.suit.localeCompare(b.suit)||b.rank-a.rank:b.rank-a.rank||a.suit.localeCompare(b.suit));}
  state.revision++;drawHand();updateConsumableControls();sound('select');return done();
 }
 if(action.type==='reorder_jokers'){
  const list=ids(action.jokerIds);if(!list||list.length!==state.jokers.length||list.some(id=>!state.jokers.some(j=>j.id===id)))return fail('INVALID_ORDER','小丑排序无效');state.jokers=list.map(id=>state.jokers.find(j=>j.id===id)!);state.revision++;if(state.pack)renderPack(false);else render();return done();
 }
 if(action.type==='play_hand'||action.type==='discard'){
  if(state.phase!=='selecting')return fail('WRONG_PHASE','当前阶段不能出牌或弃牌');
  const list=ids(action.cardIds??state.selected);if(!list||!list.length||list.length>5||list.some(id=>!state.hand.some(c=>c.id===id)))return fail('INVALID_SELECTION','请选择 1–5 张当前手牌');
  if(action.type==='discard'){
   if(state.discards===0)return fail('NO_DISCARDS','弃牌次数已用完');discardCards(state,list);state.discards--;state.revision++;render();sound('select');return done();
  }
  if(state.hands===0)return fail('NO_HANDS','出牌次数已用完');await play(state.hand.filter(c=>list.includes(c.id)));return done();
 }
 if(action.type==='buy'){
  if(state.phase!=='shop')return fail('WRONG_PHASE','请在商店购买');const offer=String(action.offerId);
  if(!['blueprint','tarot'].includes(offer)||!state.offers.includes(offer))return fail('UNAVAILABLE','商品已售出或不存在');
  const cost=offer==='blueprint'?10:consumableById[state.offerConsumable].price;if(state.money<cost)return fail('INSUFFICIENT_FUNDS','资金不足');
  if(offer==='blueprint'&&state.jokers.length>=jokerCapacity(state))return fail('JOKER_LIMIT','小丑牌槽位已满');
  if(offer==='tarot'&&state.consumables.length>=consumableCapacity(state))return fail('CONSUMABLE_LIMIT','消耗品槽位已满');
  state.money-=cost;state.offers=state.offers.filter(i=>i!==offer);if(offer==='blueprint')state.jokers.push({id:uid(state,'joker'),kind:'blueprint'});else addConsumable(state,state.offerConsumable);
  state.revision++;renderShop();sound('cash');toast(offer==='blueprint'?'蓝图已加入小丑区域':consumableById[state.offerConsumable].name+'已加入消耗品区域');return done();
 }
 if(action.type==='reroll'){
  if(state.phase!=='shop')return fail('WRONG_PHASE','请在商店刷新');if(state.money<state.rerollCost)return fail('INSUFFICIENT_FUNDS','资金不足');
  state.money-=state.rerollCost;state.rerollCost++;state.offers=['blueprint','tarot',...state.offers.filter(i=>['celestial','arcana','spectral'].includes(i))];const choices=[...pool(state,'tarot'),...pool(state,'planet')];state.offerConsumable=pick(state,choices).id;
  state.revision++;renderShop();sound('select');toast('消耗牌商品已刷新');return done();
 }
 if(action.type==='enter_shop'){
  if(state.phase!=='round_end')return fail('WRONG_PHASE','请先完成本回合');state.offers=['blueprint','tarot','celestial','arcana','spectral'];state.rerollCost=5;switchScene('shop',true);return done();
 }
 if(action.type==='next_round'){
  if(state.phase!=='shop')return fail('WRONG_PHASE','请先完成当前操作');leaveShop(state);state.hands=4;state.discards=3;state.total=0;switchScene('table',true);return done();
 }
 if(action.type==='open_pack'){
  const offer=String(action.offerId);if(state.phase!=='shop')return fail('WRONG_PHASE','请在商店购买卡包');if(!['celestial','arcana','spectral'].includes(offer)||!state.offers.includes(offer))return fail('UNAVAILABLE','卡包已售出或不存在');if(state.money<4)return fail('INSUFFICIENT_FUNDS','资金不足');
  state.money-=4;state.offers=state.offers.filter(i=>i!==offer);state.pack=offer as Exclude<typeof state.pack,null>;state.packOptions=packChoices(state,state.pack);
  state.phase='pack';state.selected=[];state.revision++;renderPack();sound('cash');return done();
 }
 if(action.type==='pick_pack'){
  if(state.phase!=='pack')return fail('WRONG_PHASE','当前没有打开的卡包');const option=action.optionId;if(typeof option!=='number'||!Number.isInteger(option)||!state.packOptions[option])return fail('INVALID_OPTION','选择不存在');
  const targetIds=action.cardIds===undefined?undefined:ids(action.cardIds);if(targetIds===null)return fail('INVALID_SELECTION','目标格式不正确');
  const d=consumableById[state.packOptions[option]],result=useConsumable(state,d.id,{cardIds:targetIds,handAvailable:state.pack!=='celestial'});
  if(!result.ok)return fail(result.error,result.message);Object.assign(state,result.state);state.pack=null;state.packOptions=[];state.selected=[];state.phase='shop';state.revision++;renderShop();toast(result.message);sound('cash');useFlash(d.file);return done();
 }
 if(action.type==='skip_pack'){
  if(state.phase!=='pack')return fail('WRONG_PHASE','当前没有打开的卡包');state.pack=null;state.packOptions=[];state.selected=[];state.phase='shop';state.revision++;renderShop();return done();
 }
 return fail('UNSUPPORTED_ACTION','此样片未实现该操作');
}
function useFlash(file:string){
 const flash=document.createElement('div');flash.className='consumable-use-flash';flash.innerHTML=face(file);effects.append(flash);
 const animation=flash.animate([{opacity:0,transform:'translateY(16px) rotate(-7deg) scale(.8)'},{opacity:1,transform:'translateY(-8px) rotate(3deg) scale(1.05)',offset:.35},{opacity:0,transform:'translateY(-42px) rotate(0deg) scale(.95)'}],{duration:prefs.reduced?1:720/prefs.speed,easing:'ease-out'});animation.onfinish=()=>flash.remove();
}

declare global {interface Window {balatro:{getState:()=>object;dispatch:(action:Action)=>Promise<Result>};}}
window.balatro={getState:()=>structuredClone({...state,apiVersion:'lookdev/2',isDemo:true,limits:{consumables:consumableCapacity(state),jokers:jokerCapacity(state)},consumableCatalog}),dispatch};
document.querySelectorAll<HTMLElement>('[data-scene]').forEach(b=>b.addEventListener('click',()=>switchScene(b.dataset.scene as Scene)));
stage.addEventListener('contextmenu',e=>{e.preventDefault();if(state.phase==='selecting'||(state.pack!==null&&state.pack!=='celestial'))void dispatch({type:'clear_selection'});});
$('#speed').addEventListener('change',e=>{prefs.speed=Number((e.target as HTMLSelectElement).value);});
$('#reduced-toggle').addEventListener('click',()=>{prefs.reduced=!prefs.reduced;applyPreferences();});
$('#audio-toggle').addEventListener('click',()=>{prefs.sound=!prefs.sound;$('#audio-toggle').textContent=`音效 ${prefs.sound?'开':'关'}`;$('#audio-toggle').setAttribute('aria-pressed',String(prefs.sound));sound('select');});
$('#zones-toggle').addEventListener('click',()=>{stage.classList.toggle('show-zones');$('#zones-toggle').setAttribute('aria-pressed',String(stage.classList.contains('show-zones')));});
$('#shake').addEventListener('change',e=>{prefs.shake=(e.target as HTMLInputElement).checked;});
$('#crt').addEventListener('input',e=>{const value=Number((e.target as HTMLInputElement).value);stage.style.setProperty('--crt',String(value/100));$('#crt-value').textContent=`${value}%`;});
function applyPreferences(){stage.classList.toggle('reduced-motion',prefs.reduced);$('#reduced-toggle').setAttribute('aria-pressed',String(prefs.reduced));bg.setReduced(prefs.reduced);if(prefs.reduced)surfaceLight.reset();}
const hash=location.hash.slice(1) as Scene;switchScene(['table','score','shop','materials'].includes(hash)?hash:'table');applyPreferences();
