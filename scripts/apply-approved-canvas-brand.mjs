import { readFile, writeFile } from 'node:fs/promises'; // 承認画像と既存画面だけを扱います。
import { createHash } from 'node:crypto'; // 承認原版の一致を検証します。
import sharp from 'sharp'; // 再デザインせず必要サイズへ高品質変換します。
const chunks=[]; // 分割転送された原版を順番に戻します。
for(let index=0;index<=5;index++)chunks.push(await readFile('branding/import/canvas.part'+String(index).padStart(2,'0'),'utf8')); // 全分割を漏れなく読みます。
const source=Buffer.from(chunks.join(''),'base64'); // 承認済みWebPの元バイトへ戻します。
const sha=createHash('sha256').update(source).digest('hex'); // 変換前の原版を検査します。
if(sha!=='54f765a6776718e6f6ce868347f0aa7daabf7b00f7de97d9ac4837b3056c41a2')throw new Error('Approved CANVAS artwork mismatch: '+sha); // 別画像なら停止します。
const meta=await sharp(source).metadata(); // 解像度と形式を確認します。
if(meta.format!=='webp'||meta.width!==512||meta.height!==512)throw new Error('Unexpected CANVAS source geometry'); // 転送破損を拒否します。
await sharp(source).png().toFile('1_App/img/zeroone_icon.png'); // アプリ内参照用512px PNGを作ります。
await sharp(source).resize(512,512,{fit:'fill'}).png().toFile('1_App/img/zeroone_icon_512.png'); // PWA用512pxを作ります。
await sharp(source).resize(192,192,{fit:'fill'}).png().toFile('1_App/img/zeroone_icon_192.png'); // PWA/Favicon用192pxを作ります。
await sharp(source).resize(180,180,{fit:'fill'}).png().toFile('1_App/img/zeroone_icon_180.png'); // iPhone用180pxを作ります。
let html=await readFile('index.html','utf8'); // 既存CANVAS画面を読みます。
const replaceOne=(before,after,label)=>{const count=html.split(before).length-1;if(count!==1)throw new Error('CANVAS '+label+' target count '+count);html=html.replace(before,after);}; // 想定外のHTMLには適用しません。
replaceOne('<link rel="icon" type="image/svg+xml" href="./1_App/img/zeroone_icon.svg?v=20261006d" /><link rel="alternate icon" type="image/png" sizes="192x192" href="./1_App/img/zeroone_icon_192.png?v=20261006d" />','<link rel="icon" type="image/png" sizes="192x192" href="./1_App/img/zeroone_icon_192.png?v=20261007a" /><link rel="alternate icon" type="image/png" sizes="512x512" href="./1_App/img/zeroone_icon_512.png?v=20261007a" />','favicon'); // ブラウザアイコンを承認画像へ切替えます。
replaceOne('<link rel="apple-touch-icon" href="./1_App/img/zeroone_icon_180.png?v=20261006d" />','<link rel="apple-touch-icon" sizes="180x180" href="./1_App/img/zeroone_icon_180.png?v=20261007a" />','apple icon'); // iPhoneホーム画面を承認画像へ切替えます。
html=html.replaceAll('<img src="./1_App/img/zeroone_icon.png" alt="ZERO ONE">','<img src="./1_App/img/zeroone_brand.svg?v=20261007a" alt="ZERO ONE">'); // モバイルヘッダーは共通ZERO ONEロゴへ統一します。
html=html.replaceAll('<img src="./1_App/img/zeroone_icon.png" alt="">','<img src="./1_App/img/zeroone_brand.svg?v=20261007a" alt="">'); // SplashとPCヘッダーは共通ZERO ONEロゴへ統一します。
await writeFile('index.html',html); // 既存機能に触れずブランド参照だけ保存します。
const check180=await sharp('1_App/img/zeroone_icon_180.png').metadata(); // iPhone用画像を検証します。
const check192=await sharp('1_App/img/zeroone_icon_192.png').metadata(); // PWA小画像を検証します。
const check512=await sharp('1_App/img/zeroone_icon_512.png').metadata(); // PWA大画像を検証します。
if(check180.width!==180||check180.height!==180||check192.width!==192||check192.height!==192||check512.width!==512||check512.height!==512)throw new Error('CANVAS icon size verification failed'); // サイズ違いを公開しません。
console.log('Approved CANVAS artwork verified and rendered',sha); // 合格した原版ハッシュを記録します。
