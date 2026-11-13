import {test} from 'node:test';
import assert from 'node:assert/strict';
import {experienceInvitation,experienceInviteHref,experienceInviteUrl} from '../../src/procedures/experience-invitation';
import {initialProcedureDraft,submissionSchema} from '../../shared/procedures';
test('company invitations preserve a canonical company through URLs and ignore draft links',()=>{
 const href=experienceInviteHref({key:'jp_morgan_chase_co',name:'JPMorgan Chase & Co.'});
 assert.deepEqual(experienceInvitation(href),{key:'jpmc',name:'JPMorgan Chase & Co.'});
 const url=experienceInviteUrl('https://example.test/#procedures/contribute?draft=private-id',{key:'barclays',name:'Barclays'});
 assert.equal(new URL(url).origin,'https://example.test');assert.ok(!url.includes('private-id'));
 assert.equal(experienceInvitation('#procedures/contribute?draft=private-id&company=barclays'),null);
 assert.equal(experienceInvitation('#procedures/contribute?company=../../users'),null);
 assert.equal(experienceInvitation('#procedures/company?company=barclays'),null);
});
test('an invited writer supplies route, graduation batch and role without guessing interview year or outcome',()=>{
 const draft={...initialProcedureDraft(),companyKey:'barclays',campus:'On campus' as const,graduationYear:2026,role:'Software Engineer',body:'My interview covered array problems and database joins. I discussed my projects and explained the trade-offs behind each solution.'};
 assert.equal(submissionSchema.safeParse(draft).success,true);
 assert.equal(draft.appearanceYear,null);assert.equal(draft.outcome,'Not specified');assert.equal(draft.coverage,'Not specified');
 for(const patch of [{body:''},{campus:undefined},{graduationYear:null},{role:''}])assert.equal(submissionSchema.safeParse({...draft,...patch}).success,false);
 assert.equal(submissionSchema.safeParse({...draft,appearanceYear:2025,coverage:'Full',outcome:'Selected'}).success,true);
});
