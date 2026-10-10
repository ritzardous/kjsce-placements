import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browseDefaults, browseFilters, browseHref, safeBrowseReturn } from '../src/procedure-navigation';
import { submissionSchema, initialProcedureDraft } from '../shared/procedures';

test('shareable filters round-trip, override saved state and retain a company hub',()=>{
  const filters={...browseDefaults,company:'barclays',search:'SQL & arrays',round:'Coding',year:'2026',sort:'helpful'};
  assert.deepEqual(browseFilters(browseHref(filters),{search:'old'}),filters);
  assert.deepEqual(browseFilters('#procedures',{search:'remembered'}),{...browseDefaults,search:'remembered'});
  assert.equal(browseFilters('#procedures?company=other',{},'barclays').company,'barclays');
  assert.match(browseHref(filters,'barclays'),/^#procedures\/company\?/);
  assert.deepEqual(browseFilters('#procedures?search=SQL',{round:'HR'}),{...browseDefaults,search:'SQL'});
});
test('malformed filter links are normalized and return links cannot escape the browsing routes',()=>{
  assert.deepEqual(browseFilters('#procedures?year=no&sort=invalid&coverage=bad&round=bad'),browseDefaults);
  assert.equal(safeBrowseReturn('https://example.test'),'#procedures');
  assert.equal(safeBrowseReturn('#procedures/contribute'),'#procedures');
  assert.equal(safeBrowseReturn('#procedures/company?company=barclays'),'#procedures/company?company=barclays');
  assert.equal(browseFilters('#procedures?search='+ 'x'.repeat(200)).search.length,120);
});
test('submission validation identifies the actual fields without changing the minimum content rule',()=>{
  const result=submissionSchema.safeParse(initialProcedureDraft());
  assert.equal(result.success,false);
  if(!result.success)assert.deepEqual(result.error.issues.map(issue=>issue.path[0]),['companyKey','body']);
});
