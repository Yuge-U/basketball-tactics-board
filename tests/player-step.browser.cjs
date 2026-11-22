'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const results = [], errors = [];
const reportDir = path.join(root, 'reports', 'player-step');
fs.mkdirSync(reportDir, { recursive: true });
const server = http.createServer((req, res) => {
  const name = new URL(req.url, 'http://localhost').pathname.replace(/^\/basketball-tactics-board\//, '') || 'index.html';
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
const storageAdapter = `window.OneDriveStorage={isConfigured:()=>true,isConnected:()=>false,status:()=>({configured:true,connected:false,state:'disconnected'}),init:async()=>{},onStatusChange:()=>{},list:async()=>[]};`;
async function check(label, name, run) {
  await run(); results.push({ label, name, pass: true }); console.log('PASS', label, name);
}
async function ready(page) {
  await page.waitForFunction(() => document.documentElement.dataset.appReady === 'true' && !document.querySelector('dialog[open]'));
  await page.waitForFunction(() => !document.querySelector('.zeroone-splash') || getComputedStyle(document.querySelector('.zeroone-splash')).visibility === 'hidden');
}
async function fixture(page, actions = false) {
  return page.evaluate(actions => {
    if (playbackTimer) stopPlayback(false);
    const snapshot = createInitialState(); snapshot.schemaVersion = SCHEMA_VERSION;
    const step = snapshot.steps[0]; step.id = 'player-step-source'; step.label = 'STEP 1'; step.note = '元のコーチングポイント';
    step.players = [
      { id: 'p1', label: '1', side: 'offense', x: 200, y: 300 },
      { id: 'p2', label: '2', side: 'offense', x: 650, y: 600 },
      { id: 'p3', label: '3', side: 'offense', x: 800, y: 750 }
    ];
    step.balls = [{ id: 'b1', label: '1', x: 255, y: 275 }, { id: 'b2', label: '2', x: 705, y: 575 }, { id: 'free-ball', label: '3', x: 450, y: 300 }];
    step.ball = step.balls[0];
    step.cones = [{ id: 'cone', x: 850, y: 150, color: 'orange' }]; step.texts = []; step.media = [];
    const line = (id, type, start, end, extra) => ({ id, type, start, end, points: [start, end], color: 'black', ...extra });
    step.lines = actions ? [
      line('move', 'move', { x: 200, y: 300 }, { x: 400, y: 300 }, { playerId: 'p1', playOrder: 1 }),
      line('dribble', 'dribbleStraight', { x: 400, y: 300 }, { x: 600, y: 300 }, { playerId: 'p1', ballId: 'b1', playOrder: 2 }),
      line('pass', 'pass', { x: 705, y: 575 }, { x: 800, y: 550 }, { ballId: 'b2', playOrder: 1 }),
      line('screen', 'screenStraight', { x: 650, y: 600 }, { x: 700, y: 650 }, { playerId: 'p2', playOrder: 1 })
    ] : [];
    snapshot.steps = [step]; snapshot.activeStepId = step.id;
    applySnapshot(snapshot); setTool('select'); undoStack.length = 0; redoStack.length = 0; resizeCanvas(); canvas.focus();
    return createSnapshot();
  }, actions);
}
async function courtPoint(page, point) {
  await page.locator('#tacticsCanvas').scrollIntoViewIfNeeded();
  return page.evaluate(point => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + viewport.offsetX + (point.x + COURT_OUTER_MARGIN) * viewport.scale,
      y: r.top + viewport.offsetY + (point.y + COURT_OUTER_MARGIN) * viewport.scale };
  }, point);
}
async function drag(page, start, end, release = true) {
  const a = await courtPoint(page, start), b = await courtPoint(page, end);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  if (release) await page.mouse.up();
}
async function snapshot(page) { return page.evaluate(() => createSnapshot()); }
let inputTolerance = 1.5;
// WebKit rounds pointer coordinates to CSS pixels on narrow touch viewports.
const near = (actual, expected) => { assert(Math.abs(actual.x - expected.x) < inputTolerance, `x ${actual.x} != ${expected.x}`); assert(Math.abs(actual.y - expected.y) < inputTolerance, `y ${actual.y} != ${expected.y}`); };
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.SITE_URL || `http://127.0.0.1:${server.address().port}/basketball-tactics-board/`;
  if (process.env.SITE_URL) assert.equal(base, 'https://yuge-u.github.io/basketball-tactics-board/');
  for (const [engine, type] of Object.entries({ chromium, webkit }).filter(([name]) => !process.env.CANVAS_ENGINE || name === process.env.CANVAS_ENGINE)) {
    const browser = await type.launch({ headless: true });
    try {
      for (const config of [
        { name: 'desktop', width: 1440, height: 1000, entry: 'index.html' },
        { name: 'touch', width: 390, height: 844, entry: 'index.html' },
        { name: 'tablet-legacy', width: 1024, height: 900, entry: 'Basketball_Tactics_Board.html' }
      ].filter(config => !process.env.CANVAS_CONFIG || config.name === process.env.CANVAS_CONFIG)) {
        const label = engine + ' ' + config.name;
        const context = await browser.newContext({ viewport: { width: config.width, height: config.height }, hasTouch: config.name !== 'desktop', serviceWorkers: 'block' });
        await context.addInitScript(() => {
          localStorage.setItem('basketball-tactics-terms-v1', JSON.stringify({ version: '1.0', acceptedAt: '2026-10-01' }));
          localStorage.setItem('basketball-tactics-guide-v1', JSON.stringify({ version: '1.0', completedAt: '2026-10-01' }));
          localStorage.setItem('player-step.auth-sentinel', 'keep');
        });
        await context.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.origin !== new URL(base).origin) return route.abort();
          if (url.pathname.endsWith('/onedrive-storage.js')) return route.fulfill({ contentType: 'text/javascript', body: storageAdapter });
          return route.continue();
        });
        const page = await context.newPage(); page.setDefaultTimeout(15000);
        page.on('pageerror', error => errors.push({ label, message: error.message }));
        try {
          await page.goto(base + config.entry); await ready(page);
          inputTolerance = await page.evaluate(() => Math.max(1.5, 1.5 / viewport.scale));
          await check(label, 'P00a default carrier center remains draggable beside its ball', async () => {
            const initial = await page.evaluate(() => {
              const initial = createInitialState(); initial.schemaVersion = SCHEMA_VERSION;
              applySnapshot(initial); setTool('select'); undoStack.length = 0; redoStack.length = 0; resizeCanvas();
              return createSnapshot();
            });
            const player = initial.steps[0].players[0], ball = initial.steps[0].balls[0];
            await drag(page, { x: player.x, y: player.y }, { x: 700, y: 700 });
            const moved = (await snapshot(page)).steps[0];
            near(moved.players[0], { x: 700, y: 700 });
            assert(Math.abs((moved.balls[0].x - moved.players[0].x) - (ball.x - player.x)) < 0.0001);
            assert(Math.abs((moved.balls[0].y - moved.players[0].y) - (ball.y - player.y)) < 0.0001);
            assert.deepEqual(moved.players.slice(1), initial.steps[0].players.slice(1));
          });
          await check(label, 'P00b visible ball center still drags the ball without moving players', async () => {
            const before = (await snapshot(page)).steps[0], ball = before.balls[0];
            await drag(page, { x: ball.x, y: ball.y }, { x: 800, y: 600 });
            const moved = (await snapshot(page)).steps[0];
            assert.deepEqual(moved.players, before.players); near(moved.balls[0], { x: 800, y: 600 });
          });
          let original = await fixture(page);
          await check(label, 'P01 manual carrier drag preserves ball offset and unrelated balls', async () => {
            await drag(page, { x: 185, y: 315 }, { x: 500, y: 300 });
            const moved = (await snapshot(page)).steps[0];
            near(moved.players[0], { x: 500, y: 300 }); near(moved.balls[0], { x: 555, y: 275 });
            assert(Math.abs((moved.balls[0].x - moved.players[0].x) - 55) < 0.0001);
            assert(Math.abs((moved.balls[0].y - moved.players[0].y) + 25) < 0.0001);
            assert.deepEqual(moved.balls.slice(1), original.steps[0].balls.slice(1));
            assert.equal(await page.evaluate(() => undoStack.length), 1);
          });
          await check(label, 'P02 drag undo and redo restore both carrier and ball once', async () => {
            await page.keyboard.press('ControlOrMeta+z'); assert.deepEqual((await snapshot(page)).steps[0], original.steps[0]);
            await page.keyboard.press('ControlOrMeta+Shift+z');
            const moved = (await snapshot(page)).steps[0]; near(moved.players[0], { x: 500, y: 300 }); near(moved.balls[0], { x: 555, y: 275 });
          });
          await check(label, 'P03 non-carrier drag leaves all balls in place', async () => {
            original = await fixture(page); await drag(page, { x: 800, y: 750 }, { x: 850, y: 700 });
            assert.deepEqual((await snapshot(page)).steps[0].balls, original.steps[0].balls);
          });
          await check(label, 'P04 independent ball drag leaves players unchanged', async () => {
            original = await fixture(page); await drag(page, { x: 450, y: 300 }, { x: 500, y: 450 });
            const moved = (await snapshot(page)).steps[0]; assert.deepEqual(moved.players, original.steps[0].players); near(moved.balls[2], { x: 500, y: 450 });
          });
          await check(label, 'P05 Escape during carrier drag restores ball and player without history', async () => {
            original = await fixture(page); await drag(page, { x: 185, y: 315 }, { x: 350, y: 400 }, false);
            await page.keyboard.press('Escape'); await page.mouse.up();
            assert.deepEqual((await snapshot(page)).steps[0], original.steps[0]); assert.equal(await page.evaluate(() => undoStack.length), 0);
          });
          await check(label, 'P06 duplicate choice cancel and Escape preserve source and autosave', async () => {
            original = await fixture(page, true); const saved = await page.evaluate(() => localStorage.getItem(AUTOSAVE_KEY));
            await page.locator('#addStepButton').click(); await page.locator('#duplicateStepDialog').waitFor({ state: 'visible' });
            await page.screenshot({ path: path.join(reportDir, label.replaceAll(' ', '-') + '-choice.png') });
            await page.locator('#cancelDuplicateStepButton').click(); assert.deepEqual(await snapshot(page), original);
            await page.locator('#addStepButton').click(); await page.keyboard.press('Escape');
            await page.locator('#duplicateStepDialog').waitFor({ state: 'hidden' }); assert.deepEqual(await snapshot(page), original);
            assert.equal(await page.evaluate(() => undoStack.length), 0); assert.equal(await page.evaluate(() => localStorage.getItem(AUTOSAVE_KEY)), saved);
          });
          await check(label, 'P07 before movement copies start positions without changing source', async () => {
            await page.locator('#addStepButton').click(); await page.locator('#duplicateStepBeforeButton').click();
            const result = await snapshot(page); assert.equal(result.steps.length, 2); assert.equal(result.activeStepId, result.steps[1].id);
            assert.deepEqual(result.steps[0], original.steps[0]); assert.deepEqual(result.steps[1].players, original.steps[0].players);
            assert.deepEqual(result.steps[1].balls, original.steps[0].balls); assert.deepEqual(result.steps[1].cones, original.steps[0].cones);
            assert.deepEqual(result.steps[1].lines, []); assert.equal(result.steps[1].note, '');
            assert.equal(await page.evaluate(() => undoStack.length), 1);
            await page.keyboard.press('ControlOrMeta+z'); assert.deepEqual(await snapshot(page), original);
            await page.keyboard.press('ControlOrMeta+Shift+z'); assert.deepEqual(await snapshot(page), result);
          });
          await check(label, 'P08 focus-view after movement includes ordered moves dribble pass and screen', async () => {
            original = await fixture(page, true); await page.locator('#maximizeCourtButton').click(); await page.waitForFunction(() => isFocusMode);
            await page.locator('#focusStepsVisibilityButton').click();
            await page.locator('#focusDuplicateStepButton').click(); await page.locator('#duplicateStepDialog').waitFor({ state: 'visible' });
            assert.equal(await page.locator('#duplicateStepAfterButton').isVisible(), true); await page.locator('#duplicateStepAfterButton').click();
            const result = await snapshot(page); const copied = result.steps[1];
            assert.deepEqual(result.steps[0], original.steps[0]); near(copied.players[0], { x: 600, y: 300 }); near(copied.players[1], { x: 700, y: 650 });
            const ballRadius = await page.evaluate(() => getBallRadius()); near(copied.balls[0], { x: 600 + ballRadius + 8, y: 300 - ballRadius - 4 });
            near(copied.balls[1], { x: 800, y: 550 }); near(copied.balls[2], { x: 450, y: 300 });
            assert.deepEqual(copied.lines, []); assert.equal(copied.note, '');
            await page.evaluate(() => setFocusMode(false)); await page.waitForFunction(() => !isFocusMode);
            await page.reload(); await ready(page); assert.deepEqual(await snapshot(page), result);
            assert.equal(await page.evaluate(() => localStorage.getItem('player-step.auth-sentinel')), 'keep');
          });
          await check(label, 'P09 a static step duplicates immediately with no choice', async () => {
            original = await fixture(page); await page.locator('#addStepButton').click();
            assert.equal(await page.locator('#duplicateStepDialog').isVisible(), false);
            const result = await snapshot(page); assert.equal(result.steps.length, 2); assert.deepEqual(result.steps[1].players, original.steps[0].players);
          });
          await page.screenshot({ path: path.join(reportDir, label.replaceAll(' ', '-') + '.png'), fullPage: true });
        } catch (error) { errors.push({ label, message: error.stack }); console.error('FAIL', label, error.message); }
        finally { await context.close(); }
      }
    } finally { await browser.close(); }
  }
})().catch(error => errors.push({ message: error.stack })).finally(() => {
  server.close(); fs.writeFileSync(path.join(reportDir, 'results.json'), JSON.stringify({ results, errors }, null, 2)); if (errors.length) process.exitCode = 1;
});
