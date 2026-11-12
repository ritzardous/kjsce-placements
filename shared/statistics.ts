import type { Announcement, BatchConfig, Dataset } from './dataset.js';

export const histogramBands = [
  { label: '<5L', min: 0, max: 5 }, { label: '5–8L', min: 5, max: 8 },
  { label: '8–11L', min: 8, max: 11 }, { label: '11–14L', min: 11, max: 14 },
  { label: '14–18L', min: 14, max: 18 }, { label: '18L+', min: 18, max: Infinity },
];
export function histogram(values: number[]) {
  return histogramBands.map(b => ({ label: b.label, value: values.filter(v => v >= b.min && v < b.max).length }));
}
export function average(values: number[]) { return values.length ? values.reduce((n, v) => n + v, 0) / values.length : null; }
export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? (sorted[Math.floor(sorted.length / 2)] + sorted[Math.ceil(sorted.length / 2) - 1]) / 2 : null;
}
const ranking = (values: string[]) => {
  const counts = new Map<string, number>();
  values.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
};
const known = (values: (number | null)[]) => values.filter((v): v is number => v !== null);
const max = (values: number[]) => values.length ? Math.max(...values) : null;

export function buildStatistics(dataset: Dataset, batch: BatchConfig) {
  const placements = dataset.placements;
  const candidates = placements.flatMap(p => p.candidates.map(c => ({
    name: c.name, roll: c.roll_number, branch: c.branch, role: c.role,
    company: p.company.name, companyKey: p.company.normalized_name, companyType: p.company.type,
    ctc: p.compensation.ctc_value_lpa, ctcText: p.compensation.ctc_text,
    date: p.result.declared_date, placementId: p.placement_id,
    ...(p.campus ? { campus: p.campus } : {}),
  })));
  const grouped = new Map<string, Announcement[]>();
  placements.forEach(p => grouped.set(p.company.normalized_name, [...(grouped.get(p.company.normalized_name) ?? []), p]));
  const companies = [...grouped].map(([key, records]) => ({
    key, name: records[0].company.name, type: records.find(p => p.company.type !== 'Not provided')?.company.type ?? records[0].company.type,
    announcements: [...records].sort((a, b) => (a.result.declared_date ?? '9999').localeCompare(b.result.declared_date ?? '9999')),
    totalHired: records.reduce((n, p) => n + p.hiring.students_hired, 0),
    highestCtc: max(known(records.map(p => p.compensation.ctc_value_lpa))),
    roles: [...new Set(records.flatMap(p => p.roles))],
    branches: [...new Set(records.flatMap(p => p.candidates.map(c => c.branch)))],
    firstDate: records.flatMap(p => p.result.declared_date ? [p.result.declared_date] : []).sort().at(0) ?? null,
    lastDate: records.flatMap(p => p.result.declared_date ? [p.result.declared_date] : []).sort().at(-1) ?? null,
  }));
  const branches = ranking(candidates.map(c => c.branch)).map(({ label: branch }) => {
    const rows = candidates.filter(c => c.branch === branch);
    const values = known(rows.map(c => c.ctc));
    return {
      branch, candidates: rows, selections: rows.length, uniqueStudents: new Set(rows.map(c => c.roll)).size,
      companiesCount: new Set(rows.map(c => c.companyKey)).size,
      avgCtc: average(values), medianCtc: median(values), highestCtc: max(values), ctcCoverage: values.length,
      companyRanking: ranking(rows.map(c => c.company)), roleRanking: ranking(rows.map(c => c.role).filter(Boolean)),
      histogram: histogram(values), pctOfTotal: candidates.length ? rows.length / candidates.length * 100 : 0,
    };
  });
  const sorted = placements.filter((p): p is Announcement & { result: { declared_date: string; original_date_text: string } } => p.result.declared_date !== null).sort((a, b) => a.result.declared_date.localeCompare(b.result.declared_date) || a.placement_id.localeCompare(b.placement_id));
  let selections = 0;
  const unique = new Set<string>();
  const timeline = sorted.map(p => {
    selections += p.candidates.length;
    p.candidates.forEach(c => unique.add(c.roll_number));
    return { id: p.placement_id, date: p.result.declared_date, company: p.company.name, companyKey: p.company.normalized_name,
      hired: p.hiring.students_hired, selections, uniqueStudents: unique.size,
      reportedCumulative: p.hiring.placement_count, ctc: p.compensation.ctc_value_lpa };
  });
  const values = known(batch.ctcWeighting === 'selection' ? candidates.map(c => c.ctc) : placements.map(p => p.compensation.ctc_value_lpa));
  const rolls = ranking(candidates.map(c => c.roll));
  const uniqueStudents = rolls.length;
  const techKeywords = ['software', 'developer', 'engineer', 'sde', 'data', 'tech', 'it ', 'analyst', 'programmer', 'full stack', 'cloud', 'devops', 'ai', 'machine learning', 'ml '];
  return {
    batch, candidates, companies, branches, timeline,
    roles: ranking(candidates.map(c => c.role).filter(Boolean)),
    types: ranking(companies.map(c => c.type)),
    branchRanking: ranking(candidates.map(c => c.branch)),
    months: ranking(sorted.map(p => p.result.declared_date.slice(0, 7))).sort((a, b) => a.label.localeCompare(b.label)),
    histogram: histogram(values),
    summary: {
      announcements: placements.length, selections: candidates.length,
      reportedHires: placements.reduce((n, p) => n + p.hiring.students_hired, 0),
      uniqueStudents, multiSelectedStudents: rolls.filter(r => r.value > 1).length,
      companies: companies.length, highestCtc: max(values), avgCtc: average(values), medianCtc: median(values), ctcCoverage: values.length,
      reportedCounter: max(known(placements.map(p => p.hiring.placement_count))),
      placementRate: batch.registeredStudents ? uniqueStudents / batch.registeredStudents * 100 : null,
      notConfirmedPlaced: batch.registeredStudents !== null ? Math.max(0, batch.registeredStudents - uniqueStudents) : null,
      firstDate: sorted.length ? sorted[0].result.declared_date : null, latestDate: sorted.at(-1)?.result.declared_date ?? null,
      multiBranchCompanies: companies.filter(c => c.branches.length > 1).length,
      techCompanies: companies.filter(c => c.roles.some(r => techKeywords.some(k => (' ' + r.toLowerCase() + ' ').includes(k)))).length,
    },
  };
}
export type Statistics = ReturnType<typeof buildStatistics>;
export type Company = Statistics['companies'][number];
export type Candidate = Statistics['candidates'][number];
export type Branch = Statistics['branches'][number];
export interface DashboardResponse { metadata: Dataset['metadata']; statistics: Statistics; }

/** Rank employers once, retaining separate source announcements and selections. */
export function highestCtcCompanies(companies: Company[], limit = 8) {
  return [...companies].filter(c => c.highestCtc !== null)
    .sort((a,b) => b.highestCtc! - a.highestCtc! || a.name.localeCompare(b.name)).slice(0,limit);
}
