import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {archiveCompanies,companyYears,companyRoute} from '../src/landing/archive-data';
import {visibleYears} from '../src/routing';
test('public landing company examples resolve to real records in open batches',()=>{
 for(const company of archiveCompanies){assert.ok(existsSync('public'+company.logo));for(const year of companyYears(company)){assert.ok(visibleYears.some(value=>value===year));const dataset=JSON.parse(readFileSync(`data/placements-${year}.json`,'utf8'));const key=decodeURIComponent(companyRoute(company,year).split('/').at(-1)!);assert.ok(dataset.placements.some((row:{company:{normalized_name:string}})=>row.company.normalized_name===key),`${company.name} must exist in ${year}`);}}
});
