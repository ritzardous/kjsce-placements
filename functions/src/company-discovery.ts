import type { Firestore, DocumentData } from 'firebase-admin/firestore';

// Share a small metadata projection across readers and filter edits. Article
// bodies and private submissions are never fetched for the company directory.
const cache = new WeakMap<Firestore, {at:number;request:Promise<DocumentData[]>}>();
export function invalidateCompanyDiscovery(db:Firestore) { cache.delete(db); }
export function publishedCompanyMetadata(db:Firestore) {
  const found=cache.get(db);
  if(found&&Date.now()-found.at<45000)return found.request;
  const request=db.collection('procedurePosts').where('published','==',true)
    .select('companyKey','companyName','appearanceYear','title','role','summary','coverage','outcome','rounds','publishedAt','score')
    .get().then(snapshot=>snapshot.docs.map(doc=>doc.data()));
  const entry={at:Date.now(),request};cache.set(db,entry);
  void request.catch(()=>{if(cache.get(db)===entry)cache.delete(db);});
  return request;
}
