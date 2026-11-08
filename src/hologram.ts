/** Shared pointer lighting for the large preview, comparison cards and future table prints. */
export function bindHolograms(root:HTMLElement,isReduced:()=>boolean) {
  let active:HTMLElement|null=null;
  function reset(){
    if(!active)return;
    for(const key of ['--hx','--hy','--mx','--my'])active.style.removeProperty(key);
    active.removeAttribute('data-tracking');active=null;
  }
  root.addEventListener('pointermove',event=>{
    const target=event.target as Element;
    // A preserve-3d mount can win hit-testing over a recessed child plane.
    const next=target.closest<HTMLElement>('.holographic')??target.closest<HTMLElement>('#material-preview,.comparison-card,.card-inner')?.querySelector<HTMLElement>('.holographic');
    if(isReduced()||!next){reset();return;}
    if(active!==next){reset();active=next;}
    // Measure the unrotated mount so a moving 3D silhouette cannot feed back into its own tilt.
    const mount=next.closest<HTMLElement>('#material-preview,.comparison-card,.card-inner')??next.parentElement!;
    const rect=mount.getBoundingClientRect();
    const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    const y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
    next.style.setProperty('--hx',String((x-.5)*2));next.style.setProperty('--hy',String((y-.5)*2));
    next.style.setProperty('--mx',`${x*100}%`);next.style.setProperty('--my',`${y*100}%`);
    next.dataset.tracking='true';
  });
  root.addEventListener('pointerleave',reset);
  return {reset};
}
