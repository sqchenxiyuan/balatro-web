import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.BALATRO_DEMO_URL??'http://127.0.0.1:5192/';
const root=new URL('../',import.meta.url);
const previews=new URL('research/previews/',root);
await mkdir(previews,{recursive:true});
const report={url:base,at:new Date().toISOString(),ok:false,checks:[],errors:[],failedRequests:[],externalRequests:[]};
// Compare rendered RGB pixels, rather than class names or compressed PNG bytes.
async function difference(page,a,b){
  return page.evaluate(async([a,b])=>{
    const decode=async data=>{const im=new Image();im.src=`data:image/png;base64,${data}`;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const x=await decode(a),y=await decode(b);let total=0,changed=0;
    for(let i=0;i<x.length;i+=4){const d=(Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]))/3;total+=d;if(d>5)changed++;}
    return {mean:total/(x.length/4),changed:changed/(x.length/4)};
  },[a.toString('base64'),b.toString('base64')]);
}
const browser=await chromium.launch({channel:'chrome',headless:true});
let page;
try{
  page=await browser.newPage({viewport:{width:1440,height:1120},deviceScaleFactor:1});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  page.on('request',r=>{if(!r.url().startsWith(new URL(base).origin)&&!r.url().startsWith('data:'))report.externalRequests.push(r.url());});
  const snapshot=()=>page.evaluate(()=>window.balatro.getState());
  const act=action=>page.evaluate(a=>window.balatro.dispatch(a),action);
  const scene=async name=>{await page.locator(`[data-scene="${name}"]`).click();await page.waitForTimeout(240);};
  const shot=async name=>{await page.mouse.move(20,20);await page.screenshot({path:new URL(name,previews).pathname.replace(/^\/([A-Z]:)/,'$1'),fullPage:true});await page.locator('#stage').screenshot({path:new URL(`stage-${name}`,previews).pathname.replace(/^\/([A-Z]:)/,'$1')});};
  const check=(name)=>{report.checks.push(name);console.log('PASS',name);};
  await page.goto(base+'#table',{waitUntil:'networkidle'});await page.waitForTimeout(200);
  const isolation=await page.addStyleTag({content:'#game-layer,#effects,.crt,.vignette,.sample-stamp{visibility:hidden!important}'});
  const bg1=await page.locator('#background').screenshot();await page.waitForTimeout(1500);const bg2=await page.locator('#background').screenshot();
  report.backgroundMotion=await difference(page,bg1,bg2);report.backgroundRenderer=await page.locator('#background').getAttribute('data-renderer');
  assert.ok(report.backgroundMotion.mean>3&&report.backgroundMotion.changed>.2);check('Background visibly flows in actual rendered frames over 1.5 seconds');
  await page.locator('#reduced-toggle').click();await page.waitForTimeout(100);
  const still1=await page.locator('#background').screenshot();await page.waitForTimeout(300);const still2=await page.locator('#background').screenshot();
  assert.equal((await difference(page,still1,still2)).mean,0);await page.locator('#reduced-toggle').click();await isolation.evaluate(el=>el.remove());check('Reduced motion freezes the background without jumping to a new pattern');
  assert.deepEqual(await page.evaluate(()=>Object.keys(window.balatro).sort()),['dispatch','getState']);
  const copy=await page.evaluate(()=>{const s=window.balatro.getState();s.hand[0].rank=999;return window.balatro.getState().hand[0].rank;});assert.equal(copy,10);check('Only getState / dispatch; returned state is detached');
  await shot('01-table.png');
  await page.locator('[data-cardid="h-10"]').click();await page.locator('[data-cardid="c-10"]').click();
  assert.equal((await snapshot()).selected.length,2);assert.equal(await page.locator('#hand-name').textContent(),'对子');check('Mouse selection lifts cards and previews poker hand');
  await shot('02-selection.png');
  await page.locator('#stage').click({button:'right',position:{x:750,y:350}});assert.equal((await snapshot()).selected.length,0);check('Right-click clears selection');
  const before=await snapshot();const bad=await act({type:'select_cards',cardIds:before.hand.slice(0,6).map(c=>c.id)});assert.equal(bad.ok,false);assert.deepEqual(await snapshot(),before);check('Invalid selection leaves state and revision unchanged');
  const first=await page.locator('[data-cardid="h-10"]').boundingBox(),last=await page.locator('[data-cardid="c-3"]').boundingBox();
  await page.mouse.move(first.x+30,first.y+50);await page.mouse.down();await page.mouse.move(last.x+90,last.y+35,{steps:16});await page.mouse.up();
  assert.equal((await snapshot()).hand.at(-1).id,'h-10');check('Pointer dragging reorders the visible hand');
  await page.locator('[data-sort="rank"]').click();assert.equal((await snapshot()).hand[0].rank,14);check('Rank sorting changes the same API state');
  const jb1=await page.locator('[data-joker="j-sly"]').boundingBox();
  await page.mouse.move(jb1.x+30,jb1.y+50);await page.mouse.down();await page.mouse.move(jb1.x+180,jb1.y+50,{steps:12});await page.mouse.up();
  assert.equal((await snapshot()).jokers[1].id,'j-sly');check('Joker dragging changes trigger order');
  await scene('score');await page.locator('#score-preset').click();
  await page.waitForFunction(()=>window.balatro.getState().scoreIndex>=3);
  await shot('03-scoring.png');await page.waitForFunction(()=>!window.balatro.getState().busy);
  assert.equal((await snapshot()).lastScore,3120);assert.equal((await snapshot()).hands,3);check('Pair tens + Sly + Joker + polychrome Half totals 3,120');
  await page.locator('#score-preset').click();await page.waitForFunction(()=>!window.balatro.getState().busy);assert.equal((await snapshot()).lastScore,3120);check('Scoring preset can be replayed');
  await act({type:'new_game'});await act({type:'reorder_jokers',jokerIds:['j-sly','j-half','j-joker']});
  await page.locator('#speed').selectOption('4');await act({type:'play_hand',cardIds:['h-10','c-10']});assert.equal((await snapshot()).lastScore,2960);check('Moving polychrome before +4 changes result to 2,960');
  await scene('shop');await shot('04-shop.png');
  const pouch=page.locator('[data-pack="celestial"]>.booster-pouch');
  const pouchMount=await page.locator('[data-pack="celestial"]').boundingBox();
  const pouchPose=async x=>{
    await page.mouse.move(pouchMount.x+pouchMount.width*x,pouchMount.y+70,{steps:8});await page.waitForTimeout(170);
    return pouch.evaluate(el=>{const f=el.querySelector('.pouch-front').getBoundingClientRect(),m=el.querySelector('.pouch-emblem').getBoundingClientRect();return {x:m.x+m.width/2-f.x-f.width/2,tracking:el.dataset.tracking};});
  };
  const pouchLeft=await pouchPose(.15),pouchRight=await pouchPose(.85);
  report.pouchParallax={left:pouchLeft.x,right:pouchRight.x};
  assert.equal(pouchRight.tracking,'true');assert.ok(Math.abs(pouchRight.x-pouchLeft.x)>1);
  check('Pixel wrappers retain subtle emblem depth responding to the pointer');
  await page.locator('[data-offer="blueprint"]').hover();await page.locator('[data-buy="blueprint"]').click();assert.equal((await snapshot()).money,6);assert.equal((await snapshot()).jokers.length,4);check('Buying moves Joker into build and deducts money');
  const duplicate=await snapshot();assert.equal((await act({type:'buy',offerId:'blueprint'})).ok,false);assert.deepEqual(await snapshot(),duplicate);check('Sold offer cannot charge twice');
  await scene('shop');await act({type:'buy',offerId:'tarot'});assert.deepEqual((await snapshot()).consumables.map(c=>c.kind),['jupiter','star']);check('Purchased tarot appears in consumable slots');
  await scene('shop');await page.locator('#speed').selectOption('1');await page.locator('[data-pack="celestial"]').click();assert.equal((await snapshot()).money,12);
  await page.waitForTimeout(180);assert.equal(await page.locator('.pack-unseal').count(),1);
  assert.notEqual(await page.locator('.pack-unseal .pouch-seal-top').evaluate(el=>getComputedStyle(el).transform),'none');
  await page.waitForTimeout(550);assert.equal(await page.locator('.pack-unseal').count(),0);await shot('05-celestial-pack.png');
  check('Opening tears the top seal and removes the empty wrapper before choosing a card');
  await page.locator('#speed').selectOption('4');
  const packState=await snapshot(),planet=packState.consumableCatalog.find(c=>c.id===packState.packOptions[0]);await page.locator('[data-pick="0"]').click();assert.equal((await snapshot()).handLevels[planet.handKey],2);assert.equal((await snapshot()).phase,'shop');check('Celestial selection upgrades a hand and closes the pack');
  await act({type:'next_round'});assert.equal((await snapshot()).handLevels[planet.handKey],2);await act({type:'select_cards',cardIds:['h-10','c-10']});assert.equal(await page.locator('#chips').textContent(),'10');assert.equal(await page.locator('#mult').textContent(),'2');check('Chosen planet level persists into next round without upgrading unrelated hands');
  await scene('shop');await page.locator('[data-pack="arcana"]').click();
  const noTarget=await snapshot();const sunIndex=noTarget.packOptions.indexOf('sun');assert.ok(sunIndex>=0);assert.equal((await act({type:'pick_pack',optionId:sunIndex})).ok,false);assert.deepEqual(await snapshot(),noTarget);check('Targeted tarot refuses use before hand selection');
  await page.locator('[data-cardid="c-10"]').click();await page.locator('[data-pick="'+sunIndex+'"]').click();assert.equal((await snapshot()).hand.find(c=>c.id==='c-10').suit,'H');check('Targeted tarot changes selected card suit');
  await scene('shop');await act({type:'reroll'});assert.equal((await snapshot()).money,11);assert.equal((await snapshot()).rerollCost,6);await act({type:'reroll'});const moneyState=await snapshot();assert.equal((await act({type:'reroll'})).ok,false);assert.deepEqual(await snapshot(),moneyState);check('Reroll price grows; insufficient funds leaves state unchanged');
  await scene('materials');
  await page.locator('[data-material-group="modifiers"]').click();
  assert.equal(await page.locator('[data-modifier]').count(),16);
  assert.equal(await page.locator('#catalog-count').textContent(),'16 / 16 项修饰');
  for(const [group,count] of [['enhancement',8],['edition',4],['seal',4]]){
    await page.locator(`[data-modifier-filter="${group}"]`).click();assert.equal(await page.locator('[data-modifier]').count(),count);
  }
  await page.locator('[data-modifier-filter="all"]').click();
  const modifierKeys=await page.locator('[data-modifier]').evaluateAll(els=>els.map(el=>el.dataset.modifier));
  assert.equal(new Set(modifierKeys).size,16);
  for(const key of modifierKeys){
    await page.locator('#modifier-reset').click();await page.locator(`[data-modifier="${key}"]`).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('#material-preview img')].every(im=>im.complete&&im.naturalWidth>0));
    assert.equal(await page.locator('#material-preview .modifier-print').getAttribute(`data-${key.split(':')[0]}`),key.split(':')[1]);
  }
  check('All 16 card modifiers load and preview, with separate 8 enhancement / 4 edition / 4 seal filters');
  await page.locator('#modifier-search').fill('镭射');assert.equal(await page.locator('[data-modifier="edition:holographic"]').count(),1);
  assert.equal(await page.locator('[data-modifier="edition:holographic"] strong').textContent(),'镭射');
  assert.deepEqual(await page.locator('#modifier-edition option').allTextContents(),['基础版本','闪箔','镭射','多彩','负片']);
  await page.locator('[data-modifier="edition:holographic"]').click();assert.match(await page.locator('#modifier-detail').textContent(),/\+10/);
  assert.equal(await page.locator('#modifier-name').textContent(),'镭射');
  await page.locator('#modifier-search').fill('全息');assert.equal(await page.locator('[data-modifier="edition:holographic"]').count(),1);
  await page.locator('#modifier-search').fill('');check('Original Chinese edition names are used; 全息 remains only a search alias for 镭射 (+10 Mult)');
  await page.locator('[data-modifier-preset="0"]').click();
  const composed=page.locator('#material-preview .modifier-print');
  assert.equal(await composed.getAttribute('data-enhancement'),'glass');assert.equal(await composed.getAttribute('data-edition'),'polychrome');assert.equal(await composed.getAttribute('data-seal'),'red');
  assert.equal(await composed.locator('.glass-body').count(),1);assert.equal(await composed.locator('.modifier-seal img').count(),1);
  await page.locator('#modifier-edition').selectOption('holographic');
  assert.equal(await composed.getAttribute('data-enhancement'),'glass');assert.equal(await composed.getAttribute('data-seal'),'red');
  await page.waitForFunction(()=>document.querySelector('#material-preview .holographic')?.classList.contains('edition-ready'));assert.equal(await composed.locator('.edition-canvas').count(),1);assert.equal(await composed.locator('.glass-body').count(),1);
  check('Glass, edition and red seal compose independently, including Glass + Holographic');
  await page.locator('[data-modifier="edition:negative"]').click();
  assert.equal(await page.locator('#modifier-target').inputValue(),'joker');assert.equal(await composed.getAttribute('data-enhancement'),'none');assert.equal(await composed.getAttribute('data-seal'),'none');
  assert.equal(await page.locator('#modifier-enhancement').isDisabled(),true);assert.equal(await page.locator('#modifier-seal').isDisabled(),true);
  await page.locator('#modifier-target').selectOption('playing');assert.equal(await page.locator('#modifier-edition').inputValue(),'none');
  check('Negative switches to a Joker and clears incompatible modifiers; returning to a playing card removes Negative');
  await page.locator('#reduced-toggle').click();await page.locator('#crt').fill('0');
  const modifierFrames=[];
  for(const id of ['bonus','mult','wild','glass','steel','stone','gold','lucky']){
    await page.locator('#modifier-reset').click();await page.locator(`[data-modifier="enhancement:${id}"]`).click();
    await page.waitForTimeout(60);const png=await page.locator('#material-preview').screenshot();modifierFrames.push({id,png});await writeFile(new URL(`enhancement-${id}.png`,previews),png);
  }
  report.enhancementDifferences=[];
  for(let i=0;i<modifierFrames.length;i++)for(let j=i+1;j<modifierFrames.length;j++){
    const d=await difference(page,modifierFrames[i].png,modifierFrames[j].png);report.enhancementDifferences.push({a:modifierFrames[i].id,b:modifierFrames[j].id,...d});
    assert.ok(d.mean>5,`${modifierFrames[i].id} vs ${modifierFrames[j].id}: ${d.mean}`);
  }
  await page.locator('[data-modifier="enhancement:stone"]').click();
  assert.equal(await page.locator('#material-preview .pixel-art').first().isVisible(),false);assert.match(await page.locator('#modifier-detail').textContent(),/无点数、无花色/);
  check('All eight enhancements remain visually distinct in rendered pixels; Stone has no rank or suit ink');
  report.modifierComposition={};
  for(const [enhancement,edition,seal] of [['stone','foil','none'],['glass','polychrome','none'],['steel','none','red']]){
    await page.locator('#modifier-reset').click();await page.locator('#modifier-enhancement').selectOption(enhancement);
    const before=await page.locator('#material-preview').screenshot();
    await page.locator('#modifier-edition').selectOption(edition);await page.locator('#modifier-seal').selectOption(seal);
    const after=await page.locator('#material-preview').screenshot(),d=await difference(page,before,after);
    report.modifierComposition[`${enhancement}-${edition}-${seal}`]=d;assert.ok(d.mean>.7&&d.changed>.01,JSON.stringify(d));
  }
  check('Rendered Stone + Foil, Glass + Polychrome and Steel + Red Seal retain their visible layered effects');
  await page.locator('[data-modifier-preset="0"]').click();await shot('17-modifiers.png');
  await page.locator('#reduced-toggle').click();await page.locator('#crt').fill('35');
  await page.locator('[data-material-group="jokers"]').click();
  const catalog=await (await page.request.get(new URL('assets/joker-catalog.json',base).href)).json();
  assert.equal(catalog.length,150);assert.equal(new Set(catalog.map(j=>j.sha256)).size,150);
  const seen=new Set();
  for(let i=0;i<10;i++){
    await page.waitForFunction(()=>[...document.querySelectorAll('#catalog-grid img')].every(im=>im.complete&&im.naturalWidth>0));
    for(const file of await page.locator('#catalog-grid [data-material]').evaluateAll(els=>els.map(el=>el.dataset.material)))seen.add(file);
    if(i<9)await page.locator('#catalog-next').click();
  }
  assert.equal(seen.size,150);await shot('08-joker-catalog-last.png');check('All 150 distinct Joker artworks load across all ten gallery pages');
  for(const [rarity,count]of [['Common',61],['Uncommon',64],['Rare',20],['Legendary',5]]){
    await page.locator('#catalog-rarity').selectOption(rarity);assert.equal(await page.locator('#catalog-count').textContent(),`${count} / 150 张小丑牌`);
  }
  await page.locator('[data-material="jokers/perkeo.png"]').click();assert.equal(await page.locator('#material-name').textContent(),'佩尔科');await shot('09-legendary-jokers.png');check('Rarity filters cover all four tiers and Legendary cards can be previewed');
  await page.locator('#catalog-rarity').selectOption('all');await page.locator('#catalog-search').fill('blueprint');assert.equal(await page.locator('#catalog-grid [data-material]').count(),1);
  await page.locator('#catalog-search').fill('蓝图');await page.locator('[data-material="joker-blueprint.png"]').click();assert.equal(await page.locator('#material-name').textContent(),'蓝图');
  await page.locator('#catalog-search').fill('no-such-card-123');assert.equal(await page.locator('.catalog-empty').count(),1);check('English and Chinese name searches, selection and empty results work');
  await page.locator('[data-material-group="other"]').click();assert.equal(await page.locator('#catalog-count').textContent(),'65 / 65 张其他物料');
  await page.locator('#catalog-search').fill('包');assert.equal(await page.locator('#catalog-grid .booster-pouch').count(),5);
  assert.equal(await page.locator('#catalog-grid.is-pack-catalog').count(),1);
  const packGrid=await page.locator('#catalog-grid').boundingBox();
  for(const el of await page.locator('#catalog-grid .catalog-art').all()){
    const art=await el.boundingBox();assert.ok(art.width>100&&art.height>170&&art.x>=packGrid.x&&art.x+art.width<=packGrid.x+packGrid.width+1);
  }
  await page.locator('[data-material="pack-celestial.png"]').click();assert.equal(await page.locator('[data-compare-pack]').count(),5);
  for(const kind of ['arcana','celestial','standard','buffoon','spectral']){await page.locator(`[data-compare-pack="${kind}"]`).click();assert.equal(await page.locator(`#material-preview .pack-${kind}`).count(),1);}
  check('All five pouch families use the physical wrapper in thumbnails, preview and comparison');
  await page.locator('#catalog-search').fill('红桃 K');await page.locator('[data-material="card-H-K.png"]').click();await page.locator('[data-edition="foil"]').click();assert.equal(await page.locator('#material-preview .foil').count(),1);check('All 65 other materials are catalogued; material and edition controls update preview');
  await page.locator('[data-material-group="jokers"]').click();await page.locator('[data-material="joker-joker.png"]').click();
  assert.equal(await page.locator('.edition-example').count(),5);
  assert.deepEqual(await page.locator('.edition-picker button').allTextContents(),['基础','闪箔','镭射','多彩','负片']);
  assert.equal(await page.locator('[data-edition="glass"]').count(),0);
  await page.locator('#reduced-toggle').click();
  await page.locator('#crt').fill('0');
  const previewStyle=await page.addStyleTag({content:'#material-preview{transform:none!important;translate:0 0!important}'});
  const prints=[];
  for(const edition of ['none','foil','holographic','polychrome','negative']){
    await page.locator(`[data-edition="${edition}"]`).click();await page.waitForTimeout(80);
    const png=await page.locator('#material-preview').screenshot();prints.push({edition,png});
    await writeFile(new URL(`edition-${edition}.png`,previews),png);
  }
  report.materialDifferences=[];
  for(let i=0;i<prints.length;i++)for(let j=i+1;j<prints.length;j++){
    const d=await difference(page,prints[i].png,prints[j].png);report.materialDifferences.push({a:prints[i].edition,b:prints[j].edition,...d});assert.ok(d.mean>8,`${prints[i].edition} vs ${prints[j].edition} must be visually distinct: ${d.mean}`);
  }
  check('All five Joker editions remain visibly distinct; Glass is excluded from edition controls');
  await page.locator('[data-material-group="modifiers"]').click();await page.locator('#modifier-reset').click();
  const transmission=async enhancement=>{
    await page.locator('#modifier-enhancement').selectOption(enhancement);await page.waitForTimeout(70);
    await page.locator('#material-preview').evaluate(el=>el.style.background='#2369c7');
    const blue=await page.locator('#material-preview').screenshot();
    await page.locator('#material-preview').evaluate(el=>el.style.background='#d38c25');
    const gold=await page.locator('#material-preview').screenshot();
    await page.locator('#material-preview').evaluate(el=>el.style.removeProperty('background'));
    return difference(page,blue,gold);
  };
  report.glassTransmission={paper:await transmission('none'),glass:await transmission('glass')};
  assert.ok(report.glassTransmission.glass.mean>20&&report.glassTransmission.glass.mean>report.glassTransmission.paper.mean+15);
  check('Glass remains a playing-card enhancement and transmits the backdrop while paper stays opaque');
  await page.locator('[data-material-group="jokers"]').click();
  await page.locator('[data-edition="negative"]').click();
  await page.locator('[data-material-group="other"]').click();await page.locator('#catalog-search').fill('黑桃 A');
  await page.locator('[data-material="card-S-A.png"]').click();
  assert.equal(await page.locator('[data-edition="negative"]').count(),0);
  assert.equal(await page.locator('[data-edition="none"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.edition-example').count(),4);
  await page.locator('[data-material-group="jokers"]').click();await page.locator('[data-material="joker-joker.png"]').click();
  check('Playing-card gallery excludes Negative and clears an incompatible Joker edition');
  await previewStyle.evaluate(el=>el.remove());await page.locator('#reduced-toggle').click();await page.locator('#crt').fill('35');
  await page.locator('[data-edition="polychrome"]').click();await shot('06-materials.png');
  const finishBackdrop=await page.addStyleTag({content:'#background{visibility:hidden!important}#material-preview{transform:none!important;animation:none!important;translate:0 0!important}'});
  assert.equal(await page.locator('#stage').getAttribute('data-edition-renderer'),'webgl');
  assert.equal(await page.locator('.holo-subject,.holo-projector,.holo-scan,.holo-volume').count(),0);
  check('All editions use one printed image plane; projection subjects, emitters and scanning beams are removed');
  report.editionMotion={};report.editionReferences={};
  for(const edition of ['foil','holographic','polychrome','negative']){
    await page.locator(`[data-edition="${edition}"]`).click();
    await page.waitForFunction(()=>document.querySelector('#material-preview .card-surface')?.classList.contains('edition-ready'));
    const canvas=page.locator('#material-preview .edition-canvas');
    const first=Buffer.from((await canvas.evaluate(el=>el.toDataURL())).split(',')[1],'base64');
    await page.waitForTimeout(950);
    const second=Buffer.from((await canvas.evaluate(el=>el.toDataURL())).split(',')[1],'base64');
    report.editionMotion[edition]=await difference(page,first,second);
    assert.ok(report.editionMotion[edition].mean>.03,edition+' finish must animate on its own printed pixels');
    const rect=await page.locator('#material-preview').boundingBox();
    await page.mouse.move(rect.x+rect.width*.15,rect.y+rect.height*.5);await page.waitForTimeout(70);
    const left=Buffer.from((await canvas.evaluate(el=>el.toDataURL())).split(',')[1],'base64');
    await page.mouse.move(rect.x+rect.width*.85,rect.y+rect.height*.5);await page.waitForTimeout(70);
    assert.equal(await page.locator('#material-preview .card-surface').getAttribute('data-tracking'),'true');
    const right=Buffer.from((await canvas.evaluate(el=>el.toDataURL())).split(',')[1],'base64');
    assert.ok((await difference(page,left,right)).mean>.03,edition+' must respond to the pointer');
  }
  check('All four finishes animate and respond to pointer lighting in rendered pixels');
  await page.mouse.move(20,20);await page.locator('#reduced-toggle').click();await page.waitForTimeout(90);
  const baseReference=await readFile(new URL('research/edition-references/none.png',root));
  for(const edition of ['foil','holographic','polychrome','negative']){
    await page.locator(`[data-edition="${edition}"]`).click();
    await page.waitForFunction(()=>document.querySelector('#material-preview .card-surface')?.classList.contains('edition-ready'));await page.waitForTimeout(70);
    const canvas=page.locator('#material-preview .edition-canvas');
    const actual=Buffer.from((await canvas.evaluate(el=>el.toDataURL())).split(',')[1],'base64');
    const reference=await readFile(new URL(`research/edition-references/${edition}.png`,root));
    const error=await difference(page,actual,reference);
    const color=await page.evaluate(async([actual,base])=>{
      const decode=async uri=>{const im=new Image();im.src='data:image/png;base64,'+uri;await im.decode();const c=document.createElement('canvas');c.width=142;c.height=190;const x=c.getContext('2d');x.drawImage(im,0,0);return x.getImageData(0,0,142,190).data;};
      const a=await decode(actual),b=await decode(base);const mean=[0,0,0];let n=0,variance=0,alphaMismatch=0;
      for(let i=0;i<a.length;i+=4){if(b[i+3]===0&&a[i+3]!==0)alphaMismatch++;if(b[i]>250&&b[i+1]>250&&b[i+2]>250&&b[i+3]===255){for(let k=0;k<3;k++)mean[k]+=a[i+k];n++;}}
      for(let k=0;k<3;k++)mean[k]/=n;
      for(let i=0;i<a.length;i+=4)if(b[i]>250&&b[i+1]>250&&b[i+2]>250&&b[i+3]===255)variance+=(a[i+2]-mean[2])**2;
      return {paperMean:mean,paperBlueDeviation:Math.sqrt(variance/n),alphaMismatch};
    },[actual.toString('base64'),baseReference.toString('base64')]);
    report.editionReferences[edition]={...error,...color};
    assert.ok(error.mean<45,edition+' should remain close to the original static reference phase: '+error.mean);
    assert.equal(color.alphaMismatch,0,'Original transparent pixels must remain transparent');
    if(edition==='foil')assert.ok(color.paperMean[2]>color.paperMean[0]+12);
    if(edition==='holographic')assert.ok(color.paperBlueDeviation>3);
    if(edition==='polychrome')assert.ok(Math.min(...color.paperMean)>230&&Math.max(...color.paperMean)-Math.min(...color.paperMean)<15);
    if(edition==='negative')assert.ok(color.paperMean[0]<100&&color.paperMean[2]>color.paperMean[0]+20);
  }
  check('Original-reference pixels retain Foil blue stock, Holographic lattice, pale Polychrome paper and navy Negative stock');
  await page.locator('#catalog-search').fill('半张小丑');await page.locator('[data-material="joker-half.png"]').click();
  for(const edition of ['foil','holographic','polychrome','negative']){
    await page.locator(`[data-edition="${edition}"]`).click();
    await page.waitForFunction(()=>document.querySelector('#material-preview .edition-ready>.edition-canvas'));
    const shape=await page.locator('#material-preview .card-surface').evaluate(el=>{
      const source=el.querySelector(':scope>.pixel-art'),output=el.querySelector('.edition-canvas');
      const c=document.createElement('canvas');c.width=142;c.height=190;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);const a=ctx.getImageData(0,0,142,190).data,b=output.getContext('2d').getImageData(0,0,142,190).data;
      let transparent=0,leaks=0;for(let i=3;i<a.length;i+=4)if(a[i]===0){transparent++;if(b[i]!==0)leaks++;}return {transparent,leaks};
    });
    assert.ok(shape.transparent>8000);assert.equal(shape.leaks,0);
  }
  await page.locator('#catalog-search').fill('小丑');await page.locator('[data-material="joker-joker.png"]').click();
  check('All four finishes preserve Half Joker cut-out transparency without a rectangular glow');
  await page.locator('[data-edition="holographic"]').click();await page.waitForTimeout(90);
  const small=page.locator('[data-compare-edition="holographic"] .comparison-card');
  assert.equal(await small.locator('.edition-ready>.edition-canvas').count(),1);
  const stillRect=await page.locator('#material-preview').boundingBox();
  await page.mouse.move(stillRect.x+stillRect.width*.2,stillRect.y+stillRect.height*.5);const frozenFinish1=await page.locator('.material-preview').screenshot();
  await page.mouse.move(stillRect.x+stillRect.width*.8,stillRect.y+stillRect.height*.5);await page.waitForTimeout(350);const frozenFinish2=await page.locator('.material-preview').screenshot();
  assert.equal((await difference(page,frozenFinish1,frozenFinish2)).mean,0);
  check('Reduced motion freezes finish time and pointer lighting; comparison cards use the same surface renderer');
  await finishBackdrop.evaluate(el=>el.remove());await shot('18-original-editions.png');
  await page.locator('[data-material-group="modifiers"]').click();await page.locator('#modifier-reset').click();
  await page.locator('#modifier-enhancement').selectOption('glass');
  const stillGlassRect=await page.locator('#material-preview').boundingBox();
  await page.mouse.move(stillGlassRect.x+stillGlassRect.width*.2,stillGlassRect.y+stillGlassRect.height*.5);const frozenGlass1=await page.locator('.material-preview').screenshot();
  await page.mouse.move(stillGlassRect.x+stillGlassRect.width*.8,stillGlassRect.y+stillGlassRect.height*.5);const frozenGlass2=await page.locator('.material-preview').screenshot();
  assert.equal((await difference(page,frozenGlass1,frozenGlass2)).mean,0);check('Reduced motion also freezes glass tilt and surface reflections');
  await scene('shop');await page.locator('.pack-library').click();
  const reducedPouch=await page.locator('#material-preview').boundingBox();
  await page.mouse.move(reducedPouch.x+20,reducedPouch.y+100);const frozenPack1=await page.locator('.material-preview').screenshot();
  await page.mouse.move(reducedPouch.x+100,reducedPouch.y+100);const frozenPack2=await page.locator('.material-preview').screenshot();
  assert.equal((await difference(page,frozenPack1,frozenPack2)).mean,0);check('Shop packaging library opens all five families; reduced motion freezes pouch lighting');
  await scene('shop');await act({type:'open_pack',offerId:'celestial'});await scene('table');
  assert.equal(await page.locator('.pack-unseal').count(),0);assert.equal(await page.locator('#effects').locator(':scope>*').count(),0);
  check('Leaving during pack opening clears the wrapper and transient effects');
  await page.locator('#reduced-toggle').click();
  report.packRevealSpeed={};
  for(const speed of ['0.5','4']){
    await scene('shop');await page.locator('#speed').selectOption(speed);await act({type:'open_pack',offerId:'celestial'});
    await page.waitForTimeout(250);
    const opacity=await page.locator('[data-pick="0"]').evaluate(el=>Number(getComputedStyle(el).opacity));
    report.packRevealSpeed[speed]=opacity;
    assert.ok(speed==='4'?opacity>.95:opacity<.05);
  }
  await scene('materials');await page.locator('#reduced-toggle').click();
  check('Candidate reveal follows the speed setting: finished at 4x while still waiting at 0.5x');
  await page.locator('#crt').fill('0');assert.equal(await page.locator('#crt-value').textContent(),'0%');check('CRT amount can be disabled');
  await page.setViewportSize({width:900,height:700});await scene('table');
  const dims=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,stage:document.querySelector('#stage').getBoundingClientRect().width}));assert.equal(dims.overflow,false);assert.ok(dims.stage<=860.1);check('900px viewport scales the stage without horizontal overflow');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot('07-narrow-layout.png');check('390px page has no horizontal overflow (desktop stage scaled)');
  const fallback=await browser.newPage({viewport:{width:1280,height:900}});
  await fallback.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2')return null;return getContext.call(this,type,...args);};});
  await fallback.goto(base+'#table',{waitUntil:'networkidle'});assert.equal(await fallback.locator('#background').getAttribute('data-renderer'),'canvas2d');
  await fallback.addStyleTag({content:'#game-layer,#effects,.crt,.vignette,.sample-stamp{visibility:hidden!important}'});
  const fb1=await fallback.locator('#background').screenshot();await fallback.waitForTimeout(1500);const fb2=await fallback.locator('#background').screenshot();
  report.fallbackMotion=await difference(fallback,fb1,fb2);assert.ok(report.fallbackMotion.mean>3&&report.fallbackMotion.changed>.2);check('Canvas fallback still visibly flows when WebGL is unavailable');
  await fallback.locator('[data-scene="materials"]').click();
  assert.equal(await fallback.locator('#stage').getAttribute('data-edition-renderer'),'css');
  await fallback.addStyleTag({content:'#game-layer{visibility:visible!important}#background{visibility:hidden!important}#material-preview{transform:none!important;animation:none!important}'});
  await fallback.locator('#reduced-toggle').click();await fallback.waitForTimeout(80);
  const plain=await fallback.locator('#material-preview').screenshot();
  for(const edition of ['foil','holographic','polychrome','negative']){
    await fallback.locator(`[data-edition="${edition}"]`).click();await fallback.waitForTimeout(60);
    assert.equal(await fallback.locator('#material-preview .pixel-art').isVisible(),true);
    assert.ok((await difference(fallback,plain,await fallback.locator('#material-preview').screenshot())).mean>2,`${edition} CSS fallback should visibly differ from Base`);
  }
  await fallback.close();check('Without WebGL all four editions remain visible and distinct through CSS fallback');
  assert.equal(report.externalRequests.length,0);assert.equal(report.errors.length,0);check('No external runtime requests or browser console/page errors');
  report.ok=true;
}catch(e){report.failure=e.stack;throw e;}finally{
  await writeFile(new URL('research/browser-verification.json',root),JSON.stringify(report,null,2));await browser.close();
}
