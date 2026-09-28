import {readFile,writeFile,mkdir} from 'node:fs/promises'; // 検証コードと公開部品だけを読み書きします。
import {createHash} from 'node:crypto'; // 公開部品の固定ハッシュを照合します。
const file='practice-lab-probe/browser-storage.mjs'; // 本番アプリではなく独立した検証コードを対象にします。
let text=await readFile(file,'utf8'); // 元の受入条件を保持して起動環境だけ修正します。
text=text.replace("const browser=await engine.launch({headless:true});", "const browser={close:async()=>{}};"); // プロファイルごとの起動へ切り替えます。
text=text.replace('const context=await browser.newContext();', "const context=await engine.launchPersistentContext('',{headless:true});"); // WebKitの一時コンテキストにOPFSがないため永続プロファイルで実行します。
text=text.replace('const other=await browser.newContext();', "const other=await engine.launchPersistentContext('',{headless:true});"); // 別端末相当にも別の空の永続プロファイルを使います。
await writeFile(file,text); // 期待値は変えずに検証環境の修正を反映します。
const output='practice-lab-probe/site'; // 個人情報を含まない公開部品の保存先です。
await mkdir(output,{recursive:true}); // 保存フォルダを準備します。
const assets=[['msal-browser.min.js','Yuge-U/basketball-tactics-board','73ee537d2fcfba56661943b57f6f930112afdf6b'],['MSAL-LICENSE.txt','Yuge-U/basketball-tactics-board','5cf7c8db62837e4f91aaa5392443a2372d4a6937'],['terms.json','Yuge-U/zero-one-terminology','977fbc048c36884f998389f4f42f05fcd80bd043']]; // 既存アプリの公開版を固定します。
const manifest=[]; // 取得元と検査結果を記録します。
for(const [name,repo,sha]of assets){ // 公開された三つの部品だけを取得します。
  const response=await fetch(`https://api.github.com/repos/${repo}/git/blobs/${sha}`,{headers:{'User-Agent':'zero-one-browser-lab/0.3.0','Accept':'application/vnd.github+json'},signal:AbortSignal.timeout(60000)}); // 個人認証トークンを送信しません。
  if(!response.ok)throw new Error('Public asset HTTP '+response.status); // 失敗は中断します。
  const payload=await response.json();if(payload.encoding!=='base64')throw new Error('Unsupported blob encoding'); // 形式を確認します。
  const data=Buffer.from(payload.content,'base64'); // 配布された部品の元バイトへ戻します。
  const actual=createHash('sha1').update(Buffer.from('blob '+data.length+'\0')).update(data).digest('hex'); // Git blobのハッシュを求めます。
  if(actual!==sha)throw new Error('Asset hash mismatch: '+name); // 別の内容を配置しません。
  await writeFile(output+'/'+name,data); // 検査済み部品だけを保存します。
  manifest.push({name,repo,gitBlob:sha,sha256:createHash('sha256').update(data).digest('hex')}); // 追跡可能な検査値を記録します。
} // 公開部品の取得を終えます。
await writeFile(output+'/public-assets.json',JSON.stringify(manifest,null,2)); // 成果物に検証情報を含めます。
console.log('Verified public assets',manifest.map(v=>v.name).join(', ')); // 秘密情報を含まない結果だけを表示します。
