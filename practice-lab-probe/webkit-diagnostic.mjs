import {chromium,webkit} from 'playwright'; // 既存と同じ固定版でブラウザの素の挙動を測ります。
import {createServer} from 'node:http'; // 外部通信しない合成サイトを作ります。
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises'; // 合成プロファイルと検証証拠だけを保存します。
import {tmpdir} from 'node:os'; // テスト専用の一時ディレクトリを使用します。
import {join} from 'node:path'; // 各プロファイルのパスを分けます。
import {randomUUID} from 'node:crypto'; // 合成保存値の識別子を作ります。
const results=[]; // 観察結果と合否を分けて記録します。
await mkdir('practice-lab-probe/results',{recursive:true}); // 既存ワークフローの成果物領域へ記録します。
function serve() { // ポート番号も試験ごとに一意なサーバーを作ります。
  const requests=[]; // 通信停止後に実サーバーを使っていないか調べます。
  const sw="self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(clients.claim()));self.addEventListener('fetch',e=>{if(e.request.mode==='navigate')e.respondWith(new Response('<!doctype html><h1>Offline literal</h1>',{headers:{'Content-Type':'text/html'}}));});"; // SQLiteもキャッシュも使わない最小SWです。
  const server=createServer((req,res)=>{requests.push(req.url);res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',req.url==='/sw.js'?'text/javascript':'text/html');res.end(req.url==='/sw.js'?sw:'<!doctype html><h1>Online diagnostic</h1>');}); // ネットワークキャッシュでの見かけの成功を防ぎます。
  return {server,requests,start:async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;},stop:async()=>{if(server.listening)await new Promise(r=>{server.close(r);server.closeAllConnections();});}}; // 安全な開始と切断を用意します。
} // サーバー定義を閉じます。
async function storage(page,value=null){ // SQLiteを除いたブラウザ保存だけを調べます。
  return page.evaluate(async value=>{ // ページの標準APIで実際に保存します。
    const root=await navigator.storage.getDirectory(); // 実OPFSのルートを取得します。
    if(value!==null){localStorage.setItem('zero-one-diag',value);const file=await root.getFileHandle('zero-one-diag.data',{create:true});const writer=await file.createWritable();await writer.write(value);await writer.close();} // 同じ値を二方式で保存します。
    let opfs=null;try{opfs=await (await (await root.getFileHandle('zero-one-diag.data')).getFile()).text();}catch(e){if(e.name!=='NotFoundError')throw e;} // 存在しないファイルだけを空と扱います。
    return {local:localStorage.getItem('zero-one-diag'),opfs}; // アプリを介さない実際の読取結果です。
  },value); // 診断用の非秘密値のみ渡します。
} // 保存APIの比較を閉じます。
for(const [name,engine]of Object.entries({chromium,webkit})){ // 両エンジンに同じ条件を適用します。
  for(const mode of ['contexts','persistent-explicit','persistent-isolated-home']){ // ランナーの保存境界を分けて比較します。
    const origin=serve();const url=await origin.start();const root=await mkdtemp(join(tmpdir(),'zero-one-diag-'));let browser=null;const contexts=[];const record={type:'profile',engine:name,mode,origin:url}; // 保存域とURLを一意にします。
    try { // 不合格でも他の診断へ進みます。
      const make=async label=>{ // PCとモバイル相当の保存領域を作ります。
        if(mode==='contexts'){browser??=await engine.launch({headless:true});return browser.newContext();} // 同じブラウザプロセスの標準分離を調べます。
        const profile=join(root,label);await mkdir(profile);record[label+'Path']=profile; // 明示的に異なるプロファイルを作ります。
        const env={...process.env};if(mode==='persistent-isolated-home'){const home=join(root,label+'-home');await mkdir(home);Object.assign(env,{HOME:home,CFFIXED_USER_HOME:home,XDG_DATA_HOME:join(home,'data'),XDG_CACHE_HOME:join(home,'cache'),XDG_CONFIG_HOME:join(home,'config')});} // CIブラウザのOS保存先だけを分離します。
        return engine.launchPersistentContext(profile,{headless:true,env}); // 既存の利用者プロファイルは使いません。
      }; // プロファイル作成を閉じます。
      const a=await make('a');contexts.push(a);const pa=await a.newPage();await pa.goto(url);record.initial=await storage(pa);record.marker=randomUUID();record.a=await storage(pa,record.marker); // 一方にだけ合成値を保存します。
      const b=await make('b');contexts.push(b);const pb=await b.newPage();await pb.goto(url);record.b=await storage(pb);record.isolated=record.b.local===null&&record.b.opfs===null; // 同じorigin・同じファイル名でも他方から見えないことを調べます。
      record.status=record.isolated?'passed':'failed'; // 値の混入を成功扱いしません。
    }catch(e){record.status='failed';record.error=e.message;}finally{for(const c of contexts.reverse())await c.close();await browser?.close();await origin.stop();} // 合成ブラウザを終了します。
    results.push(record);console.log('DIAGNOSTIC',JSON.stringify(record)); // 比較結果を保存します。
  } // 分離方式の比較を終えます。
  for(const outage of ['setOffline','origin-stopped']){ // ランナーのオフラインと実サーバー停止を比較します。
    const origin=serve();const url=await origin.start();const root=await mkdtemp(join(tmpdir(),'zero-one-offline-'));const context=await engine.launchPersistentContext(root,{headless:true});const page=await context.newPage();const record={type:'offline-literal',engine:name,outage,origin:url}; // SQLiteが関係しない試験です。
    try{await page.goto(url);await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);record.controlled=true;if(outage==='setOffline')await context.setOffline(true);else await origin.stop();const response=await page.goto(url+'/uncached-target',{timeout:10000});record.statusCode=response.status();record.fromServiceWorker=response.fromServiceWorker();record.heading=await page.locator('h1').innerText();record.status=record.statusCode===200&&record.fromServiceWorker&&record.heading==='Offline literal'?'passed':'failed';}catch(e){record.status='failed';record.error=e.message;}finally{await context.setOffline(false).catch(()=>{});await context.close();await origin.stop();record.requests=origin.requests;} // ネットワークエラーはそのまま残します。
    results.push(record);console.log('DIAGNOSTIC',JSON.stringify(record)); // 既知問題との対応を判断できる原文を残します。
  } // 通信方式の比較を終えます。
} // ブラウザ比較を終えます。
await writeFile('practice-lab-probe/results/diagnostic.json',JSON.stringify({createdAt:new Date().toISOString(),platform:process.platform,purpose:'root-cause diagnostic; not acceptance pass',results},null,2)); // この診断を製品の合格件数には数えません。
