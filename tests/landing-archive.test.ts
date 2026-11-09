import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  archiveCompanies,
  companyYears,
  companyRoute,
} from "../src/landing/archive-data";
import { visibleYears } from "../src/routing";
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

import { recordPreviews } from "../src/landing/archive-data";
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
          preview.roleInference,
          "Missing source roles must retain their inference metadata",
        );
        assert.ok(preview.roleInference?.url.startsWith("https://"));
        assert.ok(
          preview.roleInference?.note.includes("not verif") ||
            preview.roleInference?.note.includes("does not verify"),
        );
      }
      assert.equal(source.compensation.ctc_text, preview.ctc);
      assert.ok(existsSync("public" + preview.logo));
    }
  }
});
test("2025 preview lists the three highest reported company CTCs in descending order", () => {
  const dataset = JSON.parse(readFileSync("data/placements-2025.json", "utf8"));
  const ordered = [...dataset.placements]
    .filter((row) => typeof row.compensation?.ctc_value_lpa === "number")
    .sort(
      (a, b) => b.compensation.ctc_value_lpa - a.compensation.ctc_value_lpa,
    );
  const best = new Map<string, string>();
  for (const row of ordered)
    if (!best.has(row.company.normalized_name))
      best.set(row.company.normalized_name, row.placement_id);
  assert.deepEqual(
    recordPreviews[2025].map((row) => row.placementId),
    [...best.values()].slice(0, 3),
  );
});
