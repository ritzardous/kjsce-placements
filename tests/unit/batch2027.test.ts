import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { batch2027, datasetSchema } from '../../shared/dataset.js';
import { buildStatistics } from '../../shared/statistics.js';
import { preparePublication } from '../../scripts/publication.js';

const data = datasetSchema.parse(JSON.parse(readFileSync('data/placements-2027.json', 'utf8')));
const reviewed = JSON.parse(readFileSync('data/sources-2027/reviewed-announcements.json', 'utf8'));
const s = buildStatistics(data, batch2027);
test('2027 preserves all reviewed rows and reconciles every source running counter', () => {
  assert.deepEqual(data.placements, reviewed);
  assert.equal(s.summary.announcements, 22);
  assert.equal(s.summary.selections, 121);
  assert.equal(s.summary.uniqueStudents, 121);
  assert.equal(s.summary.companies, 19);
  let cumulative = 0;
  for (const p of data.placements) {
    cumulative += p.candidates.length;
    assert.equal(p.hiring.students_hired, p.candidates.length);
    assert.equal(p.hiring.placement_count, cumulative);
    assert.ok(p.source.pages.length && p.source.pages.every(page => page >= 1 && page <= 16));
  }
  assert.equal(s.summary.reportedCounter, 121);
  assert.equal(s.summary.latestDate, '2026-10-06');
  assert.equal(data.metadata.source_updated_at, '2026-10-08T14:42:00+05:30');
  assert.equal(data.metadata.season_status, 'ongoing');
});
test('2027 leaves the denominator and mixed packages unknown and preserves new branch labels', () => {
  assert.equal(s.summary.placementRate, null);
  assert.equal(s.summary.notConfirmedPlaced, null);
  assert.equal(s.summary.highestCtc, 31.79);
  assert.equal(s.summary.ctcCoverage, 19);
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
  assert.equal(p.dashboard.statistics.summary.selections, 121);
  assert.equal((await preparePublication()).batch.year, 2026);
});
