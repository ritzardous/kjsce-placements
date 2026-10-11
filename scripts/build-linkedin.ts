import { readFileSync,writeFileSync } from 'node:fs';
import { buildLinkedInProfiles } from '../shared/linkedin';
import { datasetSchema } from '../shared/dataset';
const dataset=datasetSchema.parse(JSON.parse(readFileSync('data/placements-2026.json','utf8')));
const people=dataset.placements.flatMap(p=>p.candidates.map(c=>({name:c.name,roll:c.roll_number,companyKey:p.company.normalized_name,company:p.company.name})));
const result=buildLinkedInProfiles(readFileSync('2026linkedin.md','utf8'),people);
writeFileSync('src/candidate-linkedin-2026.json',JSON.stringify(result.profiles,null,2)+'\n');
writeFileSync('2026linkedin-matching.md',`# 2026 LinkedIn matching\n\n${Object.keys(result.profiles).length} candidates have matched profiles from ${result.links} supplied links. Repeated links are deduplicated. Profiles are matched by roll number and shown across that candidate’s 2026 selections. Other batches remain separate.\n\n## Entries needing review\n\nAdd the correct candidate roll number next to each URL in \`2026linkedin.md\`, then run \`npm run data:linkedin\`. The production build also runs this step. Unclear profiles are not displayed.\n\n`+(result.unmatched.length?result.unmatched.map(row=>`- **${row.company}** — ${row.url} — ${row.reason}`).join('\n'):'All entries matched.')+'\n');
console.log(`LinkedIn: ${Object.keys(result.profiles).length} candidate profiles; ${result.unmatched.length} entries need review.`);
