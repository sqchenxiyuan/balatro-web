import {readFile,writeFile,copyFile,readdir,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const root=new URL('../',import.meta.url),out=new URL('dist-sdk/',root);
const pkg={name:'@game-rebuild/balatro',version:'0.2.0',description:'Embeddable Balatro gameplay recreation, DOM-free engine and trusted strategy runner',type:'module',license:'UNLICENSED',sideEffects:false,
 exports:{'.':{types:'./types/sdk.d.ts',import:'./sdk.js'},'./engine':{types:'./types/run-api.d.ts',import:'./engine.js'},'./strategy':{types:'./types/strategy.d.ts',import:'./strategy.js'},'./assets/*':'./assets/*'},
 files:['*.js','chunks','types','assets','examples','sdk-demo.html','README.md','NOTICE.md','THIRD_PARTY_NOTICES.md']};
await writeFile(new URL('package.json',out),JSON.stringify(pkg,null,2)+'\n');
// NodeNext consumers also need explicit .js specifiers in the declaration graph.
async function fixDeclarations(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=new URL(item.name,dir);if(item.isDirectory())await fixDeclarations(new URL(item.name+'/',dir));else if(item.name.endsWith('.d.ts'))await writeFile(path,(await readFile(path,'utf8')).replace(/(from\s+['"]|import\(['"])(\.\.?\/[^'"]+)(['"])/g,(_,a,b,c)=>a+b+(/\.[a-z]+$/i.test(b)?'':'.js')+c));}}
await fixDeclarations(new URL('types/',out));
await copyFile(new URL('src/game-content.json',root),new URL('types/game-content.json',out));
const html=(await readFile(new URL('sdk-demo.html',root),'utf8')).replace("'./src/sdk.ts'","'./sdk.js'");
await writeFile(new URL('sdk-demo.html',out),html);
await mkdir(new URL('artifacts/',root),{recursive:true});
await copyFile(new URL('docs/balatro/21-embeddable-sdk.md',root),new URL('README.md',out));
const pinyinPackage=pathToFileURL(createRequire(import.meta.url).resolve('pinyin-pro/package.json'));
await writeFile(new URL('THIRD_PARTY_NOTICES.md',out),'# Bundled dependencies\n\n## pinyin-pro\n\n'+await readFile(new URL('LICENSE',pinyinPackage),'utf8'));
await writeFile(new URL('NOTICE.md',out),'Gameplay recreation prototype. Card reference artwork and names belong to LocalThunk / Playstack. This package does not grant rights to redistribute the original artwork. Replace assets or obtain permission before public distribution. No official affiliation.\n');
console.log('SDK: dist-sdk/ (ES modules, declarations, assets, standalone demo)');
