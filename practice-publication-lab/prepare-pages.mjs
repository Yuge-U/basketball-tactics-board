import { readFile, writeFile } from 'node:fs/promises'; // 公開候補のファイルだけを読み書きします。
import { resolve, join } from 'node:path'; // 明示された検証領域のパスを組み立てます。
import assert from 'node:assert/strict'; // 想定外のソースへは変更を適用しません。
const root = resolve(process.argv[2] || 'practice-ui-lab/app'); // 本番とは別の展開先を使用します。
const policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://graph.microsoft.com https://login.microsoftonline.com https://*.1drv.com https://*.sharepoint.com https://*.live.com https://*.onedrive.com https://*.sharepointonline.com; frame-src https://login.microsoftonline.com; object-src 'none'; base-uri 'self'"; // 既存ローカルサーバーと同じ接続許可を静的ページにも適用します。
for (const name of ['web/index.html', 'web/config.mjs', 'web/sw.js']) { // 実行版とキャッシュの版を揃えます。
  const path = join(root, name); // 対象の公開ファイルを指定します。
  let text = await readFile(path, 'utf8'); // 変更前の内容を読みます。
  assert(text.includes('0.3.1'), `Unexpected version: ${name}`); // 旧版が一致しない場合は停止します。
  text = text.replaceAll('0.3.1', '0.3.2'); // DB名やOneDrive保存先ではなく表示とキャッシュの版だけを更新します。
  if (name.endsWith('index.html')) { // 静的ホスティングでも通信方針が有効になるようにします。
    assert(!text.includes('http-equiv="Content-Security-Policy"')); // 二重のポリシー追加を拒否します。
    text = text.replace('<meta name="viewport"', `<meta http-equiv="Content-Security-Policy" content="${policy}"> <!-- 配信側に独自ヘッダーがなくても接続先を制限します。 -->\n<meta name="referrer" content="no-referrer"> <!-- 外部へ参照元URLを送信しません。 -->\n<meta name="viewport"`); // 外部リソースより先に方針を指定します。
  } // HTML固有の変更を終えます。
  await writeFile(path, text); // 検証用の公開ファイルへ保存します。
} // 版とHTML方針の変更を終えます。
await writeFile(join(root, 'web/.nojekyll'), ''); // GitHub Pagesで静的ファイルをそのまま配信する印です。
const packagePath = join(root, 'package.json'); // 配布バージョンの説明も更新します。
const pkg = JSON.parse(await readFile(packagePath, 'utf8')); // 他の設定を保持します。
pkg.version = '0.3.2'; // 新しい公開候補の版を指定します。
await writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n'); // npm設定を保存します。
let smoke = await readFile(join(root, 'tools/browser-smoke.mjs'), 'utf8'); // 合格済みの画面シナリオを流用します。
assert(smoke.includes('results.length===18')); // 9シナリオずつの既存試験であることを確認します。
smoke = smoke.replace("from './serve.mjs'", "from './serve-project.mjs'"); // 公開プロジェクトと同じパス構成で試験します。
smoke = smoke.replace('server.address().port}/`', 'server.address().port}/zero-one-practice-lab/`'); // ルート直下ではなく専用サブパスを使用します。
assert(smoke.includes('server.address().port}/zero-one-practice-lab/`')); // 配置場所の変更漏れを検出します。
smoke = smoke.replace("report.status=results.length===18", "report.status=results.length===22"); // 追加した2シナリオを両ブラウザで必須とします。
smoke = smoke.replace("'reports/browser-smoke.json'", "'reports/pages-smoke.json'"); // 過去の画面試験結果を上書きしません。
const extra = `      await check(engine,'P10 リダイレクトURIとSWのスコープが専用パスに一致',async()=>{assert.equal(await page.locator('#redirectUri').innerText(),url);const scope=await page.evaluate(async()=> (await navigator.serviceWorker.ready).scope);assert.equal(scope,url);const manifest=await page.evaluate(async()=> (await fetch('./manifest.webmanifest')).json());assert.equal(new URL(manifest.start_url,url).href,url);assert.equal(new URL(manifest.scope,url).href,url);}); // 本人認証を行わずURLと制御範囲だけ確認します。\n      await check(engine,'P11 静的HTMLのCSPがインラインスクリプトを拒否',async()=>{const guarded=await page.evaluate(()=>new Promise(resolve=>{const timer=setTimeout(()=>resolve(false),3000);document.addEventListener('securitypolicyviolation',function handler(event){if(event.violatedDirective.startsWith('script-src')){document.removeEventListener('securitypolicyviolation',handler);clearTimeout(timer);resolve(window.__untrustedScript!==true);} });const script=document.createElement('script');script.textContent='window.__untrustedScript=true';document.head.append(script);script.remove();}));assert.equal(guarded,true);assert.equal(await page.locator('meta[name="referrer"]').getAttribute('content'),'no-referrer');}); // テスト用スクリプトを実行できないことを確認します。\n`; // 公開時の境界試験を追加します。
assert(smoke.includes('      await page.screenshot({path:`reports/browser/${engine}-desktop.png`')); // 追加箇所を固定します。
smoke = smoke.replace('      await page.screenshot({path:`reports/browser/${engine}-desktop.png`', extra + '      await page.screenshot({path:`reports/browser/${engine}-desktop.png`'); // 既存シナリオの期待値は変更しません。
await writeFile(join(root, 'tools/browser-project.mjs'), smoke); // 公開配置用の独立した試験を保存します。
const serverSource = `import http from 'node:http'; // 個人データを扱わない静的配信を作ります。\nimport {readFileSync,statSync,realpathSync} from 'node:fs'; // 公開対象ファイルだけを読みます。\nimport {resolve,extname,sep} from 'node:path'; // パス脱出を防ぎます。\nimport {fileURLToPath} from 'node:url'; // 配信ルートを固定します。\nexport function createServer(root=fileURLToPath(new URL('../web/',import.meta.url))){ // テスト用のプロジェクトサブパス配信です。\n const prefix='/zero-one-practice-lab/'; // 独立した公開先候補のパスを使います。\n const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain'}; // ブラウザ部品のMIMEを維持します。\n return http.createServer((req,res)=>{ // サーバーからCSPを加えずHTML側の方針を試験します。\n  try{const host='127.0.0.1:'+req.socket.localPort;assertRequest(req,host);const url=new URL(req.url,'http://'+host);if(!url.pathname.startsWith(prefix))throw Error('outside scope');const name=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html';const path=resolve(root,name);if(!path.startsWith(resolve(root)+sep)||name.split('/').some(p=>p.startsWith('.'))||!statSync(path).isFile()||!realpathSync(path).startsWith(realpathSync(root)+sep)||!mime[extname(path)])throw Error('outside files');res.writeHead(200,{'Content-Type':mime[extname(path)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:readFileSync(path));}catch{res.writeHead(404);res.end('Not found');} // 専用領域外は公開しません。\n }); // 作成したサーバーを返します。\n} // 配信関数を閉じます。\nfunction assertRequest(req,host){if(req.headers.host!==host||!['GET','HEAD'].includes(req.method))throw Error('Rejected request');} // 読取以外は受け付けません。\n`; // ヘッダーを前提にしないサーバーのソースを定義します。
await writeFile(join(root, 'tools/serve-project.mjs'), serverSource); // ローカル検証だけの配信ツールを保存します。
console.log('Prepared v0.3.2 static publication candidate; no deployment or Microsoft changes.'); // 公開済みとは表示しません。
