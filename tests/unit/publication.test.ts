import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkId, manifestSchema, parseDashboard, versionSchema } from '../../shared/publication.js';
import { preparePublication, sha256, splitPayload } from '../../scripts/publication.js';

test('published dashboard validates and reconciles legacy counts', async () => {
  const p = await preparePublication();
  assert.equal(p.dashboard.statistics.summary.selections, 311);
  assert.equal(p.dashboard.statistics.summary.uniqueStudents, 299);
  assert.equal(p.dashboard.statistics.companies.length, 82);
  assert.deepEqual(parseDashboard(JSON.parse(p.chunks.join(''))), p.dashboard);
  assert.equal(sha256(p.chunks.join('')), p.payloadHash);
  assert.ok(p.chunks.every(c => Buffer.byteLength(c) <= 100000));
});
test('chunking respects byte sizes and preserves emoji/unicode', () => {
  const text = '₹a🚀é'.repeat(100);
  const chunks = splitPayload(text, 31);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(chunk => Buffer.byteLength(chunk) <= 31));
  assert.equal(chunkId(0), 'chunk-0000');
});
test('version ID and published output are deterministic', async () => {
  const a = await preparePublication(), b = await preparePublication();
  assert.equal(a.version, b.version);
  assert.deepEqual(a.chunks, b.chunks);
});
test('invalid manifests and unbounded chunk reads are rejected', () => {
  assert.equal(manifestSchema.safeParse({ year: 2026, activeVersion: '../imports' }).success, false);
  assert.equal(versionSchema.safeParse({ schemaVersion: 1, chunkCount: 129, payloadHash: 'a'.repeat(64) }).success, false);
  assert.throws(() => parseDashboard({ metadata: {}, statistics: { summary: {} } }));
});
