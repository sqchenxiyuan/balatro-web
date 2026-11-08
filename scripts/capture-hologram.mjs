import {chromium} from '@playwright/test';
import {fileURLToPath} from 'node:url';
const out=new URL('../research/previews/',import.meta.url);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1120},deviceScaleFactor:1});
  await page.goto(new URL('#materials',process.env.BALATRO_DEMO_URL??'http://127.0.0.1:5192/').href,{waitUntil:'networkidle'});
  await page.locator('[data-edition="holographic"]').click();
  const capture=async(name)=>{
    await page.waitForFunction(()=>[...document.querySelectorAll('#material-preview img')].every(im=>im.complete&&im.naturalWidth>0));
    const rect=await page.locator('#material-preview').boundingBox();
    await page.mouse.move(rect.x+rect.width*.68,rect.y+rect.height*.45,{steps:8});await page.waitForTimeout(260);
    await page.locator('#stage').screenshot({path:fileURLToPath(new URL(`stage-16-projection-${name}.png`,out))});
    await page.locator('.material-preview').screenshot({path:fileURLToPath(new URL(`projection-${name}.png`,out))});
  };
  await capture('joker');
  for(const [x,name] of [[.12,'left'],[.5,'front'],[.88,'right']]){
    const rect=await page.locator('#material-preview').boundingBox();
    await page.mouse.move(rect.x+rect.width*x,rect.y+rect.height*.5,{steps:10});await page.waitForTimeout(260);
    await page.locator('.material-preview').screenshot({path:fileURLToPath(new URL(`colored-hologram-${name}.png`,out))});
  }
  await page.locator('#catalog-search').fill('blueprint');await page.locator('[data-material="joker-blueprint.png"]').click();await capture('blueprint');
  await page.locator('#catalog-search').fill('half joker');await page.locator('[data-material="joker-half.png"]').click();await capture('half');
  console.log('Captured full-color holograms, with three pointer angles for depth review.');
}finally{await browser.close();}
