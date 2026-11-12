import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from '@playwright/test';

const root=new URL('../',import.meta.url),url=process.env.BALATRO_DEMO_URL??'http://127.0.0.1:5192/';
const server=await createServer({root:root.pathname.replace(/^\/(\w:)/,'$1'),server:{middlewareMode:true,hmr:false},appType:'custom'});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=user-gesture-required']});
const report={url,checks:[],errors:[],ok:false};
const check=name=>{report.checks.push(name);console.log('PASS',name);};
await mkdir(new URL('artifacts/',root),{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1060}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{
  window.audioContexts=[];
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   constructor(options){super(options);this.starts=0;window.audioContexts.push(this);}
   createOscillator(){const oscillator=super.createOscillator(),start=oscillator.start.bind(oscillator);oscillator.start=(...args)=>{this.starts++;return start(...args);};return oscillator;}
   createDynamicsCompressor(){
    const compressor=super.createDynamicsCompressor(),meter=super.createAnalyser(),silence=super.createGain();
    meter.fftSize=4096;silence.gain.value=0;compressor.connect(meter).connect(silence).connect(this.destination);this.meter=meter;
    return compressor;
   }
  };
 });
 const states=()=>page.evaluate(()=>audioContexts.map(c=>c.state));
 const starts=()=>page.evaluate(()=>audioContexts.map(c=>c.starts));
 await page.goto(url,{waitUntil:'networkidle'});
 assert.equal(await page.locator('#g-music').getAttribute('aria-pressed'),'true');
 assert.deepEqual(await states(),[]);check('default music waits for interaction without creating an AudioContext');
 await page.locator('#g-start').click();
 await page.waitForFunction(()=>audioContexts.length===1&&audioContexts[0].state==='running'&&audioContexts[0].starts>0);
 await page.waitForTimeout(250);
 const rms=await page.evaluate(()=>{const data=new Float32Array(4096);audioContexts[0].meter.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);});
 assert.ok(rms>.0001);check('a real click unlocks the loop and its audio output is non-silent');
 await page.locator('.g-stage #g-collection').click();
 const input=await page.locator('#g-search').elementHandle();
 const before=await page.evaluate(()=>window.balatro.getState());
 await page.locator('#g-music-volume').fill('20');
 assert.equal(await input.evaluate(el=>el.isConnected),true);
 assert.deepEqual(await page.evaluate(()=>window.balatro.getState()),before);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('balatro-audio-v1')).musicVolume),.2);
 await page.locator('#g-music').click();await page.waitForFunction(()=>audioContexts[0].state==='suspended');
 check('volume and mute preserve the game, catalog nodes and saved preferences');
 await page.locator('#g-sound').click();await page.waitForFunction(()=>audioContexts[0].state==='running');
 const effectsBefore=await starts();
 await page.locator('#g-close-modal').click();await page.locator('[data-action="select_blind"]').first().click();
 await page.locator('.g-hand-card').first().click();await page.locator('[data-action="play"]').click();
 await page.waitForFunction(()=>!window.balatro.getState().busy);
 assert.ok((await starts())[0]>effectsBefore[0]);
 assert.equal(await page.locator('#g-music').getAttribute('aria-pressed'),'false');
 await page.locator('#g-sound').click();await page.waitForFunction(()=>audioContexts[0].state==='suspended');
 check('scoring effects still play with music muted; their switch remains independent');
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#g-music').getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('#g-music-volume').inputValue(),'20');
 await page.locator('#g-menu').click();assert.deepEqual(await states(),[]);
 await page.locator('#g-music').click();await page.waitForFunction(()=>audioContexts[0]?.state==='running');
 check('saved mute/volume survive reload; the music button can unlock playback');
 // Exercise page visibility and BFCache lifecycle events without freezing the test renderer.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>audioContexts[0].state==='suspended');
 const paused=await starts();await page.waitForTimeout(250);assert.deepEqual(await starts(),paused);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>audioContexts[0].state==='running');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 await page.waitForFunction(()=>audioContexts[0].state==='suspended');
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await page.waitForFunction(()=>audioContexts[0].state==='running');
 check('visibility and BFCache events pause scheduling and resume playback');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 check('music controls fit a narrow mobile viewport');
 await page.goto(new URL('sdk-demo.html',url).href,{waitUntil:'networkidle'});
 assert.deepEqual(await states(),[]);
 await page.locator('#music-a').click();await page.waitForFunction(()=>audioContexts[0]?.state==='running');
 await page.locator('#music-b').click();await page.waitForFunction(()=>audioContexts[1]?.state==='running');
 await page.evaluate(()=>{window.embedDemo.a.setOptions({music:false});window.embedDemo.a.setOptions({music:true});});
 await page.waitForFunction(()=>audioContexts[0].state==='running');
 await page.locator('#music-a').click();await page.waitForFunction(()=>audioContexts[0].state==='suspended');
 assert.equal((await states())[1],'running');
 await page.evaluate(()=>{window.embedDemo.a.destroy();window.embedDemo.b.destroy();});
 await page.waitForFunction(()=>audioContexts.every(c=>c.state==='closed'));
 const ended=await starts();await page.waitForTimeout(300);assert.deepEqual(await starts(),ended);
 check('SDK instances mix independently and destroy closes audio without further notes');
 const source=await server.transformRequest('/src/game-music.ts');
 const metrics=await page.evaluate(async code=>{
  const module=await import(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));
  const seconds=module.MUSIC_STEP_SECONDS*256,rate=22050;
  const audio=new OfflineAudioContext(2,Math.ceil((seconds+1)*rate),rate),gain=audio.createGain();gain.gain.value=.35;gain.connect(audio.destination);
  const voice=module.createMusicVoice(audio,gain);
  for(let step=0;step<256;step++)voice.schedule(step,.04+step*module.MUSIC_STEP_SECONDS);
  const buffer=await audio.startRendering(),data=buffer.getChannelData(0);
  let peak=0,sum=0;for(const sample of data){peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;}
  const around=at=>{const values=data.slice(Math.floor((at-.15)*rate),Math.ceil((at+.15)*rate));return Math.sqrt(values.reduce((s,v)=>s+v*v,0)/values.length);};
  const result={seconds,peak,rms:Math.sqrt(sum/data.length),loopBoundaryRms:around(seconds/2)};
  voice.destroy();return result;
 },source.code);
 assert.ok(metrics.peak>.01&&metrics.peak<.95);assert.ok(metrics.rms>.001);assert.ok(metrics.loopBoundaryRms>.001);
 report.music=metrics;check('two complete loops render without clipping or silence at the repeat boundary');
 assert.deepEqual(report.errors,[]);report.ok=true;
}finally{
 await writeFile(new URL('artifacts/audio-report.json',root),JSON.stringify(report,null,2));
 await browser.close();await server.close();
}
console.log(JSON.stringify({ok:report.ok,passed:report.checks.length,music:report.music}));
