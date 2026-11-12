import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  archiveCompanies,
  heroCompanies,
  companyYears,
  companyRoute,
} from "../../src/landing/archive-data";
import { visibleYears } from "../../src/app/routing";
test("public landing company examples resolve to real records in open batches", () => {
  for (const company of archiveCompanies) {
    assert.ok(existsSync("public" + company.logo));
    for (const year of companyYears(company)) {
      assert.ok(visibleYears.some((value) => value === year));
      const dataset = JSON.parse(
        readFileSync(`data/placements-${year}.json`, "utf8"),
      );
      const key = decodeURIComponent(
        companyRoute(company, year).split("/").at(-1)!,
      );
      assert.ok(
        dataset.placements.some(
          (row: { company: { normalized_name: string } }) =>
            row.company.normalized_name === key,
        ),
        `${company.name} must exist in ${year}`,
      );
    }
  }
});

import { recordPreviews } from "../../src/landing/archive-data";
test("public previews preserve source CTC and distinguish estimates for missing roles", () => {
  for (const [year, records] of Object.entries(recordPreviews)) {
    const dataset = JSON.parse(
      readFileSync(`data/placements-${year}.json`, "utf8"),
    );
    for (const preview of records) {
      const source = dataset.placements.find(
        (row: { placement_id: string }) =>
          row.placement_id === preview.placementId,
      );
      assert.ok(source);
      assert.equal(source.company.normalized_name, preview.key);
      if (source.roles.length) assert.ok(source.roles.includes(preview.role));
      else {
        assert.ok(
          preview.role === "Role not provided" || preview.roleInference,
          "Missing source roles must retain their inference metadata",
        );
        if (preview.roleInference) assert.ok(preview.roleInference.url.startsWith("https://"));
        assert.ok(
          preview.role === "Role not provided" || preview.roleInference?.note.includes("not verif") ||
            preview.roleInference?.note.includes("does not verify"),
        );
      }
      assert.equal(source.compensation.ctc_text, preview.ctc);
      assert.ok(existsSync("public" + preview.logo));
    }
  }
});
test("landing previews use the requested on-campus company sets and original packages", () => {
  assert.deepEqual(recordPreviews[2025].map(p=>p.key), ['browserstack','jpmc','eventstrat-labsprivatelimited']);
  assert.deepEqual(recordPreviews[2026].map(p=>p.key), ['jp_morgan_chase_co','ion_group','edra_labs_llp']);
  const data=JSON.parse(readFileSync('data/placements-2025.json','utf8'));
  for (const p of recordPreviews[2025]) assert.equal(data.placements.find((r: {placement_id:string; campus?:string})=>r.placement_id===p.placementId).campus,'On campus');
});

test('hero keeps JPMC and four distinct on-campus brands outside the package preview', () => {
  assert.deepEqual(heroCompanies.map(c=>c.id), ['jpmc','barclays','deloitte','oracle','capgemini']);
  const previewKeys = new Set(Object.values(recordPreviews).flat().map(p=>p.key));
  const d=JSON.parse(readFileSync('data/placements-2025.json','utf8'));
  for (const c of heroCompanies) {
    assert.ok(existsSync('public'+c.logo));
    assert.ok(d.placements.some((p: {company:{normalized_name:string}; campus?:string})=>p.company.normalized_name===c.routes[2025] && p.campus==='On campus'));
    if(c.id!=='jpmc') for(const key of Object.values(c.routes)) assert.ok(!previewKeys.has(key));
  }
});
