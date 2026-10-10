import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const site = process.env.SITE_URL;
assert.equal(site, 'https://yuge-u.github.io/basketball-tactics-board/');
const files = ['index.html', 'Basketball_Tactics_Board.html', '1_App/js/app.js', '1_App/css/styles.css', 'service-worker.js'];
for (const file of files) {
  const expected = await readFile(new URL('../' + file, import.meta.url));
  const url = new URL(file, site); url.searchParams.set('verify', 'v45-' + Date.now());
  const response = await fetch(url, {cache:'no-store',signal:AbortSignal.timeout(20000)});
  assert(response.ok, `${file}: HTTP ${response.status}`);
  const actual = Buffer.from(await response.arrayBuffer());
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(actual),hash(expected),`${file}: public file differs from tested release`);
  console.log('PASS public bytes',file);
}
console.log('Verified CANVAS v45 public files');
