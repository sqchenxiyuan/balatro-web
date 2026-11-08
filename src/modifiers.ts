type Group='enhancement'|'edition'|'seal';
type Target='playing'|'joker';
type Selection={target:Target;enhancement:string;edition:string;seal:string};
type Modifier={id:string;group:Group;name:string;en:string;aliases?:string;effect:string;source:string};
type Face=(file:string,mod?:string,inner?:string,substrate?:string)=>string;

export const modifiers:Modifier[]=[
  {id:'bonus',group:'enhancement',name:'奖励牌',en:'Bonus',effect:'该牌计分时 +30 筹码。',source:'教皇 · 2 张'},
  {id:'mult',group:'enhancement',name:'倍率牌',en:'Mult',effect:'该牌计分时 +4 倍率。',source:'皇后 · 2 张'},
  {id:'wild',group:'enhancement',name:'万能牌',en:'Wild',effect:'同时视为所有花色，仍保留点数。',source:'恋人 · 1 张'},
  {id:'glass',group:'enhancement',name:'玻璃牌',en:'Glass',effect:'计分时 ×2 倍率；使用后有 1/4 概率摧毁。',source:'正义 · 1 张'},
  {id:'steel',group:'enhancement',name:'钢铁牌',en:'Steel',effect:'留在手中时，结算 ×1.5 倍率。',source:'战车 · 1 张'},
  {id:'stone',group:'enhancement',name:'石头牌',en:'Stone',effect:'+50 筹码，无点数、无花色，始终参与计分。',source:'高塔 · 1 张'},
  {id:'gold',group:'enhancement',name:'黄金牌',en:'Gold',effect:'回合结束仍在手中时获得 $3。',source:'恶魔 · 1 张'},
  {id:'lucky',group:'enhancement',name:'幸运牌',en:'Lucky',effect:'计分时分别有 1/5 概率 +20 倍率、1/15 概率获得 $20。',source:'魔术师 · 2 张'},
  {id:'foil',group:'edition',name:'闪箔',en:'Foil',aliases:'箔片',effect:'+50 筹码；可用于扑克牌和小丑牌。',source:'光环 / 命运之轮 / 商店'},
  {id:'holographic',group:'edition',name:'镭射',en:'Holographic',aliases:'全息',effect:'+10 倍率；可用于扑克牌和小丑牌。原版简体中文名称为“镭射”，属于版本。',source:'光环 / 命运之轮 / 商店'},
  {id:'polychrome',group:'edition',name:'多彩',en:'Polychrome',effect:'×1.5 倍率；可用于扑克牌和小丑牌。',source:'光环 / 命运之轮 / 商店'},
  {id:'negative',group:'edition',name:'负片',en:'Negative',effect:'+1 对应槽位；可用于小丑牌或特殊生成的消耗牌，不用于普通扑克牌。',source:'灵质 / 商店；消耗牌可由佩尔科生成'},
  {id:'gold',group:'seal',name:'金色蜡封',en:'Gold seal',effect:'该牌打出并计分时获得 $3。',source:'护身符'},
  {id:'red',group:'seal',name:'红色蜡封',en:'Red seal',effect:'额外触发该牌 1 次，包括适用的留手效果。',source:'似曾相识'},
  {id:'blue',group:'seal',name:'蓝色蜡封',en:'Blue seal',effect:'回合结束仍在手中时，生成最后打出牌型对应的星球牌；需空消耗牌槽。',source:'出神'},
  {id:'purple',group:'seal',name:'紫色蜡封',en:'Purple seal',effect:'被弃掉时生成一张塔罗牌；需空消耗牌槽。',source:'灵媒'},
];
const groups:Record<Group,string>={enhancement:'增强',edition:'版本',seal:'蜡封'};
const asset=`${import.meta.env.BASE_URL}assets/`;
const find=(group:Group,id:string)=>modifiers.find(m=>m.group===group&&m.id===id);
const state:Selection={target:'playing',enhancement:'none',edition:'none',seal:'none'};
let filter='all',query='',selectedKey='';
const presets=[
  {name:'玻璃 · 多彩 · 红封',selection:{target:'playing',enhancement:'glass',edition:'polychrome',seal:'red'} as Selection},
  {name:'钢铁 · 红色蜡封',selection:{target:'playing',enhancement:'steel',edition:'none',seal:'red'} as Selection},
  {name:'石头 · 闪箔',selection:{target:'playing',enhancement:'stone',edition:'foil',seal:'none'} as Selection},
];

