import { chromium, webkit } from 'playwright'; // 固定したPlaywrightで実ブラウザを起動します。
import { createServer } from 'node:http'; // CI内だけの静的HTTPサーバーを作ります。
import { mkdir, readFile, writeFile } from 'node:fs/promises'; // 合成データと検証結果だけを保存します。
import { join, extname } from 'node:path'; // 配信ファイル名とMIMEを扱います。
import assert from 'node:assert/strict'; // 実結果を期待値と比較します。
const root = new URL('./site/', import.meta.url).pathname; // 本番アプリと無関係な配信場所を使います。
const report = new URL('./results/', import.meta.url).pathname; // ログの保存先を固定します。
await mkdir(root, { recursive: true }); // 検証ページのフォルダを準備します。
await mkdir(report, { recursive: true }); // 証拠を置くフォルダを準備します。
const workerSource = String.raw`
let db, sqlite3, pool, release; // このWorkerだけのSQLite接続とロックを持ちます。
const stmt = sql => ({all:(...bind)=>db.exec({sql,bind,rowMode:'object',returnValue:'resultRows'}),run:(...bind)=>db.exec({sql,bind,rowMode:'object',returnValue:'resultRows'})}); // v0.2のOO1変換と同じ呼出形を検証します。
async function run(command, args = {}) { // 受信コマンドを処理します。
  if(command === 'init') { // 初期化で実際のOPFSを開きます。
    await new Promise((resolve,reject)=>navigator.locks.request('zero-one-ci-probe',{ifAvailable:true},async lock=>{if(!lock){reject(new Error('OTHER_TAB'));return;}resolve();await new Promise(done=>{release=done;});}).catch(reject)); // 別タブの同時書込を拒否します。
    importScripts('./sqlite3.js'); // 配布元ハッシュ照合済みのSQLiteを読み込みます。
    sqlite3 = await sqlite3InitModule({locateFile:file=>new URL(file,self.location.href).href}); // WASMを実行します。
    pool = await sqlite3.installOpfsSAHPoolVfs({name:'zero-one-ci-probe',directory:'/.zero-one-ci-probe/'+args.scope,initialCapacity:6,clearOnInit:false}); // 合成アカウント別に永続領域を作ります。
    db = new pool.OpfsSAHPoolDb('/core.db'); // ブラウザ内部のDBを開きます。
    db.exec('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY, payload TEXT NOT NULL);'); // 本文と送信待ちの表を分けます。
    return {version:sqlite3.version.libVersion,opfs:true,secure:self.isSecureContext}; // 実装のバージョンを返します。
  } // 初期化分岐を閉じます。
  if(!db) throw new Error('NOT_READY'); // 未初期化の書込を拒否します。
  if(command === 'write' || command === 'rollback') { // 原子的な書込を検証します。
    db.exec('BEGIN IMMEDIATE'); // SQLiteのトランザクションを開始します。
    try { // 二つの表を一括更新します。
      stmt('INSERT INTO records(id,value) VALUES(?,?)').run(args.id,args.value); // 値をbindして本文を保存します。
      if(command==='rollback') throw new Error('SIMULATED_OUTBOX_FAILURE'); // 送信待ち失敗を再現します。
      stmt('INSERT INTO outbox(id,payload) VALUES(?,?)').run(args.id,args.value); // 本文と同じ操作IDで送信待ちを残します。
      db.exec('COMMIT'); // 両方成功したときだけ確定します。
    } catch(error) { db.exec('ROLLBACK'); throw error; } // 途中失敗は本文も巻き戻します。
    return true; // 保存確定を返します。
  } // 更新分岐を閉じます。
  if(command==='read') return {rows:stmt('SELECT * FROM records ORDER BY id').all(),outbox:stmt('SELECT * FROM outbox ORDER BY id').all(),integrity:db.selectValue('PRAGMA integrity_check')}; // 実際に保存した行を読みます。
  if(command==='export') return Array.from(pool.exportFile('/core.db').slice(0,16)); // SQLite形式のファイルヘッダーを確認します。
  if(command==='close') { db.close();db=null;pool.pauseVfs();release();return true; } // 接続を閉じてからOPFSとWeb Lockを解放します。
  throw new Error('UNKNOWN_COMMAND'); // 未定義操作は実行しません。
} // コマンド本体を閉じます。
let queue=Promise.resolve(); // Worker内でも同時コマンドを直列化します。
onmessage=event=>{const message=event.data;queue=queue.then(async()=>{try{postMessage({id:message.id,value:await run(message.command,message.args)});}catch(error){postMessage({id:message.id,error:error.message});}});}; // 結果と失敗を別形式で応答します。
`; // Workerの生成用文字列を閉じます。
const pageSource = String.raw`
let worker, serial=0;const calls=new Map(); // 要求と応答を識別します。
window.rpc=(command,args={})=>new Promise((resolve,reject)=>{const id=++serial;const timeout=setTimeout(()=>{calls.delete(id);reject(new Error('RPC_TIMEOUT'));},20000);calls.set(id,{resolve,reject,timeout});worker.postMessage({id,command,args});}); // 実際のWorkerへ操作を送ります。
window.boot=async(scope='owner-a')=>{worker=new Worker('./worker.js');worker.onmessage=({data})=>{const call=calls.get(data.id);if(!call)return;calls.delete(data.id);clearTimeout(call.timeout);data.error?call.reject(new Error(data.error)):call.resolve(data.value);};worker.onerror=event=>{for(const call of calls.values())call.reject(new Error(event.message));calls.clear();};try{const result=await rpc('init',{scope});document.querySelector('#state').textContent='READY';return result;}catch(error){worker.terminate();throw error;}}; // 起動失敗時も永久待機させません。
window.crash=()=>worker.terminate(); // 合成テストでWorker停止を再現します。
window.stop=async()=>{await rpc('close');worker.terminate();}; // ブラウザ内のロックを順序立てて解放します。
window.prepareOffline=async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));return true;}; // 事前取得の完了を待ちます。
window.loaded=true; // テストがページ読込を確認できる印です。
`; // ページ処理の生成用文字列を閉じます。
const swSource = String.raw`
const CACHE='zero-one-ci-probe-v03'; // 合成検証専用のキャッシュ名を使います。
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./index.html','./page.mjs','./worker.js','./sqlite3.js','./sqlite3.wasm'])).then(()=>self.skipWaiting()))); // 必須部品を全て事前取得します。
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim())); // 検証ページをこのSWで制御します。
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;event.respondWith(caches.match(event.request).then(value=>value||fetch(event.request)));}); // 自分のページだけオフライン提供します。
`; // SW生成用文字列を閉じます。
await writeFile(join(root,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><title>ZERO ONE storage probe</title><h1>ZERO ONE / SQLite 実動作検証</h1><p id="state">START</p><script type="module" src="./page.mjs"></script></html>'); // 合成テスト専用画面を用意します。
await writeFile(join(root,'worker.js'),workerSource); // Workerを配信用に保存します。
await writeFile(join(root,'page.mjs'),pageSource); // ページ処理を配信用に保存します。
await writeFile(join(root,'sw.js'),swSource); // オフライン検証用SWを保存します。
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm'}; // WASMとモジュールを正しいMIMEで配信します。
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://127.0.0.1').pathname;const file=path==='/'?'index.html':path.slice(1);if(!/^[a-zA-Z0-9_.-]+$/.test(file))throw new Error('path');const data=await readFile(join(root,file));res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}); // 検証用ファイル以外を公開しません。
await new Promise(resolve=>server.listen(8768,'127.0.0.1',resolve)); // CIのループバックだけで待受します。
const results=[]; // 実行した試験だけを集計します。
async function test(browserName,name,fn){try{await fn();results.push({browser:browserName,name,status:'passed'});console.log('PASS',browserName,name);}catch(error){results.push({browser:browserName,name,status:'failed',error:error.message});console.log('FAIL',browserName,name,error.message);}} // 検証失敗を隠しません。
try { // ブラウザごとの試験を開始します。
  for(const [browserName,engine]of Object.entries({chromium,webkit})) { // ChromiumとWebKitを別々に測ります。
    const browser=await engine.launch({headless:true}); // 管理ポリシーを変更せず標準起動します。
    const context=await browser.newContext(); // 個人アカウントのない合成保存領域です。
    const page=await context.newPage(); // 最初のブラウザ画面を開きます。
    const open=async()=>{await page.goto('http://127.0.0.1:8768/');await page.waitForFunction(()=>window.loaded===true);}; // 読込完了を待ちます。
    await open(); // 初期画面を読みます。
    await test(browserName,'S01 WASM/OPFS init',async()=>{const info=await page.evaluate(()=>boot());assert.equal(info.version,'3.53.4');assert.equal(info.opfs,true);}); // 実SQLiteの版を確認します。
    await test(browserName,'S02 atomic save and SQLite header',async()=>{await page.evaluate(()=>rpc('write',{id:'plan-1',value:'判断\' <script> & 日本語'}));const data=await page.evaluate(()=>rpc('read'));assert.equal(data.rows.length,1);assert.equal(data.outbox.length,1);assert.equal(data.integrity,'ok');const bytes=await page.evaluate(()=>rpc('export'));assert.equal(Buffer.from(bytes).toString(),'SQLite format 3\0');}); // 本文・送信待ち・DB形式を確認します。
    await test(browserName,'S03 rollback preserves previous data',async()=>{await assert.rejects(page.evaluate(()=>rpc('rollback',{id:'plan-2',value:'rolled back'})),/SIMULATED/);const data=await page.evaluate(()=>rpc('read'));assert.equal(data.rows.length,1);assert.equal(data.outbox.length,1);}); // 書込途中失敗で半端な行を残しません。
    await test(browserName,'S04 reload persistence',async()=>{await page.evaluate(()=>stop());await page.reload();await page.waitForFunction(()=>window.loaded===true);await page.evaluate(()=>boot());const data=await page.evaluate(()=>rpc('read'));assert.equal(data.rows[0].id,'plan-1');}); // ページの再読込後に保存を確認します。
    await test(browserName,'S05 second tab rejected',async()=>{const second=await context.newPage();try{await second.goto('http://127.0.0.1:8768/');await second.waitForFunction(()=>window.loaded===true);await assert.rejects(second.evaluate(()=>boot()),/OTHER_TAB/);}finally{await second.close();}}); // 同一保存領域の二重編集を止めます。
    await test(browserName,'S06 scope switch isolation and return',async()=>{await page.evaluate(()=>stop());await page.evaluate(()=>boot('owner-b'));assert.equal((await page.evaluate(()=>rpc('read'))).rows.length,0);await page.evaluate(()=>stop());await page.evaluate(()=>boot('owner-a'));assert.equal((await page.evaluate(()=>rpc('read'))).rows.length,1);}); // 別アカウントへの混入を防ぎます。
    await test(browserName,'S07 independent browser profile',async()=>{const other=await browser.newContext();try{const p=await other.newPage();await p.goto('http://127.0.0.1:8768/');await p.waitForFunction(()=>window.loaded===true);await p.evaluate(()=>boot());assert.equal((await p.evaluate(()=>rpc('read'))).rows.length,0);await p.evaluate(()=>stop());}finally{await other.close();}}); // PCとモバイル相当の別領域を確認します。
    await test(browserName,'S08 offline reload and write',async()=>{await page.evaluate(()=>prepareOffline());await page.evaluate(()=>stop());await context.setOffline(true);try{await page.reload();await page.waitForFunction(()=>window.loaded===true);await page.evaluate(()=>boot());await page.evaluate(()=>rpc('write',{id:'offline',value:'未送信メモ'}));assert.equal((await page.evaluate(()=>rpc('read'))).rows.length,2);}finally{await context.setOffline(false);}}); // オフラインでも保存できることを確認します。
    await test(browserName,'S09 worker termination recovery',async()=>{await page.evaluate(()=>crash());await page.reload();await page.waitForFunction(()=>window.loaded===true);await page.evaluate(()=>boot());const data=await page.evaluate(()=>rpc('read'));assert.equal(data.rows.length,2);assert.equal(data.integrity,'ok');}); // 明示的に閉じない終了後も整合性を確認します。
    await page.screenshot({path:join(report,browserName+'.png'),fullPage:true}); // 合成画面の証拠を保存します。
    await context.close();await browser.close(); // 接続と保存領域を閉じます。
  } // ブラウザループを閉じます。
} catch(error) {results.push({name:'HARNESS',status:'failed',error:error.stack});} finally {await new Promise(resolve=>server.close(resolve));} // 途中停止時も結果を残します。
await writeFile(join(report,'results.json'),JSON.stringify({createdAt:new Date().toISOString(),physicalIPhone:false,realMicrosoft:false,results},null,2)); // 物理端末・OneDrive未検証を明記します。
if(results.some(r=>r.status!=='passed'))process.exitCode=1; // 不合格を成功終了に変えません。
