import assert from 'node:assert/strict';
import {verifyCatalogInput,verifySeedInput} from './verify-catalog-input.mjs';
import {chromium} from '@playwright/test';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),base=process.env.BALATRO_DEMO_URL??'http://127.0.0.1:5192/';
const server=await createServer({root:root.pathname.replace(/^\/(\w:)/,'$1'),server:{middlewareMode:true},appType:'custom'});
const browser=await chromium.launch({channel:'chrome',headless:true}),report={url:base,checks:[],errors:[],failedRequests:[],ok:false};
const check=t=>{report.checks.push(t);console.log('PASS',t);};
await mkdir(new URL('artifacts/',root),{recursive:true});
try{
 const E=await server.ssrLoadModule('/src/run-engine.ts');
 const p=await browser.newPage({viewport:{width:1440,height:1060}});
 p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});p.on('requestfailed',r=>{const abortedIcon=new URL(r.url()).pathname.endsWith('/favicon.svg')&&r.failure()?.errorText==='net::ERR_ABORTED';if(!abortedIcon)report.failedRequests.push(r.url());});
 // Hash-triggered page reloads may cancel a prior favicon; HTTP errors still fail below.
 assert.equal((await p.request.get(new URL('favicon.svg',base).href)).status(),200);
 const state=()=>p.evaluate(()=>window.balatro.getState()),act=a=>p.evaluate(a=>window.balatro.dispatch(a),a);
 const shot=async name=>{await p.mouse.move(20,20);if(name==='pack')await p.waitForTimeout(350);await p.locator('.g-stage').screenshot({path:new URL('artifacts/game-'+name+'.png',root).pathname.replace(/^\/(\w:)/,'$1')});};
 await p.goto(base+'#play',{waitUntil:'networkidle'});await p.waitForTimeout(300);
 assert.equal(await p.locator('[data-deck]').count(),15);assert.equal(await p.locator('#g-stake option').count(),8);await shot('setup');
 await verifySeedInput(p);check('seed input preserves native Chinese composition and focus');
 const setupBefore=await state();await p.locator('#g-seed').fill('FIRSTPLAY');await p.locator('.g-stage #g-collection').click();assert.equal(await p.locator('.g-catalog-grid article').count(),150);await verifyCatalogInput(p);check('catalog typing keeps the input and card nodes; native IME commit/cancel, caret edits and empty results work');await p.locator('[data-catalog="consumables"]').click();assert.equal(await p.locator('.g-catalog-grid article').count(),52);await p.locator('[data-catalog="vouchers"]').click();assert.equal(await p.locator('.g-catalog-grid article').count(),32);await p.locator('#g-close-modal').click();assert.equal(await p.locator('#g-seed').inputValue(),'FIRSTPLAY');assert.deepEqual(await state(),setupBefore);check('in-game menu opens all 15 decks and 8 stakes; 150/52/32 catalog preserves the pending seed and engine state');
 await p.locator('#g-seed').fill('FIRSTPLAY');await p.locator('#g-start').click();assert.equal((await state()).phase,'blind_select');await shot('blinds');
 await p.locator('[data-action="select_blind"]').first().click();let s=await state();assert.equal(s.money,4);assert.equal(s.hand.length,8);assert.equal(await p.locator('.g-hand-card').count(),8);assert.equal(await p.locator('.g-joker').count(),0);check('real fresh run enters Small Blind with $4, eight cards and no pre-granted Jokers');
 await shot('table');
 const firstId=s.hand[0].id;await p.locator('[data-card="'+firstId+'"]').click();assert.deepEqual((await state()).selected,[firstId]);await p.locator('[data-card="'+firstId+'"]').click();assert.equal((await state()).selected.length,0);
 const first=p.locator('[data-card="'+firstId+'"]'),box=await first.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+120,box.y+box.height/2,{steps:12});await p.mouse.up();assert.notEqual((await state()).hand[0].id,firstId);check('pointer selection toggles; dragging changes the actual hand order');
 await p.locator('#g-show-deck').click();assert.equal(await p.locator('.g-mini-card').count(),52);await p.locator('#g-close-modal').click();
 await p.locator('.g-hand-card').first().click();const catalogBefore=await state();await p.locator('.g-stage #g-collection').click();assert.equal(await p.locator('.g-catalog-grid article').count(),150);await p.locator('#g-modal-title').click();await p.keyboard.press('d');await p.keyboard.press('Enter');await p.locator('#g-modal-title').click({button:'right'});assert.deepEqual(await state(),catalogBefore);await p.locator('#g-search').fill('Joker');await p.keyboard.press('Escape');assert.equal(await p.locator('[role="dialog"]').count(),0);assert.deepEqual(await state(),catalogBefore);await p.locator('#g-run-info').click();assert.equal(await p.locator('.g-hand-levels>div').count(),12);await p.locator('#g-close-modal').click();await act({type:'clear_selection'});check('HUD catalog opens during a run; modal blocks game shortcuts and Escape closes from search without altering the run');
 s=await state();const before=structuredClone(s),bad=await act({type:'play',cardIds:['fake']});assert.equal(bad.ok,false);assert.deepEqual(await state(),before);check('public API rejects invalid moves atomically');
 function bestHand(s){let best={score:-1,ids:[]};function visit(start,ids){if(ids.length&&(!s.forcedCardId||ids.includes(s.forcedCardId))){const r=E.dispatchRun(s,{type:'play',cardIds:ids});if(r.ok&&r.state.lastScore>best.score)best={score:r.state.lastScore,ids:[...ids]};}if(ids.length===5)return;for(let i=start;i<s.hand.length;i++)visit(i+1,[...ids,s.hand[i].id]);}visit(0,[]);return best;}
 let animated=false;
 while((await state()).phase==='playing'){
  s=await state();const best=bestHand(s);assert.ok(best.ids.length);
  if(s.discards>0&&best.score<Math.min(200,(s.target-s.total)/s.hands*1.5)){
   const ids=s.hand.filter(c=>!best.ids.includes(c.id)).slice(0,5).map(c=>c.id);
   if(ids.length){assert.equal((await act({type:'discard',cardIds:ids})).ok,true);continue;}
  }
  if(!animated){for(const id of best.ids)await p.locator('[data-card="'+id+'"]').click();const pending=p.locator('[data-action="play"]').click();await pending;await p.waitForFunction(()=>window.balatro.getState().busy);assert.equal((await act({type:'discard',cardIds:[s.hand[0].id]})).error,'BUSY');await p.waitForFunction(()=>!window.balatro.getState().busy);animated=true;}
  else assert.equal((await act({type:'play',cardIds:best.ids,animate:false})).ok,true);
 }
 s=await state();assert.equal(s.phase,'cash_out');assert.ok(s.total>=s.target);await shot('cashout');check('ordinary seed wins Small Blind through legal hands; score animation locks concurrent actions');
 const amount=s.cashout.filter(l=>!l.label.includes('已入账')).reduce((n,l)=>n+l.amount,0),money=s.money;
 await p.locator('[data-action="cash_out"]').click();s=await state();assert.equal(s.phase,'shop');assert.equal(s.money,money+amount);assert.equal(s.packs[0].kind,'buffoon');await shot('shop');
 const pack=s.packs[0];await p.locator('[data-pack="'+pack.id+'"]').click();s=await state();assert.equal(s.phase,'pack');assert.equal(s.pack.options.length,2);await p.waitForFunction(()=>!window.balatro.getState().busy);assert.equal(await p.locator('.pack-unseal').count(),0);await shot('pack');await p.locator('[data-pick]').first().click();s=await state();assert.equal(s.phase,'shop');assert.equal(s.jokers.length,1);assert.equal(await p.locator('.g-joker').count(),1);check('cash-out credits actual money; first-shop Buffoon purchase and UI pick adds a real Joker');
 await p.locator('#g-menu').click();assert.equal((await state()).phase,'shop');assert.equal(await p.locator('#g-resume').count(),1);await p.locator('#g-resume').click();const saved=await state();await p.waitForTimeout(300);await p.reload({waitUntil:'networkidle'});await p.locator('#g-resume').click();assert.deepEqual(await state(),saved);check('menu and page reload resume the exact current run, without unlock progression');
 await p.locator('[data-action="next_round"]').click();await p.locator('[data-action="select_blind"][data-index="1"]').click();assert.equal((await state()).blindIndex,1);assert.equal((await state()).phase,'playing');assert.equal(new Set((await state()).hand.map(c=>c.id)).size,8);check('shop exit enters the next real blind with the same permanent deck');
 const apiCopy=await p.evaluate(()=>{const s=window.balatro.getState();s.money=-123;return window.balatro.getState().money;});assert.notEqual(apiCopy,-123);assert.deepEqual(await p.evaluate(()=>Object.keys(window.balatro).sort()),['dispatch','getState']);
 // Compare independent instances in a browser Worker; the engine must not depend on document/window/localStorage.
 const workerResult=await p.evaluate(async moduleURL=>{
  const source=`import {createGame} from '${moduleURL}';onmessage=()=>{const a=createGame({seed:'WORKER'}),b=createGame({seed:'WORKER'});a.dispatch({type:'select_blind'});b.dispatch({type:'select_blind'});const ids=a.getState().hand.slice(0,2).map(c=>c.id);a.dispatch({type:'discard',cardIds:ids});b.dispatch({type:'discard',cardIds:ids});postMessage({same:JSON.stringify(a.getState())===JSON.stringify(b.getState()),phase:a.getState().phase,allUnlocked:a.getState().allUnlocked});};`;
  const worker=new Worker(URL.createObjectURL(new Blob([source],{type:'text/javascript'})),{type:'module'});return await new Promise((resolve,reject)=>{worker.onmessage=e=>{resolve(e.data);worker.terminate();};worker.onerror=e=>{reject(new Error(e.message));worker.terminate();};worker.postMessage('run');});
 },new URL(process.env.BALATRO_ENGINE_MODULE??'src/run-api.ts',base).href);assert.deepEqual(workerResult,{same:true,phase:'playing',allUnlocked:true});check('DOM-free instances run deterministically inside a browser Worker');
 await p.setViewportSize({width:900,height:750});await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot('compact');check('stage scales to a compact viewport without horizontal overflow');
 await p.goto(base+'#materials',{waitUntil:'networkidle'});await p.waitForSelector('#material-preview');assert.ok(await p.locator('#material-preview').count());await p.locator('a[href="#play"]').first().click();await p.waitForSelector('#g-start');check('game and existing materials lab remain reachable from each other');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedRequests,[]);report.ok=true;console.log(JSON.stringify({ok:true,passed:report.checks.length}));
}finally{await writeFile(new URL('artifacts/game-browser-report.json',root),JSON.stringify(report,null,2));await browser.close();await server.close();}
