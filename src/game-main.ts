import './host.css';
import {mountBalatro} from './sdk';
const $=<T extends HTMLElement=HTMLElement>(q:string)=>document.querySelector<T>(q)!;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,saveKey='balatro-run-v1';
let initialState:unknown;
try{initialState=JSON.parse(localStorage.getItem(saveKey)??'null')??undefined;}catch{}
document.title='Balatro · 玩法复刻初版';
$('#app').innerHTML=`<main class="g-shell"><header class="g-header"><a class="brand" href="#play"><span class="brand-mark">B<span>♦</span></span><div><strong>BALATRO <span>WEB</span></strong><small>玩法复刻 · 默认全解锁</small></div></a><div class="g-settings"><label>速度 <select id="g-speed"><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option><option value="0">即时</option></select></label><button id="g-reduced" aria-pressed="${reduced}">减少动态</button><button id="g-sound" aria-pressed="false">音效 关</button><button id="g-library">图鉴</button><button id="g-menu">新一局</button></div></header><div id="g-mount"></div><footer class="g-footer"><span>浏览器内运行 · 1.0.1 规则基线 · 初版复刻</span><span id="g-status">选择一副牌组，开始构筑</span><span>卡图 © LocalThunk / Playstack</span></footer></main>`;
const assetBaseUrl=new URL(import.meta.env.BASE_URL+'assets/',document.baseURI).href;
const mount=()=>mountBalatro($('#g-mount'),{assetBaseUrl,state:initialState,startInMenu:true,reducedMotion:reduced});
let view:ReturnType<typeof mountBalatro>;
try{view=mount();}catch{initialState=undefined;view=mount();}
if(initialState)view.showMenu();
// This compatibility global belongs to the playable page. The SDK never creates globals.
window.balatro={getState:view.getState,dispatch:view.dispatch};
let savedRevision=-1,soundOn=false,motionReduced=reduced;
$('#g-menu').onclick=()=>view.showMenu();
$('#g-library').onclick=()=>view.showCollection();
$('#g-speed').onchange=e=>view.setOptions({speed:Number((e.target as HTMLSelectElement).value)});
$('#g-reduced').onclick=()=>{motionReduced=!motionReduced;view.setOptions({reducedMotion:motionReduced});$('#g-reduced').setAttribute('aria-pressed',String(motionReduced));};
$('#g-sound').onclick=()=>{soundOn=!soundOn;view.setOptions({sound:soundOn});$('#g-sound').textContent='音效 '+(soundOn?'开':'关');$('#g-sound').setAttribute('aria-pressed',String(soundOn));};
function persist(){
 const state=view.getState();
 if(state.phase!=='setup'&&state.revision!==savedRevision){try{localStorage.setItem(saveKey,JSON.stringify(state));savedRevision=state.revision;}catch{}}
 $('#g-status').textContent=state.phase==='setup'?'默认全解锁 · 没有局外成长':`SEED ${state.seed} · 自动保存`;
}
const timer=setInterval(persist,250);
addEventListener('pagehide',event=>{persist();if(!event.persisted){clearInterval(timer);view.destroy();}});
