import {cp} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
// Keep the standalone SDK usable at any HTTP base path in the demo build too.
await cp(new URL('dist-sdk/',root),new URL('dist/',root),{recursive:true,filter:path=>!path.replaceAll('\\','/').includes('/types')&&!path.endsWith('package.json')});
