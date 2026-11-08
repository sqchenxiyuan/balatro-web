// Local research references, with original attribution retained.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const groups={tarot:['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Justice','The Hermit','The Wheel of Fortune','Strength','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World'],planet:['Pluto','Mercury','Uranus','Venus','Saturn','Jupiter','Earth','Mars','Neptune','Planet X','Ceres','Eris'],spectral:['Familiar','Grim','Incantation','Talisman','Aura','Wraith','Sigil','Ouija','Ectoplasm','Immolate','Ankh','Deja Vu','Hex','Trance','Medium','Cryptid','The Soul','Black Hole']};
const items=[];
await mkdir(new URL('public/assets/consumables/',root),{recursive:true});
for(const [family,names] of Object.entries(groups)){
 const html=await readFile(new URL(`research/${family}-page.html`,root),'utf8');
 const refs=[...html.matchAll(/<img[^>]+srcset="([^"]+)"[^>]*data-file-width="142"/g)].map(m=>m[1].split(' ')[0]);
 for(const en of names){
  const filename=en.replaceAll(' ','_')+'.png',ref=refs.find(x=>x.split('?')[0].endsWith('/'+filename));
  if(!ref)throw new Error('Image missing for '+en);
  const id=en.replace(/^The /,'').toLowerCase().replaceAll(' ','_');
  items.push({id,en,family,file:`consumables/${id}.png`,source_url:new URL(ref,'https://balatrowiki.org').href,source_page:`https://balatrowiki.org/w/${family[0].toUpperCase()+family.slice(1)}_cards`});
 }
}
let cursor=0;
await Promise.all(Array.from({length:5},async()=>{while(cursor<items.length){
 const item=items[cursor++],dest=new URL(`public/assets/${item.file}`,root);let data;try{data=await readFile(dest);}catch{}
 if(!data){for(let attempt=0;attempt<3;attempt++){try{const r=await fetch(item.source_url,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error(String(r.status));data=Buffer.from(await r.arrayBuffer());if(data.toString('hex',0,8)!=='89504e470d0a1a0a')throw new Error('Not a PNG');await writeFile(dest,data);break;}catch(e){if(attempt===2)throw e;}}}
 item.width=data.readUInt32BE(16);item.height=data.readUInt32BE(20);item.sha256=createHash('sha256').update(data).digest('hex');
}}));
await writeFile(new URL('research/consumable-art-manifest.json',root),JSON.stringify({retrieved_at:new Date().toISOString(),copyright:'Original Balatro artwork: LocalThunk / Playstack. Local research references; no open-source asset license is claimed.',items},null,2));
console.log(`Saved ${items.length} consumable references.`);
