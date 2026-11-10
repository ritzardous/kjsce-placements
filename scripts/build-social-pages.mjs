import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Give newly shared links a fresh card identity without redirects or JavaScript
// metadata. Both URLs serve the real app, including its existing auth flow.
const output = new URL('../dist/', import.meta.url);
const origin = 'https://kjsce-placements.vercel.app';
const image = await readFile(new URL('social/placement-stats-preview.png', output));
const hash = createHash('sha256').update(image).digest('hex').slice(0, 12);
const imagePath = `social/placement-stats-${hash}.png`;
await writeFile(new URL(imagePath, output), image);
const html = (await readFile(new URL('index.html', output), 'utf8'))
  .replaceAll(`${origin}/social/placement-stats-preview.png`, `${origin}/${imagePath}`);
await writeFile(new URL('index.html', output), html);
const share = html
  .replace(`rel="canonical" href="${origin}/"`, `rel="canonical" href="${origin}/share/"`)
  .replace(`property="og:url" content="${origin}/"`, `property="og:url" content="${origin}/share/"`);
await mkdir(new URL('share/', output), { recursive: true });
await writeFile(new URL('share/index.html', output), share);
console.log(`Social preview: /share/ and /${imagePath}`);
