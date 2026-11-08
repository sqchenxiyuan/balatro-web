// Reference artwork for the local lookdev review. Original game art remains copyrighted.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const plan=JSON.parse(await readFile(new URL('research/joker-download-plan.json',root),'utf8'));
await mkdir(new URL('public/assets/jokers/',root),{recursive:true});
let next=0,complete=0;
const results=[];
async function worker(){
  while(next<plan.length){
    const item=plan[next++];
    const dest=new URL(`public/assets/${item.file}`,root);
    let data;
    try{data=await readFile(dest);}catch{}
    if(!data){
      for(let attempt=0;attempt<3;attempt++){
        try{
          const response=await fetch(item.source_url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(25000)});
          if(!response.ok)throw new Error(`${response.status}: ${item.source_url}`);
          data=Buffer.from(await response.arrayBuffer());
          if(data.toString('ascii',0,3)==='GIF'){
            // Animated reference files are frozen at frame zero for the edition shader.
            const raw=new URL(`research/${item.id}-reference.gif`,root);await writeFile(raw,data);
            const python=process.env.BALATRO_PYTHON??'python';
            execFileSync(python,['-c','from PIL import Image; import sys; Image.open(sys.argv[1]).convert("RGBA").save(sys.argv[2])',fileURLToPath(raw),fileURLToPath(dest)]);
            data=await readFile(dest);
          }
          if(data.toString('hex',0,8)!=='89504e470d0a1a0a')throw new Error(`Expected PNG: ${item.id}`);
          await writeFile(dest,data);break;
        }catch(error){if(attempt===2)throw error;}
      }
    }
    results.push({...item,width:data.readUInt32BE(16),height:data.readUInt32BE(20),sha256:createHash('sha256').update(data).digest('hex')});
    if(++complete%25===0)console.log(`Collected ${complete}/150 Joker references`);
  }
}
await Promise.all(Array.from({length:5},worker));
results.sort((a,b)=>a.collection_number-b.collection_number);
await writeFile(new URL('public/assets/joker-catalog.json',root),JSON.stringify(results,null,2));
await writeFile(new URL('src/jokers.json',root),JSON.stringify(results.map(({id,name,collection_number,rarity,effect,cost_dollars,file})=>({id,name,collection_number,rarity,effect,cost_dollars,file})),null,2));
await writeFile(new URL('research/joker-art-manifest.json',root),JSON.stringify({retrieved_at:new Date().toISOString(),source:'https://balatrowiki.org/w/Jokers',copyright:'Original Balatro artwork: LocalThunk / Playstack. Reference material for this local lookdev, not original art or an open-source asset license.',items:results},null,2));
console.log(`Saved ${results.length} Joker images with provenance and hashes.`);
