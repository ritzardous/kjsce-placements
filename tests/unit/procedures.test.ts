import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialProcedureDraft, procedureDraftSchema, submissionSchema } from '../../shared/procedures';
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
