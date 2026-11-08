import {customPinyin,pinyin} from 'pinyin-pro';

// Game terminology is not always covered by the general phrase dictionary.
customPinyin({'重掷':'chong zhi','重随':'chong sui','重触发':'chong chu fa','重抽':'chong chou'});

const indexes=new Map<string,string>();

export function normalizeCatalogQuery(text:string):string{
 return text.toLowerCase().normalize('NFD').replace(/u\u0308/g,'v')
  .replace(/\p{M}/gu,'').replace(/[\s'’_-]+/g,'');
}

/** Build each catalog entry once; no transliteration or DOM replacement while typing. */
export function catalogSearchIndex(name:string,english:string,description:string):string{
 const key=JSON.stringify([name,english,description]),cached=indexes.get(key);
 if(cached!==undefined)return cached;
 const aliases=[name,english,description].flatMap(text=>{
  const syllables=pinyin(text,{toneType:'none',type:'array',nonZh:'consecutive',v:true});
  return [text,syllables.join(''),syllables.map(part=>part[0]??'').join('')].map(normalizeCatalogQuery);
 });
 const index=[...new Set(aliases)].join('\n');indexes.set(key,index);return index;
}
