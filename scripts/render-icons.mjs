import sharp from 'sharp'; // ZERO ONE CANVASのSVG原版から各アイコンを生成します。
const jobs=[[180,'1_App/img/zeroone_icon_180.png'],[192,'1_App/img/zeroone_icon_192.png'],[512,'1_App/img/zeroone_icon_512.png'],[512,'1_App/img/zeroone_icon.png']]; // 既存参照先を維持します。
for(const [size,path] of jobs){await sharp('1_App/img/zeroone_icon.svg').resize(size,size).png().toFile(path);} // 同一デザインを各寸法へ変換します。
