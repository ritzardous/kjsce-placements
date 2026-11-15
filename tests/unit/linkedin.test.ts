import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLinkedInProfiles as build } from '../../shared/linkedin';
import profiles from '../../src/data/candidate-linkedin-2026.json';
import profiles2025 from '../../src/data/candidate-linkedin-2025.json';
const people=[{name:'Jane Middle Doe',roll:'123',companyKey:'barclays',company:'Barclays'},{name:'John Doe',roll:'456',companyKey:'ey',company:'EY'}];
test('profile matching is company scoped, deduplicated and removes tracking parameters',()=>{
 const result=build('Barclays\nhttps://www.linkedin.com/in/jane-doe-12345/?originalSubdomain=in\nhttps://www.linkedin.com/in/jane-doe-12345/',people);
 assert.deepEqual(result.profiles,{'123':'https://www.linkedin.com/in/jane-doe-12345/'});
 assert.equal(result.unmatched.length,0);
 assert.equal(Object.keys(build('EY\nhttps://www.linkedin.com/in/jane-doe/',people).profiles).length,0);
});
test('unclear names need explicit roll numbers; unsafe domains and conflicting profiles never become links',()=>{
 assert.equal(build('Barclays\nhttps://www.linkedin.com/in/jane11/',people).unmatched.length,1);
 assert.deepEqual(build('Barclays\n123 https://www.linkedin.com/in/jane11/',people).profiles,{'123':'https://www.linkedin.com/in/jane11/'});
 assert.equal(Object.keys(build('Barclays\n123 https://www.linkedin.com.evil.test/in/jane11/',people).profiles).length,0);
 assert.equal(Object.keys(build('Barclays\n123 https://www.linkedin.com/in/jane/\n123 https://www.linkedin.com/in/other/\n123 https://www.linkedin.com/in/jane/',people).profiles).length,0);
});
test('duplicate candidate names are not assigned a guessed profile',()=>{
 const duplicates=[...people,{...people[0],roll:'789'}];
 assert.equal(Object.keys(build('Barclays\nhttps://www.linkedin.com/in/jane-doe/',duplicates).profiles).length,0);
 assert.deepEqual(build('Barclays\n123 https://www.linkedin.com/in/jane-doe/',duplicates).profiles,{'123':'https://www.linkedin.com/in/jane-doe/'});
});
test('real 2026 profiles use roll identities and valid LinkedIn profile destinations',()=>{
 assert.equal(profiles['16014022147'],'https://www.linkedin.com/in/prithviraj-sawant-boby/');
 assert.equal(profiles['16010122179'],'https://www.linkedin.com/in/amaan-shaikh-37938724a/');
 assert.equal(profiles['16010123806'],'https://www.linkedin.com/in/aditya-laisetti31/');
 assert.equal(profiles['16014022082'],'https://www.linkedin.com/in/chirag-solanki98/');
 assert.equal(profiles['16010122213'],'https://www.linkedin.com/in/vatsalya-tiwari-0aa91b22b/');
 for(const [roll,url] of Object.entries(profiles)){
  assert.match(roll,/^\d{11}$/);
  assert.match(url,/^https:\/\/www\.linkedin\.com\/in\/[^/?]+\/$/);
 }
});
test('real 2025 profiles use roll identities and valid LinkedIn profile destinations',()=>{
 assert.equal(profiles2025['16010121065'],'https://www.linkedin.com/in/riya-hemani-66453b149/');
 assert.equal(profiles2025['16010121070'],'https://www.linkedin.com/in/deveshj/');
 assert.equal(profiles2025['16010421081'],'https://www.linkedin.com/in/taniyaaz/');
 for(const [roll,url] of Object.entries(profiles2025)){
  assert.match(roll,/^\d{11}$/);
  assert.match(url,/^https:\/\/www\.linkedin\.com\/in\/[^/?]+\/$/);
 }
});
