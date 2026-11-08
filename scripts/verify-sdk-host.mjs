import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const report={url:process.env.BALATRO_DEMO_URL??'http://127.0.0.1:5192/',checks:[],errors:[],ok:false};
const browser=await chromium.launch({channel:'chrome',headless:true});
const check=name=>{report.checks.push(name);console.log('PASS',name);};
try{
 const p=await browser.newPage({viewport:{width:1440,height:1100}});p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(report.url,{waitUntil:'networkidle'});assert.equal(await p.locator('.g-stage').count(),1);assert.equal(await p.locator('#strategy-panel,#g-strategy,a[href="#materials"]').count(),0);check('main page is the regular playable game without SDK or strategy demo controls');
 await p.goto(report.url+'sdk-demo.html',{waitUntil:'networkidle'});await p.locator('#strategy-panel').evaluate(el=>el.open=true);
 await p.evaluate(()=>window.embedDemo.a.dispatch({type:'new_run',seed:'HOST-STRATEGY'}));
 await p.locator('#strategy-source').fill(`export default async function(s,{signal}) {if(signal.aborted)return null;if(s.phase==='blind_select')return {type:'select_blind'};return null;}`);
 await p.locator('#step').click();await p.waitForFunction(()=>window.embedDemo.a.getState().phase==='playing');await p.waitForFunction(()=>document.querySelector('#strategy-status').textContent.includes('1 步'));assert.equal(await p.locator('#game-a .g-hand-card').count(),8);check('pasting an async ES module in the shell controls the SDK through the step button');
 await p.locator('#strategy-source').fill(`export default (s,{signal})=>new Promise(resolve=>setTimeout(()=>resolve({type:'discard',cardIds:[s.hand[0].id]}),800));`);
 const before=await p.evaluate(()=>window.embedDemo.a.getState());await p.locator('#auto').click();await p.waitForFunction(()=>document.querySelector('#strategy-status').textContent.includes('running'));await p.locator('#stop').click();await p.waitForTimeout(900);assert.deepEqual(await p.evaluate(()=>window.embedDemo.a.getState()),before);check('shell stop cancels a pending decision and does not dispatch its late result');
 await p.locator('#strategy-source').fill(`export default ()=>{throw new Error('HOST_TEST_ERROR');}`);await p.locator('#step').click();await p.waitForFunction(()=>document.querySelector('#strategy-status').textContent.includes('HOST_TEST_ERROR'));assert.equal((await p.evaluate(()=>window.embedDemo.a.getState())).revision,before.revision);check('strategy errors are shown by the shell without mutating the game or causing page errors');
 assert.deepEqual(report.errors,[]);report.ok=true;
}finally{await writeFile(new URL('../artifacts/sdk-host-report.json',import.meta.url),JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({ok:report.ok,passed:report.checks.length}));
