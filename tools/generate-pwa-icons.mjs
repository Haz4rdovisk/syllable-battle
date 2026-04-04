import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Jimp from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const iconDir = path.join(projectRoot, 'public', 'icons');
const sourceImagePath = path.join(projectRoot, 'tools', 'assets', 'spellcast-source.png');

const iconOutputs = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-maskable-192.png', size: 192 },
  { name: 'icon-maskable-512.png', size: 512 },
];

const renderPng = async (outputName, size) => {
  const outputPath = path.join(iconDir, outputName);
  const image = await Jimp.read(sourceImagePath);
  image.cover(size, size);
  await image.write(outputPath);
};

await fs.mkdir(iconDir, { recursive: true });
for (const output of iconOutputs) {
  await renderPng(output.name, output.size);
}

console.log(`Generated PWA icons in ${iconDir}`);
