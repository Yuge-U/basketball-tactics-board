'use strict';
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'reports', 'keyboard-coaching');
fs.mkdirSync(reportDir, { recursive: true });
const results = [], errors = [];
const browserVersions = {};
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, pathname.slice(1) || 'index.html');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
const adapter = `window.keyboardSave = {calls:[]};
window.OneDriveStorage = {
 isConfigured:()=>true, isConnected:()=>true,
 status:()=>({configured:true,connected:true,state:'connected',username:'synthetic@example.invalid'}),
 init:async()=>{}, onStatusChange:()=>{}, list:async()=>[],
 save:(folder,name,data)=>{keyboardSave.calls.push({folder,name,data});return new Promise(resolve=>keyboardSave.finish=()=>resolve({id:'keyboard-save',relativePath:folder+'/'+name+'.json'}));}
};`;
async function check(label, name, fn) {
  try { await fn(); results.push({ label, name, pass: true }); console.log('PASS', label, name); }
  catch (error) { results.push({ label, name, pass: false, error: error.message }); throw error; }
}
async function ready(page) {
  await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true' && !document.querySelector('dialog[open]'));
  await page.waitForFunction(() => !document.querySelector('.zeroone-splash') || getComputedStyle(document.querySelector('.zeroone-splash')).visibility === 'hidden');
}
async function courtPoint(page, point) {
  return page.evaluate(point => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + viewport.offsetX + (point.x + COURT_OUTER_MARGIN) * viewport.scale,
      y: rect.top + viewport.offsetY + (point.y + COURT_OUTER_MARGIN) * viewport.scale };
  }, point);
}
async function clickObject(page, point) {
  const p = await courtPoint(page, point);
  await page.mouse.click(p.x, p.y);
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/`;
  for (const [engine, type] of Object.entries({ chromium, webkit }).filter(([name]) => !process.env.CANVAS_ENGINE || name === process.env.CANVAS_ENGINE)) {
    const browser = await type.launch({ headless: true });
    browserVersions[engine] = browser.version();
    try {
      for (const config of [
        { name: 'desktop', width: 1440, height: 900, entry: 'index.html' },
        { name: 'touch', width: 390, height: 844, entry: 'index.html' },
        { name: 'tablet-legacy', width: 1024, height: 768, entry: 'Basketball_Tactics_Board.html' }
      ].filter(config => !process.env.CANVAS_CONFIG || config.name === process.env.CANVAS_CONFIG)) {
        const label = `${engine} ${config.name}`;
        const context = await browser.newContext({ viewport: { width: config.width, height: config.height },
          hasTouch: config.name !== 'desktop', deviceScaleFactor: 2, serviceWorkers: 'block' });
        await context.addInitScript(() => {
          localStorage.setItem('basketball-tactics-terms-v1', JSON.stringify({ version: '1.0', acceptedAt: '2026-10-01T00:00:00Z' }));
          localStorage.setItem('basketball-tactics-guide-v1', JSON.stringify({ version: '1.0', completedAt: '2026-10-01T00:00:00Z' }));
        });
        await context.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.origin !== new URL(base).origin) return route.abort();
          if (url.pathname.endsWith('/onedrive-storage.js')) return route.fulfill({ contentType: 'text/javascript', body: adapter });
          return route.continue();
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push({ label, message: error.message }));
        page.on('dialog', dialog => void dialog.accept());
        try {
          await page.goto(base + config.entry); await ready(page);
          await page.evaluate(() => {
            const fixture = createInitialState();
            fixture.schemaVersion = SCHEMA_VERSION;
            fixture.steps = Array.from({ length: 3 }, (_, i) => {
              const step = JSON.parse(JSON.stringify(fixture.steps[0]));
              step.id = `shortcut-step-${i}`; step.label = `STEP ${i + 1}`;
              step.players[0].x = 200; step.players[0].y = 300;
              step.players[1].x = 200; step.players[1].y = 500;
              step.lines = step.players.slice(0, 2).map((player, index) => ({
                id: `move-${i}-${index}`, type: 'move', playerId: player.id,
                start: { x: player.x, y: player.y }, end: { x: 700, y: player.y },
                points: [{ x: player.x, y: player.y }, { x: 700, y: player.y }], color: 'black', playOrder: 1
              }));
              return step;
            });
            fixture.activeStepId = fixture.steps[0].id;
            applySnapshot(fixture); resizeCanvas(); canvas.focus();
          });
          await check(label, 'K01 letter tools and existing digit tools', async () => {
            for (const [key, tool] of Object.entries({ v: 'select', m: 'move', d: 'dribbleFree', p: 'pass', s: 'screenFree', t: 'text',
              1: 'select', 2: 'move', 3: 'pass', 4: 'dribbleFree', 5: 'dribbleStraight', 6: 'screenFree', 7: 'screenStraight', 8: 'free', 9: 'erase', 0: 'text' })) {
              await page.keyboard.press(key); assert.equal(await page.evaluate(() => state.activeTool), tool);
            }
            await page.keyboard.press('v');
          });
          await check(label, 'K02 Space pauses both parallel movements and resumes at the same position', async () => {
            await page.keyboard.press('Space');
            await page.waitForFunction(() => playbackVisual?.players[getActiveStep().players[0].id]?.x > 210);
            await page.keyboard.press('Space');
            const frozen = await page.evaluate(() => JSON.stringify(playbackVisual));
            await page.waitForTimeout(450);
            assert.equal(await page.evaluate(() => JSON.stringify(playbackVisual)), frozen);
            assert(await page.evaluate(() => playbackTimer !== null && playbackPausedAt !== null));
            await page.keyboard.press('Space');
            await page.waitForFunction(() => playbackVisual?.players[getActiveStep().players[0].id]?.x > 350);
            await page.keyboard.press('ArrowRight');
            assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-1');
            assert.equal(await page.evaluate(() => playbackTimer), null);
            await page.keyboard.press('Space');
            await page.waitForFunction(() => playbackVisual !== null);
            // Old cancelled parallel animations must not clear the new run's preview.
            await page.waitForTimeout(80); assert(await page.evaluate(() => playbackVisual !== null));
            await page.keyboard.press('Escape');
            assert.equal(await page.evaluate(() => playbackVisual), null);
          });
          await check(label, 'K03 arrows and Shift arrows select whole STEPs while playing or paused', async () => {
            await page.keyboard.press('Shift+ArrowRight'); assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-2');
            await page.keyboard.press('ArrowRight'); assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-2');
            await page.keyboard.press('ArrowLeft'); assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-1');
            await page.keyboard.press('Shift+ArrowLeft'); assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-0');
            await page.keyboard.press('ArrowLeft'); assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-0');
            await page.keyboard.press('Space'); await page.keyboard.press('Space');
            await page.keyboard.press('ArrowRight');
            assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-1');
            assert.equal(await page.evaluate(() => playbackTimer), null);
          });
          await check(label, 'K04 R restarts at the first STEP and Esc ends playback', async () => {
            await page.keyboard.press('R'); assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-0');
            assert(await page.evaluate(() => playbackTimer !== null));
            await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => playbackTimer), null);
            assert.equal(await page.evaluate(() => state.activeTool), 'select');
          });
          await check(label, 'K05 speed range, both panels and autosave stay synchronized', async () => {
            await page.keyboard.press('+'); assert.equal(await page.evaluate(() => state.playbackSpeed), 1.25);
            await page.keyboard.press('-'); assert.equal(await page.evaluate(() => state.playbackSpeed), 1);
            for (let i = 0; i < 8; i++) await page.keyboard.press('+');
            assert.equal(await page.evaluate(() => state.playbackSpeed), 2);
            for (let i = 0; i < 8; i++) await page.keyboard.press('-');
            assert.equal(await page.evaluate(() => state.playbackSpeed), 0.5);
            assert.equal(await page.locator('#focusPlaybackSpeedRange').inputValue(), '0.5');
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(AUTOSAVE_KEY)).playbackSpeed), 0.5);
            await page.keyboard.press('+'); await page.keyboard.press('+');
          });
          await check(label, 'K06 input, textarea, select and nested contenteditable retain native keys', async () => {
            const before = await page.evaluate(() => JSON.stringify(createSnapshot()));
            for (const tag of ['input', 'textarea', 'select', 'div']) {
              await page.evaluate(tag => {
                const el = document.createElement(tag); el.id = 'typing-fixture';
                if (tag === 'div') { el.contentEditable = 'true'; el.innerHTML = '<span>編集欄</span>'; }
                if (tag === 'select') el.innerHTML = '<option>選択欄</option>';
                document.body.appendChild(el); el.focus();
              }, tag);
              for (const key of ['m', 'c', 'Space', 'ArrowRight', '?', 'Delete', 'Control+z', 'Meta+Shift+z', 'Control+s']) await page.keyboard.press(key);
              assert.equal(await page.evaluate(() => JSON.stringify(createSnapshot())), before);
              assert.equal(await page.evaluate(() => keyboardSave.calls.length), 0);
              await page.evaluate(() => { document.getElementById('typing-fixture').remove(); canvas.focus(); });
            }
          });
          await check(label, 'K07 IME composition and legacy keyCode 229 suppress shortcuts', async () => {
            await page.evaluate(() => window.dispatchEvent(new CompositionEvent('compositionstart')));
            await page.keyboard.press('m'); await page.keyboard.press('c');
            assert.equal(await page.evaluate(() => state.activeTool), 'select'); assert.equal(await page.evaluate(() => isCoachingMode), false);
            await page.evaluate(() => { window.dispatchEvent(new CompositionEvent('compositionend')); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', keyCode: 229, bubbles: true })); });
            assert.equal(await page.evaluate(() => isCoachingMode), false);
            await page.keyboard.press('m'); assert.equal(await page.evaluate(() => state.activeTool), 'move'); await page.keyboard.press('v');
          });
          await check(label, 'K08 modifiers, handled events and long presses never execute extra commands', async () => {
            for (const key of ['Alt+m', 'Control+m', 'Meta+1', 'Shift+s', 'Control+Shift+s', 'Control+Meta+z']) await page.keyboard.press(key);
            assert.equal(await page.evaluate(() => state.activeTool), 'select');
            const suppressed = await page.evaluate(() => {
              const values = [];
              for (const key of ['c', ' ', 'ArrowRight', '+', 'r', 'Delete']) {
                const event = new KeyboardEvent('keydown', { key, repeat: true, bubbles: true, cancelable: true });
                canvas.dispatchEvent(event); values.push(event.defaultPrevented);
              }
              const handled = new KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true }); handled.preventDefault(); canvas.dispatchEvent(handled);
              const altGraph = new KeyboardEvent('keydown', { key: 'c', modifierAltGraph: true, bubbles: true }); canvas.dispatchEvent(altGraph);
              return values;
            });
            assert(suppressed.every(Boolean)); assert.equal(await page.evaluate(() => isCoachingMode), false);
            assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-0');
            assert.equal(await page.evaluate(() => state.playbackSpeed), 1);
          });
          await check(label, 'K09 all existing dialogs own their keyboard actions', async () => {
            const count = await page.locator('dialog').count();
            for (let i = 0; i < count; i++) {
              await page.locator('dialog').nth(i).evaluate(dialog => { dialog.showModal(); dialog.focus(); });
              await page.keyboard.press('m'); await page.keyboard.press('c'); await page.keyboard.press('Control+s');
              assert.equal(await page.evaluate(() => state.activeTool), 'select'); assert.equal(await page.evaluate(() => isCoachingMode), false);
              await page.locator('dialog').nth(i).evaluate(dialog => dialog.close());
            }
            await page.evaluate(() => canvas.focus());
          });
          await check(label, 'K10 ? opens a nonmodal guide and toggles exactly once', async () => {
            await page.keyboard.press('?'); assert(await page.locator('#shortcutGuide').isVisible());
            await page.keyboard.press('m'); assert.equal(await page.evaluate(() => state.activeTool), 'move');
            await page.keyboard.press('?'); assert.equal(await page.locator('#shortcutGuide').isVisible(), false);
            await page.keyboard.press('?'); await page.keyboard.press('Escape'); assert.equal(await page.locator('#shortcutGuide').isVisible(), false);
          });
          await check(label, 'K11 coaching fits every court orientation and viewport without changing data', async () => {
            const saved = await page.evaluate(() => { window.scrollTo(0, 80); return { snapshot: createSnapshot(), history: undoStack.length }; });
            await page.keyboard.press('c'); assert(await page.evaluate(() => isCoachingMode && isFocusMode && !document.fullscreenElement));
            assert.equal(await page.locator('.topbar').isVisible(), false);
            assert.equal(await page.locator('#focusEditorPanel').isVisible(), false);
            for (const [width, height] of [[1440, 900], [900, 1440], [640, 360], [390, 844]]) {
              await page.setViewportSize({ width, height });
              await page.waitForFunction(() => Math.abs(viewport.cssWidth - innerWidth) < 1 && Math.abs(viewport.cssHeight - innerHeight) < 1, null, { timeout: 5000 })
                .catch(async error => { throw new Error(error.message + JSON.stringify(await page.evaluate(() => ({ viewport,
                  width: innerWidth, height: innerHeight, coaching: isCoachingMode, focus: isFocusMode,
                  shell: canvasShell.getBoundingClientRect().toJSON(), canvas: canvas.getBoundingClientRect().toJSON(),
                  workspace: document.querySelector('.workspace').getBoundingClientRect().toJSON() })))); });
              for (const mode of ['half', 'full']) {
                await page.evaluate(mode => changeCourtMode(mode), mode);
                for (let i = 0; i < 4; i++) {
                  await page.evaluate(() => rotateCourtAndPlay());
                  const bounds = await page.evaluate(() => {
                    const rect = canvas.getBoundingClientRect(), size = getCourtDisplaySize();
                    return { x: rect.left + viewport.offsetX, y: rect.top + viewport.offsetY,
                      right: rect.left + viewport.offsetX + size.width * viewport.scale,
                      bottom: rect.top + viewport.offsetY + size.height * viewport.scale, width: innerWidth, height: innerHeight,
                      scale: viewport.scale, maximumScale: Math.min(innerWidth / size.width, innerHeight / size.height) };
                  });
                  assert(bounds.x >= -1 && bounds.y >= -1 && bounds.right <= bounds.width + 1 && bounds.bottom <= bounds.height + 1, JSON.stringify(bounds));
                  assert(Math.abs(bounds.scale - bounds.maximumScale) < 0.001, JSON.stringify(bounds));
                }
              }
            }
            await page.evaluate(saved => { applySnapshot(saved.snapshot); resizeCanvas(); undoStack.length = saved.history; updateHistoryButtons(); }, saved);
            await page.setViewportSize({ width: config.width, height: config.height });
            await page.waitForFunction(() => Math.abs(viewport.cssWidth - innerWidth) < 1 && Math.abs(viewport.cssHeight - innerHeight) < 1);
            if (config.name === 'desktop') {
              await page.screenshot({ path: path.join(reportDir, `${engine}-coaching.png`) });
              await page.keyboard.press('?');
              await page.screenshot({ path: path.join(reportDir, `${engine}-guide.png`) });
              await page.keyboard.press('?');
            }
            await page.keyboard.press('c'); await page.waitForTimeout(80);
            assert.equal(await page.evaluate(() => isCoachingMode || isFocusMode), false);
            assert.deepEqual(await page.evaluate(() => createSnapshot()), saved.snapshot);
            assert.equal(await page.evaluate(() => undoStack.length), saved.history);
            assert(await page.locator('.topbar').isVisible());
          });
          await check(label, 'K12 coaching restores an existing expanded editor and STEP dock', async () => {
            await page.evaluate(() => { setFocusMode(true, false); setFocusEditorOpen(true); setFocusPlaybackSettingsOpen(true); state.focusShowSteps = true; syncFocusVisibility(); canvas.focus(); });
            await page.keyboard.press('c'); await page.keyboard.press('c'); await page.waitForTimeout(80);
            assert(await page.evaluate(() => isFocusMode && isFocusEditorOpen && isFocusPlaybackSettingsOpen && state.focusShowSteps));
            await page.evaluate(() => { setFocusMode(false); canvas.focus(); }); await page.waitForTimeout(80);
          });
          // Use the same expanded canvas for keyboard tools and pointer editing on every screen size.
          await page.keyboard.press('c'); await page.waitForTimeout(80);
          await check(label, 'K13 coaching keeps text editing, Delete/Backspace and both Undo/Redo modifiers', async () => {
            await page.keyboard.press('t'); await clickObject(page, { x: 400, y: 400 });
            await page.locator('#courtTextInput').fill('練習のポイント'); await page.locator('#applyCourtTextButton').click();
            await page.evaluate(() => canvas.focus());
            for (const [modifier, deletion] of [['Control', 'Delete'], ['Meta', 'Backspace']]) {
              await page.keyboard.press(deletion); assert.equal(await page.evaluate(() => getActiveStep().texts.length), 0);
              await page.keyboard.press(`${modifier}+z`); assert.equal(await page.evaluate(() => getActiveStep().texts[0].text), '練習のポイント');
              await page.keyboard.press(`${modifier}+Shift+z`); assert.equal(await page.evaluate(() => getActiveStep().texts.length), 0);
              await page.keyboard.press(`${modifier}+z`);
              await clickObject(page, await page.evaluate(() => ({ ...getActiveStep().texts[0] })));
            }
            await page.keyboard.press('Delete'); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+y');
            assert.equal(await page.evaluate(() => getActiveStep().texts.length), 0); await page.keyboard.press('Control+z');
          });
          await check(label, 'K14 Escape discards a partial line and restores a partial player drag', async () => {
            const player = await page.evaluate(() => ({ ...getActiveStep().players[0] }));
            const start = await courtPoint(page, player), end = await courtPoint(page, { x: player.x + 50, y: player.y + 40 });
            const before = await page.evaluate(() => JSON.stringify(createSnapshot()));
            await page.keyboard.press('m'); await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y);
            await page.keyboard.press('Escape'); await page.mouse.up();
            assert.equal(await page.evaluate(() => JSON.stringify(createSnapshot())), before);
            await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(end.x, end.y);
            await page.keyboard.press('Escape'); await page.mouse.up();
            assert.equal(await page.evaluate(() => JSON.stringify(createSnapshot())), before);
            assert.equal(await page.evaluate(() => selectedCanvasItem), null);
          });
          await check(label, 'K15 selected lines, players, cones and secondary balls use existing deletion rules', async () => {
            for (const [type, point] of [['line', { x: 550, y: 300 }], ['player', { x: 200, y: 300 }]]) {
              await clickObject(page, point); assert.equal(await page.evaluate(() => selectedCanvasItem?.type), type,
                JSON.stringify(await page.evaluate(() => ({ step: getActiveStep(), activeTool: state.activeTool, selectedCanvasItem, viewport, shell: canvas.getBoundingClientRect().toJSON() }))));
              const before = await page.evaluate(() => JSON.stringify(createSnapshot()));
              await page.keyboard.press('Delete'); assert.notEqual(await page.evaluate(() => JSON.stringify(createSnapshot())), before);
              await page.keyboard.press('Control+z'); assert.equal(await page.evaluate(() => JSON.stringify(createSnapshot())), before);
            }
            await page.evaluate(() => { addCone('red'); adjustBallCount(1); });
            for (const type of ['cone', 'ball']) {
              const item = await page.evaluate(type => type === 'cone' ? getActiveStep().cones.at(-1) : getStepBalls(getActiveStep()).at(-1), type);
              await clickObject(page, item); assert.equal(await page.evaluate(() => selectedCanvasItem?.type), type);
              await page.keyboard.press('Backspace');
            }
            const primary = await page.evaluate(() => ({ ...getPrimaryBall(getActiveStep()) }));
            await clickObject(page, primary); await page.keyboard.press('Delete');
            assert.equal(await page.evaluate(() => getStepBalls(getActiveStep()).length), 1);
            await page.locator('#imageImportInput').setInputFiles({ name: 'fixture.svg', mimeType: 'image/svg+xml',
              buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="blue"/></svg>') });
            await page.waitForFunction(() => getActiveStep().media.length === 1);
            await page.evaluate(() => canvas.focus());
            const media = await page.evaluate(() => ({ ...getActiveStep().media[0] }));
            await page.keyboard.press('Delete'); assert.equal(await page.evaluate(() => getActiveStep().media.length), 0);
            await page.keyboard.press('Control+z'); assert.deepEqual(await page.evaluate(() => getActiveStep().media[0]), media);
          });
          await check(label, 'K16 Cmd/Ctrl+S shares save, blocks repeat writes and reloads unchanged JSON', async () => {
            await page.evaluate(() => { state.playName = 'Keyboard fixture'; playNameInput.value = state.playName; autosave(); canvas.focus(); });
            const before = await page.evaluate(() => createSnapshot());
            await page.keyboard.press('Meta+s'); await page.waitForFunction(() => keyboardSave.calls.length === 1);
            await page.keyboard.press('Control+s'); assert.equal(await page.evaluate(() => keyboardSave.calls.length), 1);
            assert(await page.locator('#savePlayButton').isDisabled());
            assert.deepEqual(await page.evaluate(() => keyboardSave.calls[0].data.snapshot), before);
            await page.evaluate(() => keyboardSave.finish()); await page.waitForFunction(() => !playSaveInProgress);
            assert(await page.evaluate(() => isCoachingMode));
            const snapshot = await page.evaluate(() => createSnapshot());
            const downloadPromise = page.waitForEvent('download'); await page.evaluate(() => exportJson()); const download = await downloadPromise;
            const payload = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
            assert.deepEqual(payload.snapshot, snapshot);
            assert.equal(payload.snapshot.schemaVersion, 18);
            assert.equal('isCoachingMode' in payload.snapshot, false);
            await page.reload(); await ready(page);
            assert.deepEqual(await page.evaluate(() => createSnapshot()), snapshot);
            await page.locator('#importJsonInput').setInputFiles({ name: 'keyboard.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
            assert.deepEqual(await page.evaluate(() => createSnapshot()), snapshot);
          });
          await check(label, 'K17 Space and arrows prevent browser scroll and focused-button activation', async () => {
            await page.locator('#savePlayButton').focus();
            const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
            await page.keyboard.press('Space'); assert.equal(await page.evaluate(() => keyboardSave.calls.length), 0);
            await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
            assert.deepEqual(await page.evaluate(() => ({ x: scrollX, y: scrollY })), scroll);
            assert.equal(await page.evaluate(() => playbackTimer), null);
          });
          await check(label, 'K18 pause freezes STEP waiting time and existing buttons still stop playback', async () => {
            const snapshot = await page.evaluate(() => createSnapshot());
            await page.evaluate(() => { state.steps.forEach(step => { step.lines = []; }); canvas.focus(); });
            await page.keyboard.press('r'); await page.keyboard.press('Space');
            await page.waitForTimeout(900);
            assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-0');
            await page.keyboard.press('Space');
            await page.waitForFunction(() => playbackTimer === null);
            assert.equal(await page.evaluate(() => state.activeStepId), 'shortcut-step-2');
            await page.locator('#playStepsButton').click();
            assert(await page.evaluate(() => playbackTimer !== null));
            await page.locator('#playStepsButton').click(); assert.equal(await page.evaluate(() => playbackTimer), null);
            await page.evaluate(snapshot => { applySnapshot(snapshot); resizeCanvas(); canvas.focus(); }, snapshot);
          });
          await check(label, 'K19 coaching toggles preserve running and paused playback', async () => {
            const snapshot = await page.evaluate(() => createSnapshot());
            await page.keyboard.press('r');
            const runId = await page.evaluate(() => playbackTimer);
            await page.keyboard.press('c'); assert.equal(await page.evaluate(() => playbackTimer), runId);
            await page.keyboard.press('Space');
            const preview = await page.evaluate(() => JSON.stringify(playbackVisual));
            await page.keyboard.press('c'); await page.waitForTimeout(100);
            assert.equal(await page.evaluate(() => JSON.stringify(playbackVisual)), preview);
            assert.equal(await page.evaluate(() => playbackTimer), runId);
            await page.keyboard.press('Escape');
            assert.deepEqual(await page.evaluate(() => createSnapshot().steps), snapshot.steps);
          });
        } finally { await context.close(); }
      }
    } finally { await browser.close(); }
  }
  assert.deepEqual(errors, []);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify({ platform: process.platform, browserVersions, results, errors }, null, 2));
  server.close();
});
