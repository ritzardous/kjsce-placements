import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Firestore} from 'firebase-admin/firestore';
import {publishedCompanyMetadata,invalidateCompanyDiscovery} from '../functions/src/company-discovery';
import {community} from '../functions/src/community';
type Directory={rows:{count:number;companyKey:string}[];more:boolean};
const actor={uid:'reader',token:{email_verified:true,firebase:{sign_in_provider:'google.com'}}};
function store(rows:Record<string,unknown>[]){
 let reads=0;let fail=false;
 const query={where:(field:string,_operator:string,value:boolean)=>{assert.equal(field,'published');assert.equal(value,true);return query;},select:(...fields:string[])=>{assert.ok(!fields.includes('body'));assert.ok(!fields.includes('authorUid'));return query;},get:async()=>{reads++;if(fail){fail=false;throw new Error('temporary failure');}return {docs:rows.map(data=>({data:()=>data}))};}};
 return {db:{collection:(path:string)=>{assert.equal(path,'procedurePosts');return query;}} as unknown as Firestore,reads:()=>reads,fail:()=>{fail=true;}};
}
test('company counts span article pages and filters preserve exact counts without private data',async()=>{
 const posts=Array.from({length:14},(_,index)=>({companyKey:'barclays',companyName:'Barclays',title:'Coding interview',appearanceYear:index<10?2026:2025,rounds:['Coding'],publishedAt:index,score:0}));
 const source=store([...posts,{companyKey:'jpmc',companyName:'JPMC',title:'Finance interview',appearanceYear:2026,publishedAt:1,score:20}]);
 const all=await community(source.db,actor,{action:'companyBrowse',payload:{}}) as Directory;
 assert.equal(all.rows[0].count,14);assert.equal(all.rows.length,2);assert.equal(all.more,false);assert.ok(!('body' in all.rows[0]));
 const filtered=await community(source.db,actor,{action:'companyBrowse',payload:{search:'barclays',year:'2026',round:'Coding'}}) as Directory;
 assert.equal(filtered.rows.length,1);assert.equal(filtered.rows[0].count,10);
 const helpful=await community(source.db,actor,{action:'companyBrowse',payload:{sort:'helpful'}}) as Directory;
 assert.equal(helpful.rows[0].companyKey,'jpmc');assert.equal(source.reads(),1);
});
test('company discovery coalesces reads, invalidates after mutations and recovers failed reads',async()=>{
 const source=store([]);
 await Promise.all([publishedCompanyMetadata(source.db),publishedCompanyMetadata(source.db)]);assert.equal(source.reads(),1);
 invalidateCompanyDiscovery(source.db);await publishedCompanyMetadata(source.db);assert.equal(source.reads(),2);
 invalidateCompanyDiscovery(source.db);source.fail();await assert.rejects(publishedCompanyMetadata(source.db));
 await publishedCompanyMetadata(source.db);assert.equal(source.reads(),4);
});
