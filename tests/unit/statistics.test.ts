import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { batch2026, datasetSchema } from '../../shared/dataset.js';
import { average, buildStatistics, histogram, median } from '../../shared/statistics.js';

const dataset = datasetSchema.parse(JSON.parse(readFileSync('data/placements-2026.json', 'utf8')));
const statistics = buildStatistics(dataset, batch2026);

test('migration reconciles all known source counts and preserves metadata', () => {
  assert.equal(statistics.summary.announcements, 100);
  assert.equal(statistics.summary.selections, 311);
  assert.equal(statistics.summary.uniqueStudents, 299);
  assert.equal(statistics.summary.companies, 82);
  assert.equal(statistics.summary.reportedCounter, 310);
  assert.equal(statistics.summary.ctcCoverage, 99);
  assert.equal(statistics.summary.notConfirmedPlaced, 225);
  assert.equal(dataset.metadata.total_candidates_listed, 311);
});
test('headline and branch metrics agree with independently executed preserved legacy calculations', () => {
  // This executes only the trusted, preserved local aggregation section, never source documents.
  const html = readFileSync('legacy/index.html', 'utf8');
  const start = html.indexOf('  const PLACEMENTS = RAW_DATA.placements;');
  const end = html.indexOf('  const mainEl = document.getElementById("main");', start);
  const output = vm.runInNewContext(html.slice(start, end) + '\nJSON.stringify({ AVG_CTC, MEDIAN_CTC, HIGHEST_CTC, PLACEMENT_RATE, MULTI_SELECTED_STUDENTS, BRANCH_DATA: BRANCH_DATA.map(b => ({ branch:b.branch, selections:b.selections, uniqueStudents:b.uniqueStudents, companiesCount:b.companiesCount, avgCtc:b.avgCtc, medianCtc:b.medianCtc, highestCtc:b.highestCtc })) })', { RAW_DATA: dataset });
  const legacy = JSON.parse(output);
  assert.equal(statistics.summary.avgCtc, legacy.AVG_CTC);
  assert.equal(statistics.summary.medianCtc, legacy.MEDIAN_CTC);
  assert.equal(statistics.summary.highestCtc, legacy.HIGHEST_CTC);
  assert.equal(statistics.summary.placementRate, legacy.PLACEMENT_RATE);
  assert.equal(statistics.summary.multiSelectedStudents, legacy.MULTI_SELECTED_STUDENTS);
  for (const b of legacy.BRANCH_DATA) {
    const migrated = statistics.branches.find(row => row.branch === b.branch)!;
    for (const key of Object.keys(b)) assert.equal(migrated[key as keyof typeof migrated], b[key]);
  }
});
test('unknown source counters are not fabricated and calculated selections remain separate', () => {
  const last = statistics.timeline.find(p => p.id === 'PL100')!;
  assert.equal(last.reportedCumulative, null);
  assert.equal(last.selections, 311);
  assert.equal(last.uniqueStudents, 299);
});
test('unknown or zero denominator does not invent a placement rate', () => {
  assert.equal(buildStatistics(dataset, { ...batch2026, registeredStudents: null }).summary.placementRate, null);
  assert.equal(buildStatistics(dataset, { ...batch2026, registeredStudents: 0 }).summary.placementRate, null);
});
test('empty batch produces stable null metrics and empty views', () => {
  const result = buildStatistics({ metadata: {}, placements: [] }, { ...batch2026, registeredStudents: null });
  assert.equal(result.summary.avgCtc, null);
  assert.equal(result.summary.highestCtc, null);
  assert.equal(result.summary.latestDate, null);
  assert.deepEqual(result.timeline, []);
  assert.deepEqual(result.companies, []);
});
test('mixed CTC stays unknown in numerical aggregates', () => {
  const mixed = dataset.placements.find(p => p.compensation.ctc_value_lpa === null)!;
  const result = buildStatistics({ metadata: {}, placements: [mixed] }, batch2026);
  assert.equal(result.summary.avgCtc, null);
  assert.ok(result.candidates.every(c => c.ctc === null));
});
test('median and histogram boundaries handle even, odd, empty and edge cases', () => {
  assert.equal(median([9, 1, 5]), 5);
  assert.equal(median([10, 2, 8, 4]), 6);
  assert.equal(median([]), null);
  assert.equal(average([]), null);
  assert.deepEqual(histogram([4.99, 5, 8, 11, 14, 18]).map(b => b.value), [1, 1, 1, 1, 1, 1]);
});
test('duplicate announcement IDs and invalid source dates are rejected', () => {
  assert.equal(datasetSchema.safeParse({ ...dataset, placements: [dataset.placements[0], dataset.placements[0]] }).success, false);
  const invalid = structuredClone(dataset.placements[0]);
  invalid.result.declared_date = '2026-02-30';
  assert.equal(datasetSchema.safeParse({ ...dataset, placements: [invalid] }).success, false);
});
