import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createGame} from '../dist-sdk/engine.js';
import {createStrategyRunner} from '../dist-sdk/strategy.js';
import baseline from '../public/examples/basic-strategy.mjs';
const report={checks:[],ok:false};
const check=async(name,fn)=>{await fn();report.checks.push(name);console.log('PASS',name);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fresh=()=>createGame({seed:'SDK'});
try{
 await check('packaged engine and strategy import in Node without DOM',()=>{assert.equal(typeof globalThis.document,'undefined');assert.deepEqual(Object.keys(fresh()).sort(),['dispatch','getState']);});
 await check('independent instances, deterministic actions and detached snapshots',()=>{
  const a=fresh(),b=fresh();a.dispatch({type:'select_blind'});assert.equal(b.getState().phase,'blind_select');b.dispatch({type:'select_blind'});assert.deepEqual(a.getState(),b.getState());const s=a.getState();s.hand[0].rank=2;s.money=999;assert.notEqual(a.getState().money,999);
 });
 await check('save/restore keeps RNG, offers, phase and full continuation',()=>{
  const a=fresh();a.dispatch({type:'select_blind'});const checkpoint=a.getState(),b=createGame({state:checkpoint});checkpoint.money=-999;assert.deepEqual(a.getState(),b.getState());const action={type:'discard',cardIds:a.getState().hand.slice(0,3).map(c=>c.id)};a.dispatch(action);b.dispatch(action);assert.deepEqual(a.getState(),b.getState());assert.throws(()=>createGame({state:{schema:'balatro-run/1'}}));
 });
 await check('stale revision and invalid action are rejected atomically',()=>{
  const a=fresh(),before=a.getState();assert.equal(a.dispatch({type:'select_blind',expectedRevision:9}).error,'STALE_STATE');assert.deepEqual(a.getState(),before);assert.equal(a.dispatch({type:'buy',offerId:'no'}).ok,false);assert.deepEqual(a.getState(),before);
 });
 await check('injected strategy drives 24 blinds, shops and opening/picking pack to terminal (boosted fixture)',async()=>{
  const fixture=fresh().getState();Object.keys(fixture.handLevels).forEach(k=>fixture.handLevels[k]=500);fixture.money=200;
  const a=createGame({state:fixture}),seen=new Set();
  const strategy=s=>{seen.add(s.phase);if(s.phase==='playing')return {type:'play',cardIds:[...new Set([s.forcedCardId,...s.hand.map(c=>c.id)].filter(Boolean))].slice(0,5)};if(s.phase==='shop'){const p=s.packs.find(p=>p.kind==='buffoon');if(p&&s.money>=8&&s.jokers.length<s.limits.jokers)return {type:'open_pack',offerId:p.id};return {type:'next_round'};}if(s.phase==='pack'){const o=s.pack.options.find(o=>o.joker);return o&&s.jokers.length<s.limits.jokers?{type:'pick_pack',optionId:o.id}:{type:'skip_pack'};}return {type:s.phase==='cash_out'?'cash_out':'select_blind'};};
  const runner=createStrategyRunner(a,strategy,{intervalMs:0,maxSteps:500});const result=await runner.start();assert.equal(result.status,'completed');assert.equal(result.reason,'won');assert.equal(a.getState().elapsedRounds,24);for(const phase of ['blind_select','playing','shop','pack','cash_out'])assert.ok(seen.has(phase));runner.destroy();
 });
 await check('bundled baseline finishes an ordinary legal run without grants',async()=>{
  const a=createGame({seed:'BASELINE',startInMenu:true});const runner=createStrategyRunner(a,baseline,{intervalMs:0,maxSteps:300});const result=await runner.start();assert.equal(result.status,'completed');assert.ok(['won','lost'].includes(result.reason));assert.ok(result.steps>10);runner.destroy();
 });
 await check('single step, repeated starts and max step budget do not fork loops',async()=>{
  const a=fresh();let calls=0;const runner=createStrategyRunner(a,()=>{calls++;return {type:'new_run',seed:'NEXT'};},{intervalMs:1,maxSteps:4});assert.equal((await runner.step()).steps,1);const p=runner.start(),q=runner.start();const [x,y]=await Promise.all([p,q]);assert.equal(x.steps,4);assert.deepEqual(x,y);assert.equal(calls,5);assert.equal(x.reason,'max_steps');runner.destroy();
 });
 await check('null and terminal can run again; strategy can be replaced',async()=>{
  const a=fresh(),r=createStrategyRunner(a,()=>null,{intervalMs:0});assert.equal((await r.start()).reason,'no_action');r.setStrategy(()=>({type:'select_blind'}));assert.equal((await r.step()).steps,1);r.destroy();await assert.rejects(()=>r.start());
 });
 await check('stop cancels an awaited strategy; its late action never dispatches',async()=>{
  const a=fresh();let release,aborted=false;const r=createStrategyRunner(a,(_,{signal})=>new Promise(resolve=>{release=resolve;signal.addEventListener('abort',()=>aborted=true);}),{intervalMs:0});const p=r.start();await sleep(10);r.stop();await p;release({type:'select_blind'});await sleep(5);assert.equal(a.getState().revision,0);assert.equal(aborted,true);assert.equal(r.getStatus().status,'stopped');r.destroy();
 });
 await check('async decisions are recomputed after a human changes the state',async()=>{
  const a=fresh();let release,calls=0;const r=createStrategyRunner(a,()=>{if(++calls===1)return new Promise(resolve=>release=resolve);return null;},{intervalMs:0});const p=r.start();await sleep(5);a.dispatch({type:'select_blind'});release({type:'select_blind'});await p;assert.equal(calls,2);assert.equal(a.getState().revision,1);assert.equal(r.getStatus().lastResult,null);r.destroy();
 });
 await check('timeout, thrown errors, malformed and rejected actions report errors',async()=>{
  for(const [strategy,text] of [[()=>new Promise(()=>{}),'超时'],[()=>{throw new Error('boom');},'boom'],[()=>undefined,'操作对象'],[()=>({type:'buy',offerId:'missing'}),'INVALID_ACTION']]){const r=createStrategyRunner(fresh(),strategy,{decisionTimeoutMs:10,intervalMs:0});const s=await r.start();assert.equal(s.status,'error');assert.match(s.error,new RegExp(text));r.destroy();}
 });
 await check('two runners cannot own one game; stopping releases the lease',async()=>{
  const a=fresh(),r=createStrategyRunner(a,()=>new Promise(()=>{})),other=createStrategyRunner(a,()=>null);const p=r.start();await assert.rejects(()=>other.start(),/已有策略/);r.stop();await p;assert.equal((await other.start()).reason,'no_action');r.destroy();other.destroy();
 });
 report.ok=true;
}finally{await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('../artifacts/sdk-rules-report.json',import.meta.url),JSON.stringify(report,null,2));}
console.log(JSON.stringify({passed:report.checks.length,ok:report.ok}));
