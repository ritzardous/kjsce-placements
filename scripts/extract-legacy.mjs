import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync('legacy/index.html', 'utf8');
const start = html.indexOf('const RAW_DATA = ') + 'const RAW_DATA = '.length;
const end = html.indexOf(';\n', start) !== -1 ? html.indexOf(';\n', start) : html.indexOf(';\r\n', start);
if (start < 'const RAW_DATA = '.length || end === -1) throw new Error('Legacy data not found');
const data = JSON.parse(html.slice(start, end));
mkdirSync('data', { recursive: true });
mkdirSync('docs', { recursive: true });
mkdirSync('src/styles', { recursive: true });
writeFileSync('data/placements-2026.json', JSON.stringify(data, null, 2) + '\n');
writeFileSync('src/styles/styles.css', html.match(/<style>([\s\S]*?)<\/style>/)[1]);
const candidates = data.placements.flatMap(p => p.candidates);
writeFileSync('docs/legacy-baseline.json', JSON.stringify({
  sourceSHA256: createHash('sha256').update(html).digest('hex'),
  announcements: data.placements.length,
  selections: candidates.length,
  reportedHires: data.placements.reduce((n, p) => n + p.hiring.students_hired, 0),
  uniqueStudents: new Set(candidates.map(c => c.roll_number)).size,
  companies: new Set(data.placements.map(p => p.company.normalized_name)).size,
  branches: [...new Set(candidates.map(c => c.branch))].sort(),
  missingCTC: data.placements.filter(p => p.compensation.ctc_value_lpa == null).length,
  latestReportedCounter: Math.max(...data.placements.map(p => p.hiring.placement_count ?? 0)),
}, null, 2) + '\n');
console.log('Extracted legacy dataset and CSS without executing the HTML.');
