import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { batch2027, datasetSchema } from '../../shared/dataset.js';
import { buildStatistics } from '../../shared/statistics.js';
import { preparePublication } from '../../scripts/publication.js';

const data = datasetSchema.parse(JSON.parse(readFileSync('data/placements-2027.json', 'utf8')));
const reviewed = JSON.parse(readFileSync('data/sources-2027/reviewed-announcements.json', 'utf8'));
const s = buildStatistics(data, batch2027);
test('2027 preserves all reviewed rows and reconciles every source running counter', () => {
  assert.deepEqual(data.placements, reviewed);
  assert.equal(s.summary.announcements, 30);
  assert.equal(s.summary.selections, 142);
  assert.equal(s.summary.uniqueStudents, 142);
  assert.equal(s.summary.companies, 25);
  let cumulative = 0;
  for (const p of data.placements) {
    cumulative += p.candidates.length;
    assert.equal(p.hiring.students_hired, p.candidates.length);
    assert.equal(p.hiring.placement_count, cumulative);
    const pages = p.source.source_file === '27batchemailthread.pdf' ? 16 : 21;
    assert.ok(p.source.pages.length && p.source.pages.every(page => page >= 1 && page <= pages));
  }
  assert.equal(s.summary.reportedCounter, 142);
  assert.equal(s.summary.latestDate, '2026-11-04');
  assert.equal(data.metadata.source_updated_at, '2026-11-06T15:05:00+05:30');
  assert.equal(data.metadata.season_status, 'ongoing');
});
test('2027 leaves the denominator and mixed packages unknown and preserves new branch labels', () => {
  assert.equal(s.summary.placementRate, null);
  assert.equal(s.summary.notConfirmedPlaced, null);
  assert.equal(s.summary.highestCtc, 31.79);
  assert.equal(s.summary.ctcCoverage, 27);
  assert.equal(s.candidates.filter(c => c.ctc === null).length, 52);
  assert.equal(s.candidates.find(c => c.roll === '16014223022')?.role, 'Decision Analytics Associate');
  assert.equal(s.candidates.find(c => c.roll === '16014223082')?.role, 'Business Technology Solutions Associate');
  assert.equal(s.candidates.find(c => c.roll === '16010423004')?.branch, 'IT');
  assert.equal(s.candidates.find(c => c.roll === '16010123004')?.name, 'Aakanksha Singh');
  assert.ok(s.branches.some(b => b.branch === 'AI & DS'));
  assert.ok(s.branches.some(b => b.branch === 'RAI'));
  assert.equal(s.companies.find(c => c.key === 'tata-consultancy-services')?.announcements.length, 2);
  assert.equal(s.companies.find(c => c.key === 'stonex')?.announcements.length, 2);
});
test('2027 publishes independently and retains live coverage metadata', async () => {
  const p = await preparePublication(2027);
  assert.equal(p.dashboard.statistics.batch.year, 2027);
  assert.equal(p.dashboard.metadata.season_status, 'ongoing');
  assert.equal(p.dashboard.statistics.summary.selections, 142);
  assert.equal((await preparePublication()).batch.year, 2026);
});

test('November source adds exactly eight results with distinct roles and original provenance', () => {
  assert.equal(createHash('sha256').update(JSON.stringify(reviewed.slice(0,22))).digest('hex'), '2c94160dd5e3213f5114e065f4dc8be9fd1fcd35c2b659933088fa6f00ddf71d');
  const added = data.placements.slice(22);
  assert.deepEqual(added.map(p => [p.company.normalized_name, p.candidates.length, p.hiring.placement_count]), [
    ['bizom',2,123],['icici-prudential-amc',4,127],['capgemini',1,128],['iks-health',7,135],
    ['saint-gobain',2,137],['zeus-learning',1,138],['marsh',2,140],['framatome',2,142],
  ]);
  assert.ok(added.every(p => p.source.source_file === '27batch all placements till now.pdf'));
  const iks = added.find(p => p.company.normalized_name === 'iks-health')!;
  assert.equal(iks.candidates.filter(c => c.role === 'Tech Engineer').length, 4);
  assert.equal(iks.candidates.filter(c => c.role === 'Business Analyst').length, 3);
  assert.deepEqual(iks.candidates.map(c => c.role), ['Tech Engineer','Tech Engineer','Tech Engineer','Tech Engineer','Business Analyst','Business Analyst','Business Analyst']);
  const manifest = data.metadata.source_manifest;
  assert.ok(manifest && typeof manifest === 'object' && 'exported_at' in manifest && 'sha256' in manifest);
  assert.equal(manifest.exported_at, '2026-11-16T08:38:32+05:30');
  assert.equal(manifest.sha256, '4653e074dbc06c047a01fbc4fffdcd42983b1b95411c4e3a88173862cbb4ddd0');
  assert.equal(added.at(-1)!.source.email_sent_at, '2026-11-06T15:05:00+05:30');
  assert.equal(added.at(-1)!.result.declared_date, '2026-11-04');
  assert.equal(data.placements.filter(p => p.company.normalized_name === 'bizom').length, 2);
  assert.ok(data.placements.slice(0,22).every(p => p.source.source_file === '27batchemailthread.pdf'));
});
