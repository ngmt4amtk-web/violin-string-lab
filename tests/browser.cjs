// Browser QA uses an existing local Playwright installation; no production dependency.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const base=process.env.TEST_URL||'http://127.0.0.1:8874/';const out=process.env.QA_DIR||'.local/qa';fs.mkdirSync(out,{recursive:true});
const reports=[];
const setRange=async(p,id,value)=>p.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
(async()=>{
for(const [name,type,executablePath] of [['chromium',chromium,process.env.CHROMIUM_PATH],['webkit',webkit,process.env.WEBKIT_PATH]]){
 const browser=await type.launch({headless:true,executablePath});
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:768,height:1000},{width:1440,height:1000}]){
  const context=await browser.newContext({viewport,acceptDownloads:true,colorScheme:viewport.width===320?'dark':'light',reducedMotion:'no-preference'}),p=await context.newPage(),errors=[],requests=[];p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>requests.push(r.url()));
  await p.goto(base);await p.waitForSelector('#string-path');
  assert.equal(await p.locator('#status').innerText(),'規則的に鳴る範囲');
  const before=await p.locator('#string-path').getAttribute('d');await p.waitForFunction(d=>document.querySelector('#string-path').getAttribute('d')!==d,before,{timeout:3000});const after=await p.locator('#string-path').getAttribute('d');assert.notEqual(before,after);
  await p.locator('#play').click();await p.waitForTimeout(50);const stopped=await p.locator('#string-path').getAttribute('d');await p.waitForTimeout(150);assert.equal(stopped,await p.locator('#string-path').getAttribute('d'));
  for(const string of ['G','D','A','E']){await p.locator(`[data-string="${string}"]`).click();assert.equal(await p.locator(`[data-string="${string}"]`).getAttribute('aria-pressed'),'true');}
  await p.locator('#reset').click();await p.locator('#save-a').click();await p.locator('[name="lock"][value="ratio"]').check();await setRange(p,'semitone',12);assert.equal(Number(await p.locator('#distance-number').inputValue()),16);assert.ok((await p.locator('#comparison-rows').innerText()).includes('D5'));
  await p.locator('#restore-a').click();assert.equal(await p.locator('#pitch-output').innerText(),'開放弦');
  await setRange(p,'speed',0);assert.equal(await p.locator('#status').innerText(),'弓が止まっています');await setRange(p,'speed',10);
  for(const [preset,expected] of [['light','スカスカ側'],['heavy','ギー側'],['bridge','スカスカ側'],['high','規則的に鳴る範囲']]){await p.locator(`[data-preset="${preset}"]`).click();assert.equal(await p.locator('#status').innerText(),expected);}
  await p.locator('#center-force').click();assert.equal(await p.locator('#status').innerText(),'規則的に鳴る範囲');
  await p.locator('.advanced summary').click();await setRange(p,'semitone',24);await setRange(p,'distance',65);await setRange(p,'friction',.15);await setRange(p,'bodyLoss',5);await setRange(p,'tension',100);await setRange(p,'resistance',2);
  assert.equal(await p.locator('#scope-note').isVisible(),true);
  await p.locator('[data-string="G"]').click();await setRange(p,'semitone',1);await setRange(p,'distance',2);await setRange(p,'tension',100);await setRange(p,'speed',60);await setRange(p,'fingerLoss',4);await setRange(p,'length',300);
  assert.equal(await p.locator('#status').innerText(),'緑の帯がない');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:path.join(out,`${name}-${viewport.width}-extreme.png`),fullPage:false});
  await p.locator('#reset').click();await setRange(p,'semitone',24);await setRange(p,'distance',30);await p.locator('[name="lock"][value="ratio"]').check();await setRange(p,'semitone',0);
  assert.equal(Number(await p.locator('#distance').inputValue()),65);assert.equal(Number(await p.locator('#distance-number').inputValue()),65);
  await p.locator('#reset').click();await p.locator('#map').focus();await p.keyboard.press('ArrowRight');assert.ok(Number(await p.locator('#distance-number').inputValue())>32);
  const rect=await p.locator('#map svg').boundingBox();await p.mouse.click(rect.x+rect.width*.6,rect.y+rect.height*.5);assert.ok(Number(await p.locator('#distance-number').inputValue())!==32);
  await p.locator('#share').click();assert.ok(p.url().includes('string='));const shared=p.url();const force=await p.locator('#force-number').inputValue();await p.goto(shared);assert.equal(await p.locator('#force-number').inputValue(),force);
  await p.locator('#reset').click();
  const downloadPromise=p.waitForEvent('download');await p.locator('#export').click();const download=await downloadPromise;const output=path.join(out,`${name}-${viewport.width}-export.png`);await download.saveAs(output);assert.ok(fs.statSync(output).size>5000);
  await p.locator('.advanced summary').click();await p.locator('#sources summary').click();
  const overflow=await p.evaluate(()=>{const vw=document.documentElement.clientWidth;return Array.from(document.querySelectorAll('body *')).filter(el=>{if(el instanceof SVGElement)return false;const r=el.getBoundingClientRect();return r.width>0&&(r.left<-.5||r.right>vw+.5);}).map(el=>el.id||el.className||el.tagName);});assert.deepEqual(overflow,[],'overflow: '+overflow.join(','));
  await p.locator('.advanced summary').click();await p.locator('#sources summary').click();await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(200);await p.screenshot({path:path.join(out,`${name}-${viewport.width}.png`),fullPage:true});
  if(viewport.width<=390){await p.locator('#force').scrollIntoViewIfNeeded();await p.waitForTimeout(100);assert.equal(await p.locator('#mobile-monitor').isVisible(),true);await p.screenshot({path:path.join(out,`${name}-${viewport.width}-controls.png`)});}
  assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(u=>!u.startsWith(new URL(base).origin)&&!u.startsWith('blob:')),[]);
  reports.push({browser:name,width:viewport.width,errors,externalRequests:0,passed:true});await context.close();
 }
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage();await p.goto(base);const first=await p.locator('#string-path').getAttribute('d');await p.waitForTimeout(250);assert.equal(first,await p.locator('#string-path').getAttribute('d'));assert.equal(await p.locator('#play').innerText(),'動かす');await c.close();await browser.close();
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({date:new Date().toISOString(),base,reports,reducedMotion:true},null,2));console.log(JSON.stringify({passed:reports.length,reducedMotion:true}));
})().catch(e=>{console.error(e);process.exit(1);});