function print(s:Selection,face:Face){
  const glass=s.target==='playing'&&s.enhancement==='glass';
  const version=s.edition!=='none';
  const ink=glass&&version?`<div class="glass-body"></div><div class="glass-bevel"></div><img class="glass-base-ink" src="${asset}glass/card-S-A-ink.png" alt=""/>`:'';
  const seal=s.seal==='none'?'':`<div class="modifier-seal" data-seal="${s.seal}"><img src="${asset}seal-${s.seal}.png" alt="${find('seal',s.seal)?.name}"/></div>`;
  const coats=s.target==='playing'?'<div class="modifier-enhancement"></div>':'';
  const art=face(s.target==='joker'?'joker-joker.png':'card-S-A.png',glass&&!version?'glass':version?s.edition:'',seal,`${ink}${coats}`);
  return `<div class="modifier-print enhancement-${s.enhancement} modifier-version-${s.edition}" data-target="${s.target}" data-enhancement="${s.enhancement}" data-edition="${s.edition}" data-seal="${s.seal}">${art}</div>`;
}

/** Visual collection controls are separate from the public game state and rules. */
export function mountModifierLab(root:HTMLElement,face:Face,tabs:string){
  const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
  root.innerHTML=`<section class="material-inspector modifier-inspector">
    <div class="inspector-heading"><small>THE MODIFIER ROOM</small><h2>一张牌，三层修饰</h2><p>8 种增强 · 4 种版本 · 4 种蜡封</p></div>
    <div class="material-preview"><div class="preview-shadow"></div><div class="preview-card" id="material-preview"></div></div>
    <div class="modifier-identity"><small id="modifier-category"></small><h3 id="modifier-name"></h3><p id="modifier-detail"></p></div>
    <div class="modifier-controls"><label>对象<select id="modifier-target" aria-label="修饰对象"><option value="playing">扑克牌 · 黑桃 A</option><option value="joker">小丑牌</option></select></label>
      ${(['enhancement','edition','seal'] as Group[]).map(group=>`<label>${groups[group]}<select id="modifier-${group}" aria-label="${groups[group]}"><option value="none">${group==='edition'?'基础版本':'无'}</option>${modifiers.filter(m=>m.group===group).map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}</select></label>`).join('')}
    </div><div class="modifier-footnote"><p id="modifier-limit"></p><button id="modifier-reset">清空修饰</button><span>此处预览外观 · 可用消耗牌在牌桌施加并计分</span></div>
  </section>
  <section class="catalog-panel modifier-catalog"><div class="catalog-top"><div class="catalog-tabs">${tabs}</div><span class="catalog-hint">基础版不计入 16 项</span></div>
    <div class="catalog-tools"><div class="modifier-filters">${[['all','全部 16'],['enhancement','增强 8'],['edition','版本 4'],['seal','蜡封 4']].map(([id,label])=>`<button data-modifier-filter="${id}">${label}</button>`).join('')}</div><label class="catalog-search"><span>⌕</span><input id="modifier-search" aria-label="搜索修饰" placeholder="名称、译名或效果…"/></label><span id="catalog-count"></span></div>
    <div id="catalog-grid" class="catalog-grid"></div><div class="catalog-pagination"><span>增强与蜡封用于扑克牌 · 小丑仅展示版本 · 负片不用于普通扑克牌</span><a href="https://balatrohq.com/zh/enhancements/" target="_blank" rel="noreferrer">核对 16 项资料 ↗</a></div>
  </section>
  <section class="comparison-panel modifier-comparison"><div class="comparison-heading"><strong>三类修饰 · 组合预览</strong><span>每类同时最多一种</span></div><div class="modifier-presets">${presets.map((p,i)=>`<button data-modifier-preset="${i}"><span class="comparison-card">${print(p.selection,face)}</span><strong>${p.name}</strong></button>`).join('')}</div><div id="modifier-summary" class="modifier-summary"></div></section>`;

  const single=(m:Modifier):Selection=>({target:m.id==='negative'&&m.group==='edition'?'joker':'playing',enhancement:m.group==='enhancement'?m.id:'none',edition:m.group==='edition'?m.id:'none',seal:m.group==='seal'?m.id:'none'});
  function grid(){
    const q=query.trim().toLowerCase();
    const list=modifiers.filter(m=>(filter==='all'||m.group===filter)&&`${m.name} ${m.en} ${m.aliases??''} ${m.effect}`.toLowerCase().includes(q));
    $('#catalog-count').textContent=`${list.length} / 16 项修饰`;
    $('#catalog-grid').innerHTML=list.map(m=>`<button class="catalog-card" data-modifier="${m.group}:${m.id}" data-modifier-group="${m.group}" aria-label="${m.name}"><span class="catalog-number">${groups[m.group]}</span><span class="catalog-art">${print(single(m),face)}</span><strong>${m.name}</strong><small>${m.en.toUpperCase()}</small></button>`).join('')||'<div class="catalog-empty">没有找到相符的修饰</div>';
    root.querySelectorAll<HTMLButtonElement>('[data-modifier]').forEach(button=>button.addEventListener('click',()=>{
      const [group,id]=button.dataset.modifier!.split(':') as [Group,string];
      selectedKey=button.dataset.modifier!;
      if(group==='edition'&&id==='negative'){state.target='joker';state.enhancement='none';state.seal='none';}
      else if(group!=='edition'){state.target='playing';if(state.edition==='negative')state.edition='none';}
      state[group]=id;update();
    }));
    root.querySelectorAll<HTMLButtonElement>('[data-modifier-filter]').forEach(button=>{
      const active=button.dataset.modifierFilter===filter;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    });
    activeCards();
  }
  function activeCards(){
    root.querySelectorAll<HTMLButtonElement>('[data-modifier]').forEach(button=>{
      const [group,id]=button.dataset.modifier!.split(':') as [Group,string];
      const active=state[group]===id;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    });
  }
  function update(){
    const preview=$('#material-preview');preview.innerHTML=print(state,face);
    const chosen=modifiers.find(m=>`${m.group}:${m.id}`===selectedKey);
    const applied=modifiers.filter(m=>state[m.group]===m.id);
    $('#modifier-category').textContent=state.target==='joker'?'JOKER · 版本修饰':'PLAYING CARD · 可叠加三类';
    $('#modifier-name').textContent=chosen?.name??(applied.length?'修饰组合':'基础 · 黑桃 A');
    $('#modifier-detail').textContent=chosen?`${chosen.effect} 施加来源：${chosen.source}。`:applied.map(m=>m.name).join(' ＋ ')||'选择右侧条目，或用下方选项组合修饰。';
    $<HTMLSelectElement>('#modifier-target').value=state.target;
    for(const group of ['enhancement','edition','seal'] as Group[]){
      const select=$<HTMLSelectElement>(`#modifier-${group}`);select.value=state[group];select.disabled=state.target==='joker'&&group!=='edition';
    }
    $('#modifier-limit').textContent=state.target==='joker'?'小丑牌不能添加增强和蜡封。负片提供额外小丑槽。':'同一张扑克牌可叠加增强、版本和蜡封各一种。';
    $('#modifier-summary').innerHTML=(['enhancement','edition','seal'] as Group[]).map(group=>`<div><span>${groups[group]}</span><p><strong>${find(group,state[group])?.name??'无'}</strong>${find(group,state[group])?.effect??'未添加此类修饰'}</p></div>`).join('');
    preview.setAttribute('aria-label',`${state.target==='joker'?'小丑牌':'扑克牌'}，${applied.map(m=>m.name).join('、')||'无修饰'}`);
    activeCards();
  }
  $('#modifier-target').addEventListener('change',()=>{
    state.target=$<HTMLSelectElement>('#modifier-target').value as Target;selectedKey='';
    if(state.target==='joker'){state.enhancement='none';state.seal='none';}else if(state.edition==='negative')state.edition='none';update();
  });
  for(const group of ['enhancement','edition','seal'] as Group[])$('#modifier-'+group).addEventListener('change',()=>{
    state[group]=$<HTMLSelectElement>('#modifier-'+group).value;selectedKey=`${group}:${state[group]}`;
    if(state.edition==='negative'){state.target='joker';state.enhancement='none';state.seal='none';}update();
  });
  $('#modifier-reset').addEventListener('click',()=>{Object.assign(state,{target:'playing',enhancement:'none',edition:'none',seal:'none'});selectedKey='';update();});
  root.querySelectorAll<HTMLButtonElement>('[data-modifier-preset]').forEach(button=>button.addEventListener('click',()=>{Object.assign(state,presets[Number(button.dataset.modifierPreset)].selection);selectedKey='';update();}));
  root.querySelectorAll<HTMLButtonElement>('[data-modifier-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.modifierFilter!;grid();}));
  $('#modifier-search').addEventListener('input',()=>{query=$<HTMLInputElement>('#modifier-search').value;grid();});
  $<HTMLInputElement>('#modifier-search').value=query;
  $('#material-preview').addEventListener('pointermove',event=>{
    if(root.closest('.stage')?.classList.contains('reduced-motion'))return;
    const el=$('#material-preview'),rect=el.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
    el.style.setProperty('--mx',`${x*100}%`);el.style.setProperty('--my',`${y*100}%`);
    const ownTilt=state.enhancement==='glass';
    el.style.setProperty('--rx',`${ownTilt?0:(y-.5)*-16}deg`);el.style.setProperty('--ry',`${ownTilt?0:(x-.5)*20}deg`);
  });
  $('#material-preview').addEventListener('pointerleave',()=>{
    const el=$('#material-preview');for(const key of ['--rx','--ry','--mx','--my'])el.style.removeProperty(key);
  });
  grid();update();
}
