import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planReviewedAliases, reviewedAliasPairs, type CatalogFields } from '../../scripts/reviewed-company-aliases.js';
test('reviewed catalog plan touches exactly ten identities and only alias metadata on legacy documents',()=>{
  const rows=new Map<string,CatalogFields>(reviewedAliasPairs.flatMap(([key,alias])=>[[key,{name:key,years:[2026]}],[alias,{name:alias,years:[2025,2026]}]]));
  const before=JSON.stringify([...rows]),plan=planReviewedAliases(rows);
  assert.equal(plan.length,10);
  for(const [key,alias] of reviewedAliasPairs){assert.deepEqual(plan.find(row=>row.key===key)!.fields.years,[2025,2026]);assert.deepEqual(plan.find(row=>row.key===alias)!.fields,{aliasOf:key});}
  assert.equal(JSON.stringify([...rows]),before);
  rows.get('aptia-india')!.aliasOf='different-company';assert.throws(()=>planReviewedAliases(rows),/conflicting alias/);
});
