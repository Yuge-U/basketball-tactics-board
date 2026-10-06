import sharp from 'sharp'; // 承認済みCANVAS画像から各アイコンを生成します。
import {readFile} from 'node:fs/promises'; // 原版を検証します。
import {createHash} from 'node:crypto'; // 原版SHAを固定します。
const source='branding/approved-canvas.webp';const bytes=await readFile(source);if(createHash('sha256').update(bytes).digest('hex')!=='adb7a1116a8069eb4c1d1422f688cdcdd0e96f5affbb65ca6151c659ebbbdbdf')throw new Error('Approved CANVAS artwork mismatch'); // 別画像なら停止します。
const jobs=[[180,'1_App/img/zeroone_icon_180.png'],[192,'1_App/img/zeroone_icon_192.png'],[512,'1_App/img/zeroone_icon_512.png'],[512,'1_App/img/zeroone_icon.png']]; // 既存参照先を維持します。
for(const [size,path] of jobs)await sharp(source).resize(size,size,{fit:'cover'}).png().toFile(path); // 承認画像をサイズ変換だけします。
