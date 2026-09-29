import {readFile,writeFile,mkdir} from 'node:fs/promises'; // 合成テスト用の公開コードだけを配置します。
import {resolve,dirname,sep} from 'node:path'; // 展開先の境界を検査します。
import {createHash} from 'node:crypto'; // 転送コードと公開部品のハッシュを照合します。
import {brotliDecompressSync} from 'node:zlib'; // 検査済みソース転送を展開します。
import assert from 'node:assert/strict'; // 不一致を無視せず停止します。
import {pathToFileURL} from 'node:url'; // 検証済みの展開済みモジュールを読みます。
const root=resolve('practice-ui-lab/app'); // 本番と別のCI専用領域を使用します。
const digest=(bytes,algorithm='sha256')=>createHash(algorithm).update(bytes).digest('hex'); // 各バイト列の照合値を求めます。
const parts=await Promise.all([0,1,2].map(n=>readFile(`practice-ui-lab/transport/source.${n}.b64`,'utf8'))); // 順番固定でソース分割を読み込みます。
const compressed=Buffer.from(parts.map(p=>p.trim()).join(''),'base64'); // 元の圧縮バイト列を復元します。
assert.equal(digest(compressed),'6b3b6a39c1915a8937467168ada01f09c1de94df432955940c31c9868cc58584'); // 1バイトでも転送が違えば実行しません。
const files=JSON.parse(brotliDecompressSync(compressed).toString('utf8')); // 実行内容のAST一致を確認したソースを展開します。
const manifest=JSON.parse(files['SOURCE_MANIFEST.json']); // 元ソースと転送版の検査値を取得します。
for(const [name,text] of Object.entries(files)){ // 指定したアプリファイルだけを書き出します。
  const target=resolve(root,name);assert(target.startsWith(root+sep)&&typeof text==='string'); // パス脱出と不正な内容を拒否します。
  if(name!=='SOURCE_MANIFEST.json')assert.equal(digest(Buffer.from(text)),manifest.files[name].transport); // 各ファイルの内容も照合します。
  await mkdir(dirname(target),{recursive:true});await writeFile(target,text); // 公開コードをCIの専用作業領域に配置します。
} // ソース復元を終えます。
const {zipEntries,verifyBytes,gitBlobHash}=await import(pathToFileURL(resolve(root,'tools/vendor-utils.mjs')).href); // 検査済みのZIP読込とGitハッシュ関数を使います。
async function bytes(url,authenticated=false){ // 公開部品を期限付きで取得します。
  const target=new URL(url);const headers={'User-Agent':'ZERO-ONE-UI-Recheck/0.3.1'}; // 取得元とヘッダーを限定します。
  if(authenticated){assert.equal(target.origin,'https://api.github.com');assert(target.pathname.startsWith('/repos/Yuge-U/'));if(process.env.GH_TOKEN)headers.Authorization='Bearer '+process.env.GH_TOKEN;} // CIの読取トークンは許可したGitHubの宛先だけへ送ります。
  const response=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(60000)}); // 別ホストへの認証転送を拒否します。
  if(!response.ok)throw new Error('Public dependency HTTP '+response.status+' '+target.pathname); // 取得失敗を空の部品で代用しません。
  const data=Buffer.from(await response.arrayBuffer());assert(data.length<30*1024*1024);return data; // 取得容量を制限します。
} // 取得関数を閉じます。
const archive=verifyBytes(await bytes('https://sqlite.org/2026/sqlite-wasm-3530400.zip'),'e4fa7e1750b42f6954115d8e69ffff7dc08da7e9fee6e28a2a0ea6bf228a49f2','sha3-256'); // 公式ZIPを固定値と照合します。
const entries=zipEntries(archive); // 検査が済んだZIPだけ展開します。
for(const name of ['sqlite3.js','sqlite3.wasm']){const match=[...entries].filter(([p])=>p===name||p.endsWith('/'+name));assert.equal(match.length,1);await writeFile(resolve(root,'web/vendor',name),match[0][1]);} // SQLiteの必要部品のみを配置します。
const assets=[['Yuge-U/basketball-tactics-board','73ee537d2fcfba56661943b57f6f930112afdf6b','vendor/msal-browser.min.js'],['Yuge-U/basketball-tactics-board','5cf7c8db62837e4f91aaa5392443a2372d4a6937','vendor/MSAL-LICENSE.txt'],['Yuge-U/zero-one-terminology','977fbc048c36884f998389f4f42f05fcd80bd043','data/terms.json']]; // 公開済みの認証部品と既存用語集を版固定します。
for(const [repo,sha,name] of assets){const record=JSON.parse((await bytes(`https://api.github.com/repos/${repo}/git/blobs/${sha}`,true)).toString('utf8'));assert.equal(record.encoding,'base64');const data=Buffer.from(record.content,'base64');assert.equal(gitBlobHash(data),sha);await writeFile(resolve(root,'web',name),data);} // 元Git blobと一致するものだけ実行へ渡します。
const lock=JSON.parse(await readFile(resolve(root,'web/vendor/vendor-lock.json'),'utf8')); // 同梱版の既存ロックを保持します。
for(const file of lock.files)assert.equal(digest(await readFile(resolve(root,'web',file.name))),file.sha256); // CIの部品が配布版と完全一致することを検査します。
await mkdir(resolve(root,'reports'),{recursive:true});await writeFile(resolve(root,'reports/source-verification.json'),JSON.stringify({verified:true,compressedSha256:digest(compressed),fileCount:Object.keys(manifest.files).length,transform:manifest.transform,dependencies:lock.files.map(f=>({name:f.name,sha256:f.sha256})),physicalIPhone:false,realMicrosoft:false},null,2)); // 秘密情報を含まない検査証拠を保存します。
console.log('Verified exact dependency bytes and executable-equivalent v0.3.1 UI source. No personal cloud access.'); // 実機検証と混同しない結果を表示します。
