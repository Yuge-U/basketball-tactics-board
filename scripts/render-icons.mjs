import sharp from 'sharp';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'branding/canvas-master.png'));
const { width, height } = await sharp(source).metadata();
if (width !== height || width < 1024) throw new Error('Native square artwork of at least 1024px required; no upscaling');
for (const [size, file] of [[180,'zeroone_icon_180.png'],[192,'zeroone_icon_192.png'],[512,'zeroone_icon_512.png'],[512,'zeroone_icon.png']]) {
  await sharp(source).resize(size,size,{kernel:'lanczos3',withoutEnlargement:true}).png().toFile(path.join(root,'1_App/img',file));
}
await writeFile(path.join(root,'1_App/img/zeroone_icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="ZERO ONE CANVAS"><image width="${width}" height="${height}" href="data:image/png;base64,${source.toString('base64')}"/></svg>\n`);

for (const size of [180,192]) await copyFile(path.join(root,`1_App/img/zeroone_icon_${size}.png`),path.join(root,`safari-canvas-${size}-20261007j.png`));
