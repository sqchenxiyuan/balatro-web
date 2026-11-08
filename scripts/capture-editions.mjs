import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),previews=new URL('research/previews/',root);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1120}});
  await page.goto(process.env.BALATRO_DEMO_URL??'http://127.0.0.1:5192/#materials',{waitUntil:'networkidle'});
  if(await page.locator('#reduced-toggle').getAttribute('aria-pressed')==='false')await page.locator('#reduced-toggle').click();
  const renders=[];
  for(const id of ['none','foil','holographic','polychrome','negative']){
    await page.locator(`[data-edition="${id}"]`).click();
    if(id!=='none')await page.waitForFunction(()=>document.querySelector('#material-preview .edition-ready>.edition-canvas'));
    await page.waitForTimeout(80);
    const output=await page.locator('#material-preview .card-surface').evaluate(el=>{
      const canvas=el.querySelector('.edition-canvas');if(canvas)return canvas.toDataURL();
      const source=el.querySelector('img'),c=document.createElement('canvas');c.width=142;c.height=190;c.getContext('2d').drawImage(source,0,0);return c.toDataURL();
    });
    await writeFile(new URL(`original-style-${id}.png`,previews),Buffer.from(output.split(',')[1],'base64'));
    const reference='data:image/png;base64,'+(await readFile(new URL(`research/edition-references/${id}.png`,root))).toString('base64');
    let before=reference;
    if(id!=='none')before='data:image/png;base64,'+(await readFile(new URL(`edition-before-${id}.png`,previews))).toString('base64');
    renders.push({id,output,reference,before});
  }
  const comparison=await page.evaluate(async renders=>{
    const sheet=document.createElement('canvas');sheet.width=830;sheet.height=740;const x=sheet.getContext('2d');
    x.fillStyle='#26332e';x.fillRect(0,0,830,740);x.font='14px monospace';x.fillStyle='#eee';
    for(const [label,y] of [['Wiki original reference (one static phase)',23],['Previous demo',268],['Revised surface renderer',513]])x.fillText(label,12,y);
    const metrics=[];
    const load=async url=>{const im=new Image();im.src=url;await im.decode();return im;};
    const pixels=im=>{const c=document.createElement('canvas');c.width=142;c.height=190;const ctx=c.getContext('2d');ctx.drawImage(im,0,0,142,190);return ctx.getImageData(0,0,142,190).data;};
    const error=(actual,reference)=>{let n=0,total=0;for(let i=0;i<reference.length;i+=4)if(reference[i+3]===255){for(let k=0;k<3;k++)total+=Math.abs(actual[i+k]-reference[i+k]);n+=3;}return total/n;};
    for(const [i,r] of renders.entries()){
      const reference=await load(r.reference),before=await load(r.before),actual=await load(r.output);
      x.fillText(r.id,12+i*164,47);x.drawImage(reference,12+i*164,58,142,190);x.drawImage(before,12+i*164,289,142,190);x.drawImage(actual,12+i*164,534,142,190);
      metrics.push({id:r.id,beforeMeanRGBError:error(pixels(before),pixels(reference)),afterMeanRGBError:error(pixels(actual),pixels(reference))});
    }
    return {sheet:sheet.toDataURL().split(',')[1],metrics};
  },renders);
  await writeFile(new URL('edition-reference-comparison.png',previews),Buffer.from(comparison.sheet,'base64'));
  await writeFile(new URL('research/edition-visual-comparison.json',root),JSON.stringify({at:new Date().toISOString(),reference:'edition-references/manifest.json',metric:'Mean absolute RGB error (0-255), opaque reference pixels, one static phase; previous screenshots resized to 142x190. This is a regression aid, not a fidelity percentage.',metrics:comparison.metrics},null,2));
  await page.locator('[data-edition="holographic"]').click();await page.waitForTimeout(90);await page.mouse.move(20,20);
  await page.locator('#stage').screenshot({path:new URL('stage-18-original-editions.png',previews).pathname.replace(/^\/([A-Z]:)/,'$1')});
  console.log(JSON.stringify(comparison.metrics));
}finally{await browser.close();}
