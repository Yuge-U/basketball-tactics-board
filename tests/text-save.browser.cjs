'use strict';
const {chromium, webkit} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = process.env.CANVAS_ROOT || path.resolve(__dirname, '..');
const live = process.env.SITE_URL;
if (live) assert.equal(live, 'https://yuge-u.github.io/basketball-tactics-board/');
const baseline = process.env.CANVAS_BASELINE === '1';
const results = [], errors = [];
fs.mkdirSync(path.join(root,'reports','text-save'),{recursive:true});
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = pathname.replace(/^\/basketball-tactics-board\//, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  const type = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json'}[path.extname(file)] || 'application/octet-stream';
  res.setHeader('Content-Type', type); res.end(fs.readFileSync(file));
});
const adapter = `
window.saveFixture = {connected:false, calls:[], mode:'pending'};
window.OneDriveStorage = {
 isConfigured:()=>true, isConnected:()=>saveFixture.connected,
 status:()=>({configured:true, connected:saveFixture.connected, state:saveFixture.connected?'connected':'disconnected', username:saveFixture.connected?'synthetic@example.invalid':''}),
 init:async()=>{}, onStatusChange:()=>{}, list:async()=>[],
 save:(folder,name,data)=>{saveFixture.calls.push({folder,name,data}); return new Promise((resolve,reject)=>{saveFixture.finish=()=>saveFixture.mode==='error'?reject(new Error('synthetic save failure')):resolve({id:'synthetic-'+saveFixture.calls.length,relativePath:folder+'/'+name+'.json'});});}
};`;
async function check(label, name, fn) { await fn(); results.push({label,name,pass:true}); console.log('PASS',label,name); }
async function visibleApp(page) { await page.waitForFunction(()=>{const splash=document.querySelector('.zeroone-splash');return !splash||Number(getComputedStyle(splash).opacity)===0;}); }
async function courtPoint(page, item) {
  return page.evaluate(item => { const r=canvas.getBoundingClientRect(); const p=item || {x:400,y:400}; return {x:r.left+viewport.offsetX+(p.x+COURT_OUTER_MARGIN)*viewport.scale,y:r.top+viewport.offsetY+(p.y+COURT_OUTER_MARGIN)*viewport.scale}; }, item);
}
(async () => {
 await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
 const base = live || `http://127.0.0.1:${server.address().port}/basketball-tactics-board/`;
 for (const [engine,type] of Object.entries({chromium,webkit}).filter(([engine])=>!process.env.CANVAS_ENGINE||process.env.CANVAS_ENGINE===engine)) {
  const browser = await type.launch({headless:true});
  try { for (const config of baseline ? [{name:'desktop',width:1280,height:850,dpr:2,entry:'index.html'}] : [
    {name:'desktop',width:1280,height:850,dpr:2,entry:'index.html'},
    {name:'touch',width:390,height:844,dpr:3,entry:'index.html'},
    {name:'legacy-entry',width:1024,height:768,dpr:2,entry:'Basketball_Tactics_Board.html'}
  ].filter(config=>!process.env.CANVAS_CONFIG||process.env.CANVAS_CONFIG===config.name)) {
   const label=engine+' '+config.name;
   const context = await browser.newContext({viewport:{width:config.width,height:config.height},deviceScaleFactor:config.dpr,hasTouch:config.name!=='desktop',serviceWorkers:'block'});
   await context.addInitScript(() => {
    localStorage.setItem('basketball-tactics-terms-v1',JSON.stringify({version:'1.0',acceptedAt:'2026-10-01T00:00:00Z'}));
    localStorage.setItem('basketball-tactics-guide-v1',JSON.stringify({version:'1.0',completedAt:'2026-10-01T00:00:00Z'}));
    localStorage.setItem('synthetic-auth-preserve','unchanged');
    window.canvasAllocations=0;
    window.textKeyEvents=[];window.addEventListener('keydown',event=>textKeyEvents.push({key:event.key,target:event.target.id,composing:event.isComposing}),true);
    for(const key of ['width','height']) { const d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,key); Object.defineProperty(HTMLCanvasElement.prototype,key,{...d,set(value){if(this.id==='tacticsCanvas')window.canvasAllocations++;return d.set.call(this,value);}}); }
   });
   await context.route('**/*', route => {
    const u=new URL(route.request().url());
    if(u.origin!==new URL(base).origin)return route.abort();
    if(u.pathname.endsWith('/1_App/js/onedrive-storage.js'))return route.fulfill({contentType:'text/javascript',body:adapter});
    return route.continue();
   });
   const page=await context.newPage(); page.setDefaultTimeout(15000);
   let prompts=0;
   page.on('pageerror',e=>errors.push({label,message:e.message}));
   page.on('crash',()=>errors.push({label,message:'browser page crashed'}));
   page.on('dialog',d=>{if(d.type()==='prompt'){prompts++;void d.accept('baseline text');}else void d.accept();});
   try {
    await page.goto(base+config.entry+'?brand=20261007k');
    await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true'&&!document.querySelector('dialog[open]'));
    await visibleApp(page);
    await page.locator('#maximizeCourtButton').click();
    await page.waitForFunction(()=>document.body.classList.contains('board-focus')&&canvas.width>0);
    await page.locator('#focusEditorToggleButton').click();
    await page.locator('.focus-tool-button[data-tool="text"]').click();
    await page.locator('#focusEditorToggleButton').click();
    const p=await courtPoint(page);
    await page.mouse.click(p.x,p.y);
    if(baseline) {
      await page.waitForFunction(()=>getActiveStep().texts.length===1);
      await page.evaluate(()=>{window.canvasAllocations=0;for(let i=0;i<20;i++)resizeCanvas();});
      console.log('BASELINE',label,JSON.stringify({nativePrompts:prompts,unchangedSizeAllocations:await page.evaluate(()=>canvasAllocations)}));
      continue;
    }
    await check(label,'T01 expanded text uses in-app input',async()=>{await page.locator('#courtTextDialog').waitFor({state:'visible'});assert.equal(prompts,0);assert(await page.evaluate(()=>isFocusMode));assert.equal(await page.locator('#currentAppVersion').textContent(),'v45');});
    if(config.name==='desktop')await page.screenshot({path:path.join(root,'reports','text-save',engine+'-text-entry.png')});
    const input=page.locator('#courtTextInput');
    await input.fill('スクリーン ');await input.pressSequentially('123');
    await page.evaluate(()=>{const i=document.getElementById('courtTextInput');i.dispatchEvent(new CompositionEvent('compositionstart',{data:'すく'}));i.dispatchEvent(new InputEvent('input',{inputType:'insertCompositionText',data:'スクリーン',isComposing:true}));});
    await input.press('Enter');await page.locator('#courtTextDialog').waitFor({state:'visible'});
    await check(label,'T02 IME and numeric input do not change the court',async()=>{assert.equal(await page.evaluate(()=>getActiveStep().texts.length),0);assert.equal(await page.evaluate(()=>state.activeTool),'text');});
    await page.evaluate(()=>document.getElementById('courtTextInput').dispatchEvent(new CompositionEvent('compositionend',{data:'スクリーン'})));
    await page.locator('#applyCourtTextButton').click();
    await check(label,'T03 submit draws and autosaves Japanese text',async()=>{assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'スクリーン 123');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(AUTOSAVE_KEY)).steps[0].texts[0].text),'スクリーン 123');assert(await page.evaluate(()=>isFocusMode));});
    await page.evaluate(()=>{window.canvasAllocations=0;for(let i=0;i<20;i++)resizeCanvas();});
    await check(label,'T04 unchanged viewport does not reallocate the canvas',async()=>assert.equal(await page.evaluate(()=>canvasAllocations),0));
    const item=await page.evaluate(()=>({...getActiveStep().texts[0]})), edit=await courtPoint(page,item);
    await page.mouse.dblclick(edit.x,edit.y);
    await page.locator('#courtTextDialog').waitFor({state:'visible'});
    await input.fill('変更後のテキスト');
    const beforeUndo=await page.evaluate(()=>undoStack.length);
    await input.press('ControlOrMeta+z');
    await check(label,'T05 input undo leaves court history intact',async()=>{assert.equal(await page.evaluate(()=>undoStack.length),beforeUndo);assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'スクリーン 123');});
    await input.fill('変更後のテキスト');await page.locator('#applyCourtTextButton').click();
    await check(label,'T06 existing text edit keeps its position and style',async()=>{const edited=await page.evaluate(()=>({...getActiveStep().texts[0]}));assert.equal(edited.text,'変更後のテキスト');for(const key of ['id','x','y','font','color','outline','scale','rotation'])assert.equal(edited[key],item[key]);});
    await page.evaluate(()=>undo());await check(label,'T07 court undo restores previous text',async()=>assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'スクリーン 123'));
    await page.mouse.dblclick(edit.x,edit.y);await input.fill('破棄する入力');await page.locator('#cancelCourtTextButton').click();
    await check(label,'T08 cancel does not mutate or save text',async()=>assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'スクリーン 123'));
    await page.mouse.dblclick(edit.x,edit.y);await input.fill('   ');await page.locator('#applyCourtTextButton').click();
    await check(label,'T09 blank input does not mutate text',async()=>assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'スクリーン 123'));
    await page.mouse.dblclick(edit.x,edit.y);await page.locator('#courtTextDialog').waitFor({state:'visible'});const nativeFullscreen=await page.evaluate(()=>Boolean(document.fullscreenElement));await input.press('Escape');
    await page.waitForFunction(()=>!document.getElementById('courtTextDialog').open||!document.fullscreenElement);
    await check(label,'T10 Escape preserves text across native fullscreen handling',async()=>{if(await page.locator('#courtTextDialog').isVisible()){assert(nativeFullscreen);assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),false);assert.equal(await input.inputValue(),'スクリーン 123');await page.locator('#cancelCourtTextButton').click();}await page.locator('#courtTextDialog').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'スクリーン 123');});
    await page.evaluate(()=>setFocusMode(false));await page.waitForFunction(()=>!isFocusMode);
    await page.locator('#playName').fill('合成保存テスト');
    await page.evaluate(()=>{saveFixture.connected=true;updateOneDriveInterface();});
    await page.locator('#savePlayButton').click();await page.waitForFunction(()=>saveFixture.calls.length===1);
    await check(label,'T11 saving status and disabled button stay visible',async()=>{assert.equal(await page.locator('#saveProgress').innerText(),'保存中…');assert(await page.locator('#saveProgress').isVisible());assert(await page.locator('#savePlayButton').isDisabled());assert.equal(await page.locator('#savePlayButton').getAttribute('aria-busy'),'true');});
    if(config.name==='desktop')await page.screenshot({path:path.join(root,'reports','text-save',engine+'-saving.png')});
    await page.evaluate(()=>{savePlayToLibrary();savePlayToLibrary();});
    await page.waitForTimeout(2100);
    await check(label,'T12 slow save and repeated calls remain single-flight',async()=>{assert.equal(await page.evaluate(()=>saveFixture.calls.length),1);assert(await page.locator('#saveProgress').isVisible());});
    await page.evaluate(()=>saveFixture.finish());await page.waitForFunction(()=>!document.getElementById('savePlayButton').disabled);
    await check(label,'T13 successful save hides progress and retains payload',async()=>{assert.equal(await page.locator('#saveProgress').isVisible(),false);const payload=await page.evaluate(()=>saveFixture.calls[0].data);assert.equal(payload.snapshot.steps[0].texts[0].text,'スクリーン 123');assert.match(await page.locator('#toast').innerText(),/保存しました/);});
    await page.locator('#playName').fill('合成失敗テスト');await page.evaluate(()=>{saveFixture.mode='error';});
    await page.locator('#savePlayButton').click();await page.waitForFunction(()=>saveFixture.calls.length===2);await page.evaluate(()=>saveFixture.finish());await page.waitForFunction(()=>!document.getElementById('savePlayButton').disabled);
    await check(label,'T14 failure clears progress and keeps local text',async()=>{assert.equal(await page.locator('#saveProgress').isVisible(),false);assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'スクリーン 123');});
    await page.evaluate(()=>{saveFixture.connected=false;});await page.locator('#savePlayButton').click();await page.waitForFunction(()=>!document.getElementById('savePlayButton').disabled);
    await check(label,'T15 disconnected save makes no cloud write',async()=>{assert.equal(await page.evaluate(()=>saveFixture.calls.length),2);assert.equal(await page.locator('#saveProgress').isVisible(),false);assert.equal(await page.evaluate(()=>localStorage.getItem('synthetic-auth-preserve')),'unchanged');});
    await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.appReady==='true');
    await visibleApp(page);
    await check(label,'T16 reopen retains text and auth marker',async()=>{assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'スクリーン 123');assert.equal(await page.evaluate(()=>localStorage.getItem('synthetic-auth-preserve')),'unchanged');assert.equal(prompts,0);});
    await page.locator('[data-tool="text"]').first().click();const normal=await courtPoint(page,{x:550,y:550});await page.mouse.click(normal.x,normal.y);await input.fill('通常画面の文字');await page.locator('#applyCourtTextButton').click();
    await check(label,'T17 normal view uses the same text entry and preserves existing text',async()=>{assert.deepEqual(await page.evaluate(()=>getActiveStep().texts.map(t=>t.text)),['スクリーン 123','通常画面の文字']);});
    await page.locator('#addStepButton').click();await page.locator('#previousFrameButton').click();await page.locator('#nextFrameButton').click();
    await check(label,'T18 step copy and frame controls retain text',async()=>{assert.equal(await page.evaluate(()=>state.steps.length),2);assert.deepEqual(await page.evaluate(()=>getActiveStep().texts.map(t=>t.text)),['スクリーン 123','通常画面の文字']);assert.equal(await page.evaluate(()=>localStorage.getItem('synthetic-auth-preserve')),'unchanged');});
    const racePoint=await courtPoint(page,await page.evaluate(()=>({...getActiveStep().texts[0]})));
    await page.evaluate(async p=>{const closed=new Promise(resolve=>courtTextDialog.addEventListener('close',resolve,{once:true}));const edit=()=>canvas.dispatchEvent(new MouseEvent('dblclick',{clientX:p.x,clientY:p.y,bubbles:true}));edit();courtTextDialog.close();edit();await closed;},racePoint);
    await input.fill('開き直した入力');await page.locator('#applyCourtTextButton').click();
    await check(label,'T19 delayed close does not discard a reopened text edit',async()=>{assert.equal(await page.evaluate(()=>getActiveStep().texts[0].text),'開き直した入力');assert.equal(await page.evaluate(()=>state.steps[0].texts[0].text),'スクリーン 123');});
    await page.screenshot({path:path.join(root,'reports','text-save',label.replaceAll(' ','-')+'.png'),fullPage:true});
   } catch(e) {const diagnostics=await page.evaluate(()=>({active:document.activeElement?.id,fullscreen:document.fullscreenElement?.tagName,focus:isFocusMode,dialog:document.getElementById('courtTextDialog')?.open,composing:courtTextComposing,keys:textKeyEvents.slice(-6)})).catch(()=>null);errors.push({label,message:e.stack,diagnostics});console.error('FAIL',label,e.message,JSON.stringify(diagnostics));} finally {await context.close();}
  } } finally {await browser.close();}
 }
})().catch(e=>errors.push({message:e.stack})).finally(()=>{
 server.close();const dir=path.join(root,'reports','text-save');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,baseline?'baseline.json':'results.json'),JSON.stringify({baseline,results,errors},null,2));if(errors.length)process.exitCode=1;
});
