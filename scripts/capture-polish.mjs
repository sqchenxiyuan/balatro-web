import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('../research/previews/',import.meta.url);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1120},deviceScaleFactor:1});
  page.on('pageerror',e=>console.error(e));
  await page.goto(process.env.BALATRO_DEMO_URL??'http://127.0.0.1:5192/',{waitUntil:'networkidle'});
  const shot=async name=>{await page.mouse.move(20,20);await page.waitForTimeout(180);await page.locator('#stage').screenshot({path:fileURLToPath(new URL(name,out))});};
  await page.locator('[data-scene="shop"]').click();await shot('stage-11-packaging-shop.png');
  await page.locator('.pack-library').click();await shot('stage-12-five-packs.png');
  await page.locator('[data-material-group="modifiers"]').click();await page.locator('#modifier-reset').click();
  await page.locator('#modifier-enhancement').selectOption('glass');await shot('stage-13-clear-glass.png');
  await page.locator('#modifier-edition').selectOption('polychrome');await shot('stage-14-glass-polychrome.png');
  await page.locator('[data-scene="shop"]').click();
  await page.locator('[data-pack="celestial"]').click();await page.waitForTimeout(210);
  await page.locator('#stage').screenshot({path:fileURLToPath(new URL('stage-15-pack-tear.png',out))});
  console.log('Captured shop, five pack families, clear glass and tearing seal.');
}finally{await browser.close();}
