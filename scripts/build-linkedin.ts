import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { buildLinkedInProfiles } from '../shared/linkedin';
import { datasetSchema } from '../shared/dataset';
mkdirSync('artifacts',{recursive:true});
for(const year of [2025,2026] as const){
 const dataset=datasetSchema.parse(JSON.parse(readFileSync(`data/placements-${year}.json`,'utf8')));
 const people=dataset.placements.flatMap(p=>p.candidates.map(c=>({name:c.name,roll:c.roll_number,companyKey:p.company.normalized_name,company:p.company.name})));
 const result=buildLinkedInProfiles(readFileSync(`data/sources-linkedin/${year}linkedin.md`,'utf8'),people);
 writeFileSync(`src/data/candidate-linkedin-${year}.json`,JSON.stringify(result.profiles,null,2)+'\n');
 writeFileSync(`artifacts/${year}linkedin-matching.md`,`# ${year} LinkedIn matching\n\n${Object.keys(result.profiles).length} candidates have matched profiles from ${result.links} supplied links. Repeated links are deduplicated. Profiles are matched by roll number and shown across that candidate’s ${year} selections. Other batches remain separate.\n\n## Entries needing review\n\nAdd the correct candidate roll number next to each URL in \`data/sources-linkedin/${year}linkedin.md\`, then run \`npm run data:linkedin\`. The production build also runs this step. Unclear profiles are not displayed.\n\n`+(result.unmatched.length?result.unmatched.map(row=>`- **${row.company}** - ${row.url} - ${row.reason}`).join('\n'):'All entries matched.')+'\n');
 console.log(`LinkedIn ${year}: ${Object.keys(result.profiles).length} candidate profiles; ${result.unmatched.length} entries need review.`);
}
