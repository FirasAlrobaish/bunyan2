import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('./icon-source.svg');
await sharp(svg).resize(192, 192).png().toFile('./public/icon-192.png');
await sharp(svg).resize(512, 512).png().toFile('./public/icon-512.png');
console.log('✅ تم إنشاء الأيقونات!');
