// FontFace declarations inside a shadow tree are not supported by every browser.
// Register a private family per asset URL, reference counted across live views.
const fonts=new Map<string,{face:FontFace;family:string;refs:number}>();
export function acquireFont(base:string){
 const url=new URL('fonts/VT323-Regular.ttf',base).href;
 let entry=fonts.get(url);
 if(!entry){
  let hash=2166136261;for(const c of url)hash=Math.imul(hash^c.charCodeAt(0),16777619);
  const family='BalatroSDKPixel'+(hash>>>0).toString(16),face=new FontFace(family,`url("${url}")`,{display:'swap'});
  entry={face,family,refs:0};fonts.set(url,entry);document.fonts.add(face);void face.load().catch(()=>{});
 }
 entry.refs++;const current=entry;let released=false;
 return {family:entry.family,release(){if(released)return;released=true;if(--current.refs===0){document.fonts.delete(current.face);fonts.delete(url);}}};
}
