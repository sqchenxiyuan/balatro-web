import type {PackKind} from './pack-types';
export type {PackKind} from './pack-types';
export {packKinds} from './pack-types';
const packData={
  celestial:{name:'天体包'},arcana:{name:'幻术包'},standard:{name:'标准包'},
  buffoon:{name:'丑角包'},spectral:{name:'幻灵包'},
};
const assets=`${import.meta.env.BASE_URL}assets/packaging/`;

/** Pixel-printed wrapper planes, with modest depth for the fold and central motif. */
export function packFace(kind:PackKind,assetBase=assets){
  const sprite=(part:string)=>`<img class="pouch-pixels" src="${assetBase}${kind}-${part}.png" alt="" draggable="false"/>`;
  return `<div class="booster-pouch pack-${kind}" role="img" aria-label="${packData[kind].name}像素卡包">
    <div class="pouch-back"></div><div class="pouch-gusset"></div>
    <div class="pouch-front">${sprite('body')}</div>
    <div class="pouch-mouth"></div>
    <div class="pouch-emblem">${sprite('emblem')}</div>
    <div class="pouch-seal pouch-seal-bottom">${sprite('seal')}</div><div class="pouch-seal pouch-seal-top">${sprite('seal')}</div>
  </div>`;
}

/** Stable mounts avoid transformed faces feeding their own pointer measurements. */
export function bindSurfaceLight(root:HTMLElement,isReduced:()=>boolean){
  let active:HTMLElement|null=null;
  const keys=['--sx','--sy','--mx','--my'];
  function reset(){if(active){keys.forEach(key=>active!.style.removeProperty(key));active.removeAttribute('data-tracking');active=null;}}
  const lifecycle=new AbortController();
  root.addEventListener('pointermove',event=>{
    const target=event.target as Element;
    const mount=target.closest<HTMLElement>('#material-preview,.comparison-card,.pack-offer,.catalog-art,.card-inner');
    const next=target.closest<HTMLElement>('.booster-pouch,.card-surface.foil,.card-surface.holographic,.card-surface.polychrome,.card-surface.negative,.card-surface.glass')??mount?.querySelector<HTMLElement>('.booster-pouch,.foil,.holographic,.polychrome,.negative,.glass');
    if(isReduced()||!next){reset();return;}
    if(active!==next){reset();active=next;}
    const rect=(mount??next.parentElement!).getBoundingClientRect();
    const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
    next.style.setProperty('--sx',String((x-.5)*2));next.style.setProperty('--sy',String((y-.5)*2));
    next.style.setProperty('--mx',`${x*100}%`);next.style.setProperty('--my',`${y*100}%`);next.dataset.tracking='true';
  },{signal:lifecycle.signal});
  root.addEventListener('pointerleave',reset,{signal:lifecycle.signal});
  return {reset,destroy(){lifecycle.abort();reset();}};
}
