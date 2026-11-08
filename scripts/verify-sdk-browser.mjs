import assert from 'node:assert/strict';
import {verifyCatalogInput,verifySeedInput} from './verify-catalog-input.mjs';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
const root=new URL('../',import.meta.url),sdk=new URL('dist-sdk/',root);
const report={checks:[],errors:[],failures:[],ok:false};
const check=name=>{report.checks.push(name);console.log('PASS',name);};
const mime={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.png':'image/png','.ttf':'font/ttf','.md':'text/plain'};
const vendor=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  let relative=path.startsWith('/vendor/game/')?path.slice('/vendor/game/'.length):path.startsWith('/media/')?'assets/'+path.slice('/media/'.length):null;
  if(relative===null||relative.includes('..')){res.writeHead(404);res.end();return;}
  const ext=relative.slice(relative.lastIndexOf('.'));res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type',mime[ext]??'application/octet-stream');res.end(await readFile(new URL(relative,sdk)));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>vendor.listen(0,'127.0.0.1',r));
const cdn=`http://127.0.0.1:${vendor.address().port}`;
const host=createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html><meta charset="utf-8"><title>Independent host</title><link rel="icon" href="data:,"><style>body{margin:20px;background:#f1f3f8;color:#26334b;font:16px system-ui}h1{margin:12px 0}#grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}#grid>div{min-width:0}section{background:hotpink!important}button{font:36px serif!important;color:hotpink!important}canvas{display:none!important}.g-hud{display:none!important}</style><h1>Independent strategy platform</h1><p>Unrelated host styles · two isolated game instances</p><input id="host-input" value="host keyboard"/><button id="host-button">Host button</button><div id="grid"><div id="a"><i id="keep">Existing host content</i></div><div id="b"></div></div><script type="module">import * as SDK from '${cdn}/vendor/game/sdk.js';window.SDK=SDK;window.a=SDK.mountBalatro(document.querySelector('#a'),{seed:'SDK-A',startInMenu:false});window.b=SDK.mountBalatro(document.querySelector('#b'),{seed:'SDK-B',startInMenu:false,assetBaseUrl:'${cdn}/media/'});window.ready=true;</script></html>`);});
await new Promise(r=>host.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1500,height:1050}});
 await p.addInitScript(()=>{
  const ids=new Set(),native=requestAnimationFrame,nativeCancel=cancelAnimationFrame;
  window.requestAnimationFrame=cb=>{let id=native(time=>{ids.delete(id);cb(time);});ids.add(id);return id;};
  window.cancelAnimationFrame=id=>{ids.delete(id);nativeCancel(id);};
  const resize=new Set(),mutation=new Set(),contexts=new Set();
  for(const [name,set] of [['ResizeObserver',resize],['MutationObserver',mutation]]){const Original=window[name];window[name]=class extends Original{observe(...args){if(args[0] instanceof Element&&args[0].matches('.g-stage,.g-stage-wrap'))set.add(this);return super.observe(...args);}disconnect(){set.delete(this);return super.disconnect();}};}
  const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const context=getContext.apply(this,args);if(args[0]==='webgl'&&context)contexts.add(context);return context;};
  let storage=0;for(const name of ['getItem','setItem','removeItem']){const original=Storage.prototype[name];Storage.prototype[name]=function(...args){storage++;return original.apply(this,args);};}
  window.resources=()=>({raf:ids.size,resize:resize.size,mutation:mutation.size,gl:[...contexts].filter(c=>!c.isContextLost()).length,fonts:document.fonts.size,storage});
 });
 const assetRequests=[];
 p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());if(r.url().endsWith('.png')||r.url().endsWith('.ttf'))assetRequests.push(r.url());});p.on('requestfailed',r=>report.failures.push(r.url()));
 await p.goto(`http://127.0.0.1:${host.address().port}/platform/nested/#platform`,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.ready);await p.waitForTimeout(120);
 assert.equal(await p.locator('.g-stage').count(),2);assert.equal(await p.locator('#keep').count(),1);assert.equal(await p.evaluate(()=>window.balatro),undefined);assert.equal(await p.title(),'Independent host');assert.equal(new URL(p.url()).hash,'#platform');assert.equal(await p.evaluate(()=>resources().storage),0);check('packaged SDK loads cross-origin under a nested base path without globals, storage or navigation changes');
 assert.ok(assetRequests.some(u=>u.includes('/vendor/game/assets/')));assert.ok(assetRequests.some(u=>u.includes('/media/')));
 assert.equal(await p.locator('#host-button').evaluate(el=>getComputedStyle(el).color),'rgb(255, 105, 180)');
 const styles=await p.locator('#a .g-stage').evaluate(el=>({bg:getComputedStyle(el).backgroundColor,font:getComputedStyle(el.querySelector('button')).fontSize,canvas:getComputedStyle(el.querySelector('canvas')).display}));
 assert.notEqual(styles.bg,'rgb(255, 105, 180)');assert.notEqual(styles.font,'36px');assert.notEqual(styles.canvas,'none');check('Shadow DOM isolates hostile host CSS; default and custom asset bases load images/fonts');
 const act=(which,action)=>p.evaluate(({which,action})=>window[which].dispatch(action),{which,action});
 const state=which=>p.evaluate(which=>window[which].getState(),which);
 const catalogBefore=await state('a'),otherBefore=await state('b');await p.locator('#a #g-collection').click();assert.equal(await p.locator('#a .g-catalog-grid article').count(),150);await verifyCatalogInput(p,'#a ');check('packaged SDK catalog preserves input/card nodes through native Chinese composition, edits and clearing');await p.locator('#a [data-catalog="consumables"]').click();assert.equal(await p.locator('#a .g-catalog-grid article').count(),52);await p.locator('#a [data-catalog="vouchers"]').click();assert.equal(await p.locator('#a .g-catalog-grid article').count(),32);assert.equal(await p.locator('#b [role="dialog"]').count(),0);await p.locator('#a #g-close-modal').click();assert.deepEqual(await state('a'),catalogBefore);assert.deepEqual(await state('b'),otherBefore);check('embedded game opens its own full catalog from the HUD without host controls or changes to either run');
 await act('a',{type:'select_blind'});assert.equal((await state('b')).phase,'blind_select');await act('b',{type:'select_blind'});assert.notDeepEqual((await state('a')).hand,(await state('b')).hand);check('two mounted instances own independent rules state and card IDs');
 const aBefore=await state('a'),bBefore=await state('b');await act('a',{type:'select_cards',cardIds:[aBefore.hand[0].id]});await act('b',{type:'select_cards',cardIds:[bBefore.hand[0].id]});
 await p.locator('#host-input').focus();await p.keyboard.press('d');assert.equal((await state('a')).discards,aBefore.discards);assert.equal((await state('b')).discards,bBefore.discards);
 await p.locator('#a .g-stage').focus();await p.keyboard.press('d');assert.equal((await state('a')).discards,aBefore.discards-1);assert.equal((await state('b')).discards,bBefore.discards);check('keyboard shortcuts act only in the focused game and leave host input/other instance untouched');
 const menuBefore=await state('a');await p.evaluate(()=>a.showMenu());assert.deepEqual(await state('a'),menuBefore);assert.equal(await p.locator('#a #g-resume').count(),1);await verifySeedInput(p,'#a ');await p.locator('#a #g-collection').click();assert.equal(await p.locator('#a .g-catalog-grid article').count(),150);await p.locator('#a #g-close-modal').click();await p.locator('#a #g-resume').click();assert.deepEqual(await state('a'),menuBefore);check('opening the view menu and its internal catalog preserves the engine checkpoint');
 await p.locator('#a .g-hand-card').first().click();assert.equal((await state('a')).selected.length,1);
 const drag=p.locator('#a .g-hand-card').first(),box=await drag.boundingBox(),id=(await state('a')).hand[0].id;await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x+box.width/2+90,box.y+box.height/2,{steps:8});await p.mouse.up();assert.notEqual((await state('a')).hand[0].id,id);check('pointer selection and dragging work inside the embedded view');
 // Load the strategy from its real module URL and execute it through the SDK.
 await p.evaluate(async url=>{const {default:strategy}=await import(url);window.runner=SDK.createStrategyRunner(a,strategy,{intervalMs:0,animate:false,maxSteps:300});},cdn+'/vendor/game/examples/basic-strategy.mjs');
 const result=await p.evaluate(()=>runner.start());assert.equal(result.status,'completed');assert.ok(['won','lost'].includes(result.reason));assert.ok(result.steps>3);check('an injected ES module strategy controls the visible game until terminal through dispatch');
 await p.evaluate(()=>{a.destroy();b.destroy();a.destroy();runner.destroy();});await p.waitForTimeout(120);const resources=await p.evaluate(()=>window.resources());assert.equal(await p.locator('.g-stage').count(),0);assert.equal(await p.locator('#keep').count(),1);assert.deepEqual(resources,{raf:0,resize:0,mutation:0,gl:0,fonts:0,storage:0});check('destroy releases RAF, observers, GPU contexts, font references and instance DOM');
 assert.equal((await act('a',{type:'new_run'})).error,'DESTROYED');
 await p.evaluate(()=>{window.a=SDK.mountBalatro(document.querySelector('#a'),{seed:'REMOUNT',startInMenu:false});let duplicate=false;try{SDK.mountBalatro(document.querySelector('#a'));}catch{duplicate=true;}window.duplicateRejected=duplicate;});assert.equal(await p.evaluate(()=>duplicateRejected),true);assert.equal((await state('a')).seed,'REMOUNT');check('destroyed handles reject actions; the same container remounts and rejects duplicate live mounts');
 await act('a',{type:'select_blind'});
 const pending=await p.evaluate(async()=>{const promise=a.dispatch({type:'play',cardIds:a.getState().hand.slice(0,5).map(c=>c.id)});const busy=a.getState().busy;a.destroy();const result=await promise;return {busy,ok:result.ok,revision:a.getState().revision};});assert.equal(pending.busy,true);assert.equal(pending.ok,true);assert.equal(pending.revision,2);await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>resources().raf),0);check('destroy during score animation settles the action and prevents later DOM/RAF work');
 // Standalone HTML shipped in the SDK directory works without Vite or the host demo.
 await p.goto(cdn+'/vendor/game/sdk-demo.html',{waitUntil:'networkidle'});assert.equal(await p.locator('.g-stage').count(),2);await p.locator('#step').click();await p.waitForFunction(()=>window.embedDemo.runner.getStatus().steps===1);assert.equal(await p.locator('#game-a .g-hand-card').count(),8);await p.mouse.move(5,5);await p.screenshot({path:fileURLToPath(new URL('artifacts/sdk-embedded.png',root)),fullPage:true});check('distributed plain HTML example mounts two games and runs strategy single-step');
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);report.ok=true;
}finally{await mkdir(new URL('artifacts/',root),{recursive:true});await writeFile(new URL('artifacts/sdk-browser-report.json',root),JSON.stringify(report,null,2));await browser.close();await new Promise(r=>host.close(r));await new Promise(r=>vendor.close(r));}
console.log(JSON.stringify({passed:report.checks.length,ok:report.ok}));
