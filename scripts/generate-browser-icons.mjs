// Regenerate browser icons from the same self-hosted Lora italic p as the brand.
// Uses the existing Playwright dependency; no installed system font is required.
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const font = await readFile(new URL('public/fonts/lora/italic-latin.woff2', root));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(`<style>@font-face{font-family:Brand;src:url(data:font/woff2;base64,${font.toString('base64')});font-style:italic;font-weight:400}</style>`);
  await page.evaluate(() => document.fonts.load('italic 400 100px Brand'));
  const images = new Map();
  for (const size of [16, 32, 48, 180]) {
    const data = await page.evaluate(size => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      context.fillStyle = '#2445eb';
      context.fillRect(0, 0, size, size);
      context.font = 'italic 400 1000px Brand';
      const bounds = context.measureText('p');
      const height = bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent;
      const width = bounds.actualBoundingBoxLeft + bounds.actualBoundingBoxRight;
      const scale = Math.min(size * .74 / width, size * .84 / height);
      context.font = `italic 400 ${1000 * scale}px Brand`;
      context.fillStyle = '#ffffff';
      context.fillText('p', (size - width * scale) / 2 + bounds.actualBoundingBoxLeft * scale,
        (size - height * scale) / 2 + bounds.actualBoundingBoxAscent * scale);
      return canvas.toDataURL('image/png').split(',')[1];
    }, size);
    images.set(size, Buffer.from(data, 'base64'));
  }
  await writeFile(new URL('public/favicon-16x16.png', root), images.get(16));
  await writeFile(new URL('public/favicon-32x32.png', root), images.get(32));
  await writeFile(new URL('public/apple-touch-icon.png', root), images.get(180));

  // ICO directory with native 16/32/48px PNG entries for tab and bookmark use.
  const sizes = [16, 32, 48], header = Buffer.alloc(6 + sizes.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((size, index) => {
    const entry = 6 + index * 16, png = images.get(size);
    header[entry] = header[entry + 1] = size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  await writeFile(new URL('public/favicon.ico', root), Buffer.concat([header, ...sizes.map(size => images.get(size))]));
  console.log('Generated Placement Stats browser icons (16, 32, 48 and 180px).');
} finally {
  await browser.close();
}
