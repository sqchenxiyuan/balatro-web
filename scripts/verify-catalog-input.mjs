import assert from 'node:assert/strict';

// Exercise Chromium's composition pipeline; plain fill() misses IME interruption.
export async function verifyCatalogInput(page,prefix=''){
 const search=page.locator(prefix+'#g-search'),cards=page.locator(prefix+'.g-catalog-grid>article');
 const total=await cards.count();
 await search.fill('');
 const refs=await search.evaluateHandle(input=>{
  const root=input.getRootNode(),modal=input.closest('.g-modal'),grid=modal.querySelector('.g-catalog-grid');
  const refs={input,root,modal,grid,top:modal.getBoundingClientRect().top,height:modal.getBoundingClientRect().height,cards:[...grid.children],background:root.querySelector('#g-background'),blur:0,commits:0};
  input.addEventListener('blur',()=>refs.blur++);
  input.addEventListener('compositionend',()=>refs.commits++);
  return refs;
 });
 const visible=()=>cards.evaluateAll(rows=>rows.filter(row=>!row.hidden).length);
 const stable=async()=>assert.equal(await refs.evaluate(r=>r.input.isConnected&&r.root.querySelector('#g-search')===r.input&&r.input.closest('.g-modal')===r.modal&&r.root.querySelector('#g-background')===r.background&&r.cards.every((card,i)=>r.grid.children[i]===card)&&r.root.activeElement===r.input&&r.blur===0&&Math.abs(r.modal.getBoundingClientRect().top-r.top)<1&&Math.abs(r.modal.getBoundingClientRect().height-r.height)<1),true,'typing must preserve input focus, modal, cards and background nodes');
 const cdp=await page.context().newCDPSession(page);
 try{
  for(const [query,name] of [['xiaochou','小丑'],['xc','小丑'],['XIAO CHOU','小丑'],['xiǎo chǒu','小丑'],['tanlan','贪婪小丑'],['tlxc','贪婪小丑'],['beilv','小丑']]){
   await search.fill(query);await stable();
   assert.ok(await cards.evaluateAll((rows,name)=>rows.some(row=>!row.hidden&&row.querySelector('strong').textContent===name),name),'pinyin query '+query+' must find '+name);
  }
  await search.fill('');await search.pressSequentially('JoKeR');await stable();
  const english=await visible();assert.ok(english>0&&english<total);
  await search.press('Home');await search.press('Delete');await search.pressSequentially('J');
  assert.equal(await search.inputValue(),'JoKeR');assert.equal(await search.evaluate(el=>el.selectionStart),1);await stable();
  await search.fill('');assert.equal(await visible(),total);
  for(const text of ['xiao','xiaochou']){
   await cdp.send('Input.imeSetComposition',{text,selectionStart:text.length,selectionEnd:text.length});
   assert.equal(await search.inputValue(),text);await stable();
   assert.equal(await visible(),total,'unfinished pinyin must not filter the list');
  }
  assert.equal(await search.evaluate(el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',isComposing:true,bubbles:true,cancelable:true}))),true,'IME Escape belongs to the input method');
  await stable();assert.equal(await page.locator(prefix+'[role="dialog"]').count(),1);
  await cdp.send('Input.insertText',{text:'小丑'});
  assert.equal(await search.inputValue(),'小丑');await stable();assert.ok(await refs.evaluate(r=>r.commits)>0);
  assert.ok(await visible()>0&&await visible()<total,'committed Chinese must filter the catalog');
  await search.fill('');await cdp.send('Input.imeSetComposition',{text:'zhong',selectionStart:5,selectionEnd:5});
  await cdp.send('Input.imeSetComposition',{text:'',selectionStart:0,selectionEnd:0});
  assert.equal(await search.inputValue(),'');assert.equal(await visible(),total);await stable();
  await search.fill('__no_card_matches_this__');assert.equal(await visible(),0);
  assert.equal(await page.locator(prefix+'#g-catalog-empty').isVisible(),true);
  await search.fill('');assert.equal(await visible(),total);await stable();
  assert.equal(await page.locator(prefix+'#g-catalog-empty').isVisible(),false);
 }finally{await cdp.detach();await refs.dispose();}

 for(const [tab,queries,name] of [
  ['consumables',['nvjisi','njs','nǚ jì sī'],'女祭司'],
  ['vouchers',['duocichongzhi','dccz','duo ci chong zhi'],'多次重掷'],
  ['vouchers',['tiaoseban','tsb'],'调色板'],
 ]){
  await page.locator(prefix+'[data-catalog="'+tab+'"]').click();
  for(const query of queries){
   await page.locator(prefix+'#g-search').fill(query);
   assert.ok(await cards.evaluateAll((rows,name)=>rows.some(row=>!row.hidden&&row.querySelector('strong').textContent===name),name),'pinyin query '+query+' must find '+name);
  }
 }
 await page.locator(prefix+'[data-catalog="jokers"]').click();
}

export async function verifySeedInput(page,prefix=''){
 const seed=page.locator(prefix+'#g-seed'),ref=await seed.elementHandle();
 const cdp=await page.context().newCDPSession(page);
 try{
  await seed.fill('');await cdp.send('Input.imeSetComposition',{text:'zhongwen',selectionStart:8,selectionEnd:8});
  assert.equal(await ref.evaluate(el=>el.isConnected&&el.getRootNode().activeElement===el),true);
  await cdp.send('Input.insertText',{text:'中文种子'});assert.equal(await seed.inputValue(),'中文种子');
  assert.equal(await ref.evaluate(el=>el.isConnected&&el.getRootNode().activeElement===el),true);
  await seed.fill('');
 }finally{await cdp.detach();await ref.dispose();}
}
