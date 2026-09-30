import sharp from 'sharp';import icons from 'png2icons';import{writeFile}from'node:fs/promises';
const png=await sharp('assets/icon.svg').png().toBuffer();await writeFile('assets/icon.png',png);await writeFile('assets/icon.icns',icons.createICNS(png,icons.BICUBIC,0));await writeFile('assets/icon.ico',icons.createICO(png,icons.BICUBIC,0,false));
