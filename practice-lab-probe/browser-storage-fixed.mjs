import {chromium,webkit} from 'playwright'; // 固定した実ブラウザで同じ保存条件を検証します。
import {createServer} from 'node:http'; // 通信遮断も可能なCI専用サーバーを作ります。
import {mkdir,mkdtemp,readFile,writeFile,copyFile} from 'node:fs/promises'; // 合成プロファイルと実行結果だけを保存します。
import {join,extname} from 'node:path'; // ファイルを許可済みの配信領域に限定します。
import {tmpdir} from 'node:os'; // 実利用者ではないCIの保存領域を用意します。
import assert from 'node:assert/strict'; // 必要な期待値を変更せず照合します。
const root=new URL('./fixed-site/',import.meta.url).pathname; // 旧プローブのキャッシュを使いません。
const report=new URL('./results/',import.meta.url).pathname; // 前回と別名の結果を記録します。
await mkdir(root,{recursive:true});await mkdir(report,{recursive:true}); // テスト専用のディレクトリを準備します。
for(const name of ['sqlite3.js','sqlite3.wasm'])await copyFile(new URL('./site/'+name,import.meta.url),join(root,name)); // 同じ検証済みSQLiteバイトを使用します。
const workerSource=String.raw`
let db,sqlite3,pool,release; // 一つのWorkerに接続と排他権を限定します。
async function command(name,args={}){ // コマンドを明示的に分けます。
 if(name==='init'){ // ブラウザの実保存領域を初期化します。
  await new Promise((ok,no)=>navigator.locks.request('zero-one-fixed-probe',{ifAvailable:true},async lock=>{if(!lock){no(new Error('OTHER_TAB'));return;}ok();await new Promise(done=>{release=done;});}).catch(no)); // 第二タブの書込みを拒否します。
  try{ // 初期化失敗時も排他権を解放します。
   importScripts('./sqlite3.js');sqlite3=await sqlite3InitModule({locateFile:f=>new URL(f,self.location.href).href}); // 固定した公式SQLiteを読みます。
   pool=await sqlite3.installOpfsSAHPoolVfs({name:'zero-one-fixed-probe',directory:'/.zero-one-fixed-probe/'+args.scope,initialCapacity:6,clearOnInit:false}); // アカウント条件以外でDB名を変更しません。
   db=new pool.OpfsSAHPoolDb('/core.db');db.exec('CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,payload TEXT NOT NULL);'); // 本文と送信待ちを別表にします。
   return {version:sqlite3.version.libVersion,secure:self.isSecureContext}; // 実バージョンを報告します。
  }catch(e){try{db?.close();pool?.pauseVfs();}finally{release?.();}throw e;} // エラーを成功扱いしません。
 } // 初期化分岐を閉じます。
 if(!db)throw new Error('NOT_READY'); // 未保存状態へのアクセスを拒否します。
 if(name==='write'||name==='rollback'){ // 書込みはトランザクションで処理します。
  db.exec('BEGIN IMMEDIATE');try{db.exec({sql:'INSERT INTO records VALUES(?,?)',bind:[args.id,args.value]});if(name==='rollback')throw new Error('SIMULATED_OUTBOX_FAILURE');db.exec({sql:'INSERT INTO outbox VALUES(?,?)',bind:[args.id,args.value]});db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return true; // 本文だけが残る状態を防ぎます。
 } // 更新分岐を閉じます。
 if(name==='read')return {rows:db.exec({sql:'SELECT * FROM records ORDER BY id',rowMode:'object',returnValue:'resultRows'}),outbox:db.exec({sql:'SELECT * FROM outbox ORDER BY id',rowMode:'object',returnValue:'resultRows'}),integrity:db.selectValue('PRAGMA integrity_check')}; // 本文と送信待ちの実値を読みます。
 if(name==='header')return Array.from(pool.exportFile('/core.db').slice(0,16)); // SQLite形式を確認します。
 if(name==='close'){db.close();db=null;pool.pauseVfs();release();return true;} // DB、ファイル、Web Lockの順に解放します。
 throw new Error('UNKNOWN_COMMAND'); // 任意の処理を受け付けません。
} // コマンド処理を閉じます。
let queue=Promise.resolve(); // Worker内の同時要求を直列化します。
onmessage=({data:m})=>{queue=queue.then(async()=>{try{postMessage({id:m.id,value:await command(m.name,m.args)});}catch(e){postMessage({id:m.id,error:e.message});}});}; // 失敗の原文も返します。
`; // Workerテンプレートを閉じます。
const pageSource=String.raw`
let worker,serial=0;const calls=new Map(); // 応答の対応を追跡します。
window.rpc=(name,args={})=>new Promise((resolve,reject)=>{const id=++serial,timeout=setTimeout(()=>{calls.delete(id);reject(new Error('RPC_TIMEOUT'));},15000);calls.set(id,{resolve,reject,timeout});worker.postMessage({id,name,args});}); // 無限待機しません。
window.boot=async(scope='owner-a')=>{worker=new Worker('./worker.js');worker.onmessage=({data:m})=>{const c=calls.get(m.id);if(c){calls.delete(m.id);clearTimeout(c.timeout);m.error?c.reject(new Error(m.error)):c.resolve(m.value);}};try{return await rpc('init',{scope});}catch(e){worker.terminate();throw e;}}; // 初期化失敗時はWorkerを終了します。
window.closeDB=async()=>{await rpc('close');worker.terminate();}; // 正常な接続解放を行います。
window.crash=()=>worker.terminate(); // 合成試験だけで強制終了を起こします。
window.prepare=async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));return {controlled:!!navigator.serviceWorker.controller,cached:await Promise.all(['./','./page.mjs','./worker.js','./sqlite3.js','./sqlite3.wasm'].map(f=>caches.match(new URL(f,location.href)).then(Boolean)))};}; // 制御と全必須ファイルの事前取得を確認します。
window.loaded=true; // ページ処理が実行済みである印です。
`; // ページテンプレートを閉じます。
const swSource=String.raw`
const CACHE='zero-one-fixed-probe-v031'; // 他アプリから分けたキャッシュです。
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./page.mjs','./worker.js','./sqlite3.js','./sqlite3.wasm'])).then(()=>self.skipWaiting()))); // テストページの部品を全て保存します。
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim())); // 独立した検証originだけを制御します。
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.open(CACHE).then(async c=>(await c.match(e.request))||fetch(e.request)));}); // 未取得URLはネットワークへ出て失敗するため負の対照に使えます。
`; // SWテンプレートを閉じます。
for(const [name,body]of Object.entries({'index.html':'<!doctype html><html lang="ja"><meta charset="utf-8"><h1>ZERO ONE 保存回帰検証</h1><script type="module" src="./page.mjs"></script></html>','worker.js':workerSource,'page.mjs':pageSource,'sw.js':swSource}))await writeFile(join(root,name),body); // 実行するソースを成果物にも残します。
const results=[];const profileMetadata=[]; // 合否と試験環境を別に保存します。
async function fixture(engine,name){ // 各試験を新しいorigin・OS保存領域で分離します。
 const directory=await mkdtemp(join(tmpdir(),'zero-one-fixture-'));const contexts=new Set();let port=0;let requests=0; // 本人のブラウザデータを使いません。
 const server=createServer(async(req,res)=>{requests++;try{const path=new URL(req.url,'http://localhost').pathname;const name=path==='/'?'index.html':path.slice(1);if(!/^[a-zA-Z0-9_.-]+$/.test(name))throw new Error('PATH');const data=await readFile(join(root,name));res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.wasm':'application/wasm'}[extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404,{'Cache-Control':'no-store'});res.end('Not found');}}); // HTTPキャッシュを合格の根拠にしません。
 const start=async()=>{await new Promise(r=>server.listen(port,'127.0.0.1',r));port=server.address().port;}; // 再開時も同じoriginを維持します。
 const stop=async()=>{if(server.listening)await new Promise(r=>{server.close(r);server.closeAllConnections();});}; // 実際に配信を停止します。
 await start();const url=`http://127.0.0.1:${port}/`; // 同じ試験内の二端末で共通URLを使います。
 const launch=async(label='a')=>{const profile=join(directory,label),home=join(directory,label+'-home');await mkdir(profile,{recursive:true});await mkdir(home,{recursive:true});const env={...process.env,HOME:home,CFFIXED_USER_HOME:home,XDG_DATA_HOME:join(home,'data'),XDG_CACHE_HOME:join(home,'cache'),XDG_CONFIG_HOME:join(home,'config')};const context=await engine.launchPersistentContext(profile,{headless:true,env});contexts.add(context);context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(15000);profileMetadata.push({test:name,label,profile,home});return context;}; // MiniBrowserのOS共通保存領域も合成端末ごとに分けます。
 const open=async context=>{const page=await context.newPage();await page.goto(url);await page.waitForFunction(()=>window.loaded===true);return page;}; // 配信された実コードを実行します。
 const context=await launch();const page=await open(context); // 主端末を起動します。
 return {context,page,url,launch,open,start,stop,server,requests:()=>requests,closeContext:async c=>{contexts.delete(c);await c.close();},dispose:async()=>{for(const c of contexts)await c.close().catch(()=>{});await stop();}}; // 試験終了で合成プロセスを閉じます。
} // フィクスチャを閉じます。
const read=p=>p.evaluate(()=>rpc('read')); // 実DBの読取りを共通化します。
const seed=p=>p.evaluate(()=>rpc('write',{id:'plan-1',value:'判断\' <script> & 日本語'})); // 各試験自身で必要な事前データを作ります。
for(const [browserName,engine]of Object.entries({chromium,webkit})){ // エンジン別に同じ10シナリオを試します。
 const cases=[ // シナリオごとに前提を自前で準備します。
 ['S01 WASM/OPFS init',async f=>{const info=await f.page.evaluate(()=>boot());assert.equal(info.version,'3.53.4');assert.equal(info.secure,true);assert.equal((await read(f.page)).rows.length,0);}], // 空の実DBから開始します。
 ['S02 atomic save and SQLite header',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);const data=await read(f.page);assert.equal(data.rows.length,1);assert.equal(data.outbox.length,1);assert.equal(data.integrity,'ok');assert.equal(Buffer.from(await f.page.evaluate(()=>rpc('header'))).toString(),'SQLite format 3\0');}], // 原子性と形式を確認します。
 ['S03 rollback preserves previous data',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);const before=await read(f.page);await assert.rejects(f.page.evaluate(()=>rpc('rollback',{id:'plan-2',value:'rolled back'})),/SIMULATED/);assert.deepEqual(await read(f.page),before);}], // 本文とoutboxを両方巻き戻します。
 ['S04 reload persistence',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);const before=await read(f.page);await f.page.evaluate(()=>closeDB());await f.page.reload();await f.page.waitForFunction(()=>window.loaded===true);await f.page.evaluate(()=>boot());assert.deepEqual(await read(f.page),before);}], // 同じ保存場所を再度開きます。
 ['S05 second tab rejected',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);const p=await f.open(f.context);await assert.rejects(p.evaluate(()=>boot()),/OTHER_TAB/);await p.close();assert.equal((await read(f.page)).rows.length,1);}], // 第二タブが元データへ書込みません。
 ['S06 scope switch isolation and return',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);await f.page.evaluate(()=>closeDB());await f.page.evaluate(()=>boot('owner-b'));assert.equal((await read(f.page)).rows.length,0);await f.page.evaluate(()=>rpc('write',{id:'b-only',value:'B'}));await f.page.evaluate(()=>closeDB());await f.page.evaluate(()=>boot('owner-a'));assert.deepEqual((await read(f.page)).rows.map(r=>r.id),['plan-1']);}], // 同一ブラウザ内のアカウント境界も保ちます。
 ['S07 independent device storage both directions',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);const other=await f.launch('b');const p=await f.open(other);await p.evaluate(()=>boot());assert.equal((await read(p)).rows.length,0);await p.evaluate(()=>rpc('write',{id:'device-b',value:'B'}));assert.deepEqual((await read(f.page)).rows.map(r=>r.id),['plan-1']);assert.deepEqual((await read(p)).rows.map(r=>r.id),['device-b']);await p.evaluate(()=>closeDB());await f.closeContext(other);const restarted=await f.launch('b');const again=await f.open(restarted);await again.evaluate(()=>boot());assert.deepEqual((await read(again)).rows.map(r=>r.id),['device-b']);}], // 同じoriginと同じDB名で分離と再起動を検証します。
 ['S08 origin unavailable reload and write',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);const ready=await f.page.evaluate(()=>prepare());assert(ready.controlled&&ready.cached.every(Boolean));await f.page.evaluate(()=>closeDB());await f.stop();assert.equal(f.server.listening,false);await assert.rejects(fetch(f.url+'uncached',{signal:AbortSignal.timeout(3000)}));const response=await f.page.reload();assert.equal(response.status(),200);assert.equal(response.fromServiceWorker(),true);await f.page.waitForFunction(()=>window.loaded===true);await f.page.evaluate(()=>boot());const negative=await f.page.evaluate(()=>fetch('/not-cached-'+Date.now(),{cache:'no-store'}).then(()=>false,()=>true));assert.equal(negative,true);await f.page.evaluate(()=>rpc('write',{id:'offline',value:'未送信メモ'}));const data=await read(f.page);assert.deepEqual(data.rows.map(r=>r.id),['offline','plan-1']);assert.equal(data.outbox.length,2);assert.equal(data.integrity,'ok');await f.start();}], // 疑似オフラインAPIではなく実配信停止と未キャッシュURLの失敗を条件にします。
 ['S09 worker termination recovery independent fixture',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);await f.page.evaluate(()=>rpc('write',{id:'crash-proof',value:'保存確認済み'}));const before=await read(f.page);assert.equal(before.rows.length,2);await f.page.evaluate(()=>crash());await f.page.reload();await f.page.waitForFunction(()=>window.loaded===true);await f.page.waitForFunction(async()=>!(await navigator.locks.query()).held.some(l=>l.name==='zero-one-fixed-probe'));await f.page.evaluate(()=>boot());assert.deepEqual(await read(f.page),before);}], // S08の失敗を強制停止のデータ消失と取り違えません。
 ['S10 full browser process restart',async f=>{await f.page.evaluate(()=>boot());await seed(f.page);const before=await read(f.page);await f.page.evaluate(()=>closeDB());await f.closeContext(f.context);const again=await f.launch('a');const p=await f.open(again);await p.evaluate(()=>boot());assert.deepEqual(await read(p),before);}] // 同じプロファイルを再起動してディスク永続化を確認します。
 ]; // シナリオ定義を閉じます。
 for(const [name,fn]of cases){let f;const started=Date.now();try{f=await fixture(engine,name);await fn(f);results.push({browser:browserName,name,status:'passed',durationMs:Date.now()-started});console.log('PASS',browserName,name);}catch(e){results.push({browser:browserName,name,status:'failed',error:e.message,durationMs:Date.now()-started});console.log('FAIL',browserName,name,e.message);}finally{await f?.dispose();await writeFile(join(report,'fixed-results.json'),JSON.stringify({createdAt:new Date().toISOString(),platform:process.platform,playwright:'1.63.0',physicalIPhone:false,realMicrosoft:false,offlineMethod:'origin server stopped; setOffline API retained separately as known-bug diagnostic',profileMethod:'explicit persistent profile plus synthetic OS home',results,profileMetadata},null,2));}} // 全結果を途中でも保存します。
} // 全ブラウザの検証を閉じます。
if(results.length!==20||results.some(r=>r.status!=='passed'))process.exitCode=1; // 未実行・不合格を成功にしません。
