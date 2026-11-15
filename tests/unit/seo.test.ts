import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('public search metadata describes the site and uses its canonical origin', () => {
  const html = readFileSync('index.html', 'utf8');
  const app = readFileSync('src/app/App.tsx', 'utf8');
  assert.match(html, /<title>KJSCE Placement Statistics &amp; Experiences \| Placement Stats<\/title>/);
  assert.match(html, /<meta name="description" content="Explore KJSCE \(KJ Somaiya College of Engineering\)/);
  assert.match(html, /<link rel="canonical" href="https:\/\/kjsce-placements\.vercel\.app\/" \/>/);
  assert.match(app, /route\.page === 'landing'\s*\?\s*'KJSCE Placement Statistics & Experiences \| Placement Stats'/);

  assert.match(html, /<script src="\/seo-init\.js"><\/script>/);
  let structuredData: { type?: string; textContent?: string } | undefined;
  runInNewContext(readFileSync('public/seo-init.js', 'utf8'), {
    document: {
      createElement: () => ({ type: '', textContent: '' }),
      head: { appendChild: (element: { type?: string; textContent?: string }) => { structuredData = element; } },
    },
  });
  assert.ok(structuredData?.textContent);
  assert.equal(structuredData.type, 'application/ld+json');
  const website = JSON.parse(structuredData.textContent) as { '@type': string; url: string };
  assert.equal(website['@type'], 'WebSite');
  assert.equal(website.url, 'https://kjsce-placements.vercel.app/');
});

test('the sitemap lists only the public canonical landing page', () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  assert.deepEqual(
    [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url),
    ['https://kjsce-placements.vercel.app/'],
  );
  assert.match(readFileSync('public/robots.txt', 'utf8'), /Sitemap: https:\/\/kjsce-placements\.vercel\.app\/sitemap\.xml/);
});
