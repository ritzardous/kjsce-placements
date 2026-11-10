import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { batch2025, datasetSchema } from '../../shared/dataset.js';
import { buildStatistics } from '../../shared/statistics.js';
import { preparePublication } from '../../scripts/publication.js';

const data = datasetSchema.parse(JSON.parse(readFileSync('data/placements-2025.json', 'utf8')));
const rows = JSON.parse(readFileSync('data/sources-2025/report-rows.json', 'utf8')) as { serial: number; roll: string; name: string; ctc: string; campus: string; page: number }[];
const s = buildStatistics(data, batch2025);
test('2025 preserves all 360 official selection rows and their source fields without adding email duplicates', () => {
  const published = data.placements.flatMap(p => p.source.report_rows as typeof rows).sort((a, b) => a.serial - b.serial);
  assert.deepEqual(published, rows);
  assert.equal(s.summary.selections, 360);
  assert.equal(s.summary.uniqueStudents, 323);
  assert.equal(s.candidates.filter(c => c.campus === 'On campus').length, 331);
  assert.equal(s.candidates.filter(c => c.campus === 'Off campus').length, 29);
  for (const p of data.placements) for (const c of p.candidates) {
    const r = rows.find(r => r.serial === c.report_serial)!;
    assert.equal(c.name, r.name); assert.equal(c.roll_number, r.roll);
    assert.equal(p.compensation.ctc_value_lpa, r.ctc === 'ND' ? null : Number(r.ctc));
    assert.ok(p.source.pages.includes(r.page));
  }
});
test('undated selections and missing denominators remain unknown rather than creating a false timeline or rate', () => {
  assert.equal(s.candidates.filter(c => c.date === null).length, 77);
  assert.equal(s.timeline.at(-1)?.selections, 283);
  assert.ok(s.timeline.every(p => p.date !== null));
  assert.equal(s.summary.placementRate, null); assert.equal(s.summary.notConfirmedPlaced, null); assert.equal(s.summary.reportedCounter, null);
  assert.equal(s.candidates.filter(c => !c.role).length, 76);
  assert.ok(s.roles.every(r => r.label !== '' && r.label !== 'Not provided'));
  assert.equal(s.companies.find(c => c.key === 'goldman-sachs')?.firstDate, null);
});
test('2025 CTC uses 353 known official selection values and preserves source disagreements', () => {
  const values = rows.filter(r => r.ctc !== 'ND').map(r => Number(r.ctc));
  assert.equal(s.summary.ctcCoverage, 353);
  assert.equal(s.candidates.filter(c => c.ctc === null).length, 7);
  assert.equal(s.summary.highestCtc, 51.72);
  assert.equal(s.summary.avgCtc, values.reduce((a, b) => a + b, 0) / values.length);
  const google = data.placements.find(p => p.company.normalized_name === 'google')!;
  assert.equal(google.campus, 'Off campus'); assert.match(google.notes!, /PPO/);
  const barclays = data.placements.find(p => p.company.normalized_name === 'barclays' && p.compensation.ctc_value_lpa === 14)!;
  assert.match(barclays.notes!, /12.67/);
  assert.equal((data.metadata.compensation_conflicts as unknown[]).length, 12);
});
test('2025 publication validates independently while default publication stays on 2026', async () => {
  const p = await preparePublication(2025);
  assert.equal(p.dashboard.statistics.batch.year, 2025);
  assert.equal(p.dashboard.statistics.summary.selections, 360);
  assert.equal((await preparePublication()).batch.year, 2026);
  await assert.rejects(preparePublication(2028), /Unsupported batch/);
});
