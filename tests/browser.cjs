// Browser QA uses an existing local Playwright installation; no production dependency.
const {chromium,webkit}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const base=process.env.TEST_URL||'http://127.0.0.1:8874/';const out=process.env.QA_DIR||'.local/qa';fs.mkdirSync(out,{recursive:true});
const reports=[];
const showFigure=async(p,name)=>{if(p.viewportSize().width<=670)await p.locator('#tab-'+name).click();};
const setRange=async(p,id,value)=>p.locator('#'+id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));
(async()=>{
for(const [name,type,executablePath] of [['chromium',chromium,process.env.CHROMIUM_PATH],['webkit',webkit,process.env.WEBKIT_PATH]]){
 const browser=await type.launch({headless:true,executablePath});
 for(const viewport of [{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:1180,height:820},{width:1440,height:1000}]){
  const context=await browser.newContext({viewport,acceptDownloads:true,colorScheme:viewport.width===320?'dark':'light',reducedMotion:'no-preference'}),p=await context.newPage(),errors=[],requests=[];p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>requests.push(r.url()));
  await p.goto(base);await p.waitForSelector('#string-path',{state:'attached'});
  assert.equal(await p.locator('#status').innerText(),'規則的に鳴る範囲');
  assert.equal(await p.locator('#note-badge').innerText(),'A4');assert.equal(await p.locator('#note-badge').isVisible(),true);assert.equal(await p.locator('#pitch-output').innerText(),'開放弦');assert.equal(Number(await p.locator('#distance-number').inputValue()),32);assert.equal(Number(await p.locator('#speed-number').inputValue()),10);assert.equal(Number(await p.locator('#force-number').inputValue()),35);
  if(viewport.width===390){
   for(const tab of ['range','motion','map']){
    await showFigure(p,tab);
    const widths=await p.evaluate(()=>Object.fromEntries(['.workspace','#stage','.controls','.stage-notes'].map(selector=>[selector,document.querySelector(selector).getBoundingClientRect().width])));
    assert.ok(Math.abs(widths['#stage']-widths['.controls'])<=1,`${tab}: stage/controls width`);
    for(const selector of ['#stage','.controls','.stage-notes'])assert.ok(Math.abs(widths[selector]-widths['.workspace'])<=1,`${tab}: ${selector} width`);
    const stage=await p.locator('#stage').boundingBox();assert.ok(Math.abs(stage.x-16)<=1);assert.ok(stage.height<=viewport.height*.44+.5);
    if(tab==='motion'){
     const play=await p.locator('#play').boundingBox(),map=await p.locator('#tab-map').boundingBox(),down=await p.locator('[data-direction="down"]').boundingBox(),up=await p.locator('[data-direction="up"]').boundingBox();
     assert.ok(play.x+play.width<=map.x||map.x+map.width<=play.x||play.y+play.height<=map.y||map.y+map.height<=play.y,'play/map overlap');
     assert.ok(Math.abs(play.y-down.y)<=1&&Math.abs(play.y-up.y)<=1,'motion buttons on one row');
     const figure=await p.locator('#string-figure').boundingBox(),mode=await p.locator('.motion-mode-label').boundingBox();assert.ok(mode.y>=figure.y+figure.height-.5,'mode below figure');
    }
   }
   await showFigure(p,'range');assert.equal(await p.locator('#loudness-output').innerText(),'100%');
   const fillRatio=()=>p.evaluate(()=>document.querySelector('#loudness-fill').getBoundingClientRect().width/document.querySelector('#loudness-meter').getBoundingClientRect().width);
   assert.ok(Math.abs(await fillRatio()-.5)<=.01,'100% fills half the meter');
   await setRange(p,'speed',30);assert.equal(await p.locator('#loudness-output').innerText(),'300%');assert.ok(Math.abs(await fillRatio()-1)<=.01,'over 200% fills the meter');await setRange(p,'speed',10);
  }
  await showFigure(p,'motion');assert.equal(await p.locator('#string-figure').isVisible(),true);
  const before=await p.locator('#string-path').getAttribute('d');await p.waitForFunction(d=>document.querySelector('#string-path').getAttribute('d')!==d,before,{timeout:3000});const after=await p.locator('#string-path').getAttribute('d');assert.notEqual(before,after);
  await p.locator('#motion-mode').selectOption('cycle');assert.ok((await p.locator('#motion-description').innerText()).includes('1.8秒'));await p.locator('#motion-mode').selectOption('time');await p.locator('#play').click();await p.waitForTimeout(50);const stopped=await p.locator('#string-path').getAttribute('d');await p.waitForTimeout(150);assert.equal(stopped,await p.locator('#string-path').getAttribute('d'));
  const down=await p.locator('#string-path').getAttribute('d');await p.locator('[data-direction="up"]').click();assert.notEqual(await p.locator('#string-path').getAttribute('d'),down);assert.equal(await p.locator('[data-direction="up"]').getAttribute('aria-pressed'),'true');await p.locator('[data-direction="down"]').click();assert.equal(await p.locator('#string-path').getAttribute('d'),down);
  for(const string of ['G','D','A','E']){await p.locator(`[data-string="${string}"]`).click();assert.equal(await p.locator(`[data-string="${string}"]`).getAttribute('aria-pressed'),'true');}
  await p.locator('#reset').click();await p.locator('[data-string="A"]').click();await p.locator('#keep-pitch').check();await p.locator('[data-string="D"]').click();assert.equal(await p.locator('#note-badge').innerText(),'A4');assert.equal(Number(await p.locator('#semitone').inputValue()),7);assert.equal(await p.locator('[data-string="E"]').isDisabled(),true);
  await p.locator('#reset').click();await p.locator('#save-a').click();await showFigure(p,'range');const initialLevel=Number((await p.locator('#loudness-output').innerText()).replace('%',''));await setRange(p,'semitone',12);assert.equal(Number(await p.locator('#distance-number').inputValue()),32);assert.ok(Math.abs(Number((await p.locator('#loudness-output').innerText()).replace('%',''))/initialLevel-.5)<.01);assert.equal(await p.locator('#pitch-caution').isVisible(),true);assert.ok((await p.locator('#comparison-rows').innerText()).includes('A5'));await setRange(p,'distance',16);assert.equal(Number((await p.locator('#loudness-output').innerText()).replace('%','')),initialLevel);await p.locator('.advanced').evaluate(el=>el.open=true);await setRange(p,'fingerLoss',4);assert.equal(Number((await p.locator('#loudness-output').innerText()).replace('%','')),initialLevel);await p.locator('.advanced').evaluate(el=>el.open=false);
  await p.locator('#restore-a').click();assert.equal(await p.locator('#pitch-output').innerText(),'開放弦');
  await setRange(p,'speed',0);assert.equal(await p.locator('#status').innerText(),'弓が止まっています');await setRange(p,'speed',10);
  for(const [values,expected] of [[{force:2},'スカスカ側'],[{force:150},'ギー側'],[{distance:8},'スカスカ側'],[{semitone:12,distance:16},'規則的に鳴る範囲']]){await p.locator('#reset').click();for(const [id,value] of Object.entries(values)){if(id==='force'){await p.locator('#force-number').fill(String(value));await p.locator('#force-number').dispatchEvent('change');}else await setRange(p,id,value);}assert.equal(await p.locator('#status').innerText(),expected);if(expected!=='規則的に鳴る範囲'){assert.equal(await p.locator('#play').isDisabled(),true);const d=await p.locator('#string-path').getAttribute('d');await p.waitForTimeout(80);assert.equal(await p.locator('#string-path').getAttribute('d'),d);}}
  await p.locator('#center-force').click();assert.equal(await p.locator('#status').innerText(),'規則的に鳴る範囲');
  await p.goto(base+'#string=A&semitone=24&distance=65&friction=0.15&bodyLoss=5&tension=100&length=300');await p.waitForSelector('#scope-note');await p.locator('.advanced summary').click();
  assert.equal(await p.locator('#scope-note').isVisible(),true);
  await p.locator('[data-string="G"]').click();await setRange(p,'semitone',1);await setRange(p,'distance',2);await setRange(p,'tension',100);await setRange(p,'speed',60);await setRange(p,'fingerLoss',4);
  assert.equal(await p.locator('#status').innerText(),'緑の帯がない');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await p.screenshot({path:path.join(out,`${name}-${viewport.width}-extreme.png`),fullPage:false});
  await p.locator('#reset').click();await setRange(p,'semitone',24);await setRange(p,'distance',30);await setRange(p,'semitone',0);
  assert.equal(Number(await p.locator('#distance').inputValue()),30);assert.equal(Number(await p.locator('#distance-number').inputValue()),30);
  await p.goto(base+'#string=D&friction=0.8&bodyLoss=2&lock=ratio&semitone=0&distance=32');await p.waitForSelector('#string-path',{state:'attached'});await setRange(p,'semitone',12);assert.equal(Number(await p.locator('#distance-number').inputValue()),32);
  await p.locator('#reset').click();await showFigure(p,'map');assert.equal(await p.locator('#map').isVisible(),true);await p.locator('#map').focus();await p.keyboard.press('ArrowRight');assert.ok(Number(await p.locator('#distance-number').inputValue())>32);
  const rect=await p.locator('#map svg').boundingBox();await p.mouse.click(rect.x+rect.width*.6,rect.y+rect.height*.5);assert.ok(Number(await p.locator('#distance-number').inputValue())!==32);
  await p.locator('#share').click();assert.ok(p.url().includes('string='));const shared=p.url();const force=await p.locator('#force-number').inputValue();await p.goto(shared);assert.equal(await p.locator('#force-number').inputValue(),force);
  await p.locator('#reset').click();
  const downloadPromise=p.waitForEvent('download');await p.locator('#export').click();const download=await downloadPromise;const output=path.join(out,`${name}-${viewport.width}-export.png`);await download.saveAs(output);assert.ok(fs.statSync(output).size>5000);
  await p.locator('.advanced').evaluate(el=>el.open=true);await p.locator('#sources summary').click();
  const overflow=await p.evaluate(()=>{const vw=document.documentElement.clientWidth;return Array.from(document.querySelectorAll('body *')).filter(el=>{if(el instanceof SVGElement)return false;const r=el.getBoundingClientRect();return r.width>0&&(r.left<-.5||r.right>vw+.5);}).map(el=>el.id||el.className||el.tagName);});assert.deepEqual(overflow,[],'overflow: '+overflow.join(','));
  await p.locator('.advanced summary').click();await p.locator('#sources summary').click();await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(200);await p.screenshot({path:path.join(out,`${name}-${viewport.width}.png`),fullPage:true});
  const info=p.getByRole('button',{name:'駒からの距離の説明',exact:true});await info.click();assert.equal(await p.locator('#control-info').isVisible(),true);assert.equal(await p.locator('.info-button').count(),6);if(viewport.width<=670)assert.ok(await p.locator('#control-info').evaluate(el=>el.getBoundingClientRect().height<=innerHeight*.55+.5));assert.ok((await p.locator('#control-info').innerText()).includes('帯では'));assert.equal(await info.evaluate(el=>el.getBoundingClientRect().width>=44&&el.getBoundingClientRect().height>=44),true);await p.keyboard.press('Escape');assert.equal(await p.locator('#control-info').isVisible(),false);assert.equal(await info.evaluate(el=>el===document.activeElement),true);
  if(viewport.width<=390){await showFigure(p,'range');await p.locator('#force').scrollIntoViewIfNeeded();await p.waitForTimeout(100);const stage=await p.locator('#stage').evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight};});assert.ok(stage.top>=0&&stage.bottom<=stage.viewport);assert.ok(stage.height<=stage.viewport*.44+.5);assert.equal(await p.locator('#band').isVisible(),true);await p.screenshot({path:path.join(out,`${name}-${viewport.width}-controls.png`)});await showFigure(p,'motion');assert.equal(await p.locator('#string-figure').isVisible(),true);await showFigure(p,'map');assert.equal(await p.locator('#map').isVisible(),true);}
  if(viewport.width===768||viewport.width===1180){await p.locator('.advanced').evaluate(el=>el.open=true);await setRange(p,'semitone',12);await p.locator('.controls').evaluate(el=>{el.scrollTop=0;el.scrollIntoView({block:'start',behavior:'instant'});});await p.waitForTimeout(100);assert.equal(await p.locator('.controls').evaluate(el=>el.scrollHeight>el.clientHeight),true);const panel=await p.locator('.controls').boundingBox(),windowY=await p.evaluate(()=>scrollY),panelY=await p.locator('.controls').evaluate(el=>el.scrollTop);await p.mouse.move(panel.x+panel.width/2,panel.y+Math.min(panel.height/2,300));await p.mouse.wheel(0,350);await p.waitForTimeout(200);assert.ok(await p.locator('.controls').evaluate(el=>el.scrollTop)>panelY);assert.equal(await p.evaluate(()=>scrollY),windowY);}
  assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(u=>!u.startsWith(new URL(base).origin)&&!u.startsWith('blob:')),[]);
  reports.push({browser:name,width:viewport.width,errors,externalRequests:0,passed:true});fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(reports,null,2));console.log(name,viewport.width,'passed');await context.close();
 }
 const c=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage();await p.goto(base);const first=await p.locator('#string-path').getAttribute('d');await p.waitForTimeout(250);assert.equal(first,await p.locator('#string-path').getAttribute('d'));assert.equal(await p.locator('#play').innerText(),'動かす');await c.close();await browser.close();
}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({date:new Date().toISOString(),base,reports,reducedMotion:true},null,2));console.log(JSON.stringify({passed:reports.length,reducedMotion:true}));
})().catch(e=>{console.error(e);process.exit(1);});
