import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCompanySchema, initialProcedureDraft, procedureDraftSchema, submissionSchema } from '../../shared/procedures';
import { parseRoute } from '../../src/app/routing';

test('starter can save as a draft but cannot be submitted without firsthand content', () => {
  const draft = initialProcedureDraft();
  assert.equal(procedureDraftSchema.safeParse(draft).success, true);
  assert.equal(submissionSchema.safeParse({ ...draft, companyKey: 'barclays' }).success, false);
  assert.equal(submissionSchema.safeParse({ ...draft, companyKey: 'barclays', body: '<!-- ' + 'private '.repeat(50) + '-->\n## Rounds I appeared for' }).success, false);
  assert.equal(submissionSchema.safeParse({ ...draft, companyKey: 'barclays', body: 'I attended an online aptitude test followed by a technical interview about arrays and SQL joins.' }).success, true);
});
test('metadata validation rejects forged fields, oversized content and invalid outcome/year', () => {
  const draft = initialProcedureDraft();
  for (const patch of [{ roleClaim: 'admin' }, { body: 'x'.repeat(20001) }, { outcome: 'Verified selected' }, { appearanceYear: 1999 }, { appearanceYear: 9999 }, { graduationYear: 9999 }]) assert.equal(procedureDraftSchema.safeParse({ ...draft, ...patch }).success, false);
});
test('editor query parameters preserve the route and admin deep links', () => {
  assert.deepEqual(parseRoute('#procedures/contribute?draft=123'), { page: 'procedures', parameter: 'contribute', year: 2026 });
  assert.deepEqual(parseRoute('#admin/procedures'), { page: 'admin', parameter: 'procedures', year: 2026 });
});

test('recruitment route preserves legacy drafts and validates campus tags', () => {
  const draft = initialProcedureDraft();
  assert.equal(procedureDraftSchema.parse(draft).campus, undefined);
  for (const campus of ['On campus', 'Off campus'] as const) {
    assert.equal(procedureDraftSchema.parse({ ...draft, campus }).campus, campus);
    assert.equal(submissionSchema.parse({ ...draft, campus, companyKey: 'barclays', body: 'I attended a coding assessment followed by technical interviews covering SQL and project architecture.' }).campus, campus);
  }
  assert.equal(procedureDraftSchema.safeParse({ ...draft, campus: 'Verified campus' }).success, false);
});

test('new company names are bounded plain text and 2027 graduates can contribute', () => {
  assert.equal(createCompanySchema.safeParse({name:'New Labs'}).success,true);
  for(const name of ['','<script>','a'.repeat(101),'Bad\u0000name']) assert.equal(createCompanySchema.safeParse({name}).success,false);
  assert.equal(createCompanySchema.safeParse({name:'New Labs',years:[2027]}).success,false);
  assert.equal(submissionSchema.safeParse({...initialProcedureDraft(),companyKey:'new-labs',graduationYear:2027,body:'I attended the technical interview and explained how I solved arrays and SQL questions, then discussed my project and the choices behind its design.'}).success,true);
});
