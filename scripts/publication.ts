import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import type { Firestore } from 'firebase-admin/firestore';
import { batches, datasetSchema } from '../shared/dataset.js';
import { buildStatistics } from '../shared/statistics.js';
import { chunkId, parseDashboard, versionSchema } from '../shared/publication.js';

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
export function splitPayload(text: string, maxBytes = 100000) {
  const chunks: string[] = [];
  let chunk = '', bytes = 0;
  for (const character of text) {
    const size = Buffer.byteLength(character, 'utf8');
    if (bytes + size > maxBytes && chunk) { chunks.push(chunk); chunk = ''; bytes = 0; }
    chunk += character; bytes += size;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
export async function preparePublication(year = 2026) {
  const batch = batches[year];
  if (!batch) throw new Error('Unsupported batch year.');
  const raw = await readFile(new URL(`../data/placements-${year}.json`, import.meta.url), 'utf8');
  const dataset = datasetSchema.parse(JSON.parse(raw));
  const dashboard = parseDashboard({ metadata: dataset.metadata, statistics: buildStatistics(dataset, batch) });
  const payload = JSON.stringify(dashboard);
  const sourceHash = sha256(raw);
  const payloadHash = sha256(payload);
  const version = sha256(JSON.stringify({ schemaVersion: 1, sourceHash, payloadHash, batch }));
  const chunks = splitPayload(payload);
  versionSchema.parse({ schemaVersion: 1, payloadHash, chunkCount: chunks.length });
  return { dataset, dashboard, payload, sourceHash, payloadHash, version, chunks, batch };
}
export type Publication = Awaited<ReturnType<typeof preparePublication>>;

export async function stagePublication(db: Firestore, p: Publication) {
  const sourcePath = `imports/${p.batch.year}-${p.version}`;
  const versionPath = `batches/${p.batch.year}/versions/${p.version}`;
  const documents = [
    { path: sourcePath, data: { schemaVersion: 1, sourceHash: p.sourceHash, metadata: p.dataset.metadata, config: p.batch, recordCount: p.dataset.placements.length } },
    ...p.dataset.placements.map(record => ({ path: `${sourcePath}/announcements/${record.placement_id}`, data: { record } })),
    ...p.chunks.map((payload, i) => ({ path: `${versionPath}/views/${chunkId(i)}`, data: { payload } })),
    { path: versionPath, data: { schemaVersion: 1, sourceHash: p.sourceHash, payloadHash: p.payloadHash, chunkCount: p.chunks.length } },
  ];
  // Bounded transactions create only missing documents and reject changed contents.
  for (let offset = 0; offset < documents.length; offset += 100) {
    const group = documents.slice(offset, offset + 100);
    await db.runTransaction(async transaction => {
      const refs = group.map(item => db.doc(item.path));
      const existing = await transaction.getAll(...refs);
      group.forEach((item, i) => {
        if (existing[i].exists) {
          if (!isDeepStrictEqual(existing[i].data(), item.data)) throw new Error(`Existing document differs at ${item.path}; review the discrepancy before publishing.`);
        } else transaction.create(refs[i], item.data);
      });
    });
  }
}
export async function verifyPublication(db: Firestore, p: Publication, requireActive = true) {
  const sourcePath = `imports/${p.batch.year}-${p.version}`;
  const source = await db.doc(sourcePath).get();
  if (!source.exists || !isDeepStrictEqual(source.data()?.metadata, p.dataset.metadata) || !isDeepStrictEqual(source.data()?.config, p.batch) || source.data()?.sourceHash !== p.sourceHash) throw new Error('Private source metadata reconciliation failed.');
  const records = await db.collection(`${sourcePath}/announcements`).orderBy('__name__').get();
  if (!isDeepStrictEqual(records.docs.map(d => d.data().record), p.dataset.placements)) throw new Error('Full source record reconciliation failed.');
  const path = `batches/${p.batch.year}/versions/${p.version}`;
  const versionDoc = await db.doc(path).get();
  const version = versionSchema.parse(versionDoc.data());
  if (version.chunkCount !== p.chunks.length || version.payloadHash !== p.payloadHash) throw new Error('Version manifest reconciliation failed.');
  const chunks = await db.getAll(...p.chunks.map((_, i) => db.doc(`${path}/views/${chunkId(i)}`)));
  const payload = chunks.map(chunk => chunk.data()?.payload ?? '').join('');
  if (sha256(payload) !== p.payloadHash || !isDeepStrictEqual(parseDashboard(JSON.parse(payload)), p.dashboard)) throw new Error('Published dashboard reconciliation failed.');
  if (requireActive) {
    const manifest = await db.doc(`batches/${p.batch.year}`).get();
    if (manifest.data()?.activeVersion !== p.version) throw new Error('The verified dataset is not the active published version.');
  }
}
export async function activatePublication(db: Firestore, p: Publication, expectedVersion?: string) {
  if (expectedVersion !== undefined && !/^[a-f0-9]{64}$/.test(expectedVersion)) throw new Error('Expected version must be an explicit published SHA-256 version ID.');
  await verifyPublication(db, p, false);
  await db.runTransaction(async transaction => {
    const ref = db.doc(`batches/${p.batch.year}`);
    const previous = await transaction.get(ref);
    if (previous.exists && previous.data()?.activeVersion !== p.version) {
      if (previous.data()?.activeVersion !== expectedVersion) throw new Error('A different version is active. Review it and pass --expected-version with its exact version ID before replacing it.');
      transaction.update(ref, { activeVersion: p.version, publishedAt: Date.now() });
    }
    if (!previous.exists) transaction.create(ref, { year: p.batch.year, activeVersion: p.version, publishedAt: Date.now() });
  });
}
