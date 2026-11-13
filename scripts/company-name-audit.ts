import { canonicalCompanyKey } from '../shared/company-identity.js';

export type CatalogCompany = { key:string; name:string; years:number[]; aliasOf?:string };
function normalized(name:string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function stem(name:string) {
  return normalized(name).replace(/(?:private\s*limited|pvt\s*ltd|privatelimited|pvtltd)$/,'').replace(/\b(private|pvt|limited|ltd|llp|incorporated|inc|corporation|corp)\b/g,'').replace(/\s+/g,' ').trim();
}
function similarity(a:string,b:string) {
  let previous=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const next=[i];
    for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+Number(a[i-1]!==b[j-1]));
    previous=next;
  }
  return 1-previous[b.length]/Math.max(a.length,b.length,1);
}
/** Read-only review candidates, never evidence sufficient for an identity merge. */
export function auditCompanyNames(rows:CatalogCompany[]) {
  const pairs:{companies:CatalogCompany[];reason:string;score:number;alreadyLinked:boolean}[]=[];
  const sorted=[...rows].sort((a,b)=>a.key.localeCompare(b.key));
  for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++){
    const a=sorted[i],b=sorted[j],x=stem(a.name),y=stem(b.name);
    const sameKey=canonicalCompanyKey(a.key)===canonicalCompanyKey(b.key);
    const linked=Boolean(a.aliasOf===b.key||b.aliasOf===a.key||a.aliasOf&&a.aliasOf===b.aliasOf);
    const compactX=x.replaceAll(' ',''),compactY=y.replaceAll(' ','');
    const score=similarity(compactX,compactY);
    const prefix=(Math.min(compactX.length,compactY.length)>=5&&(compactX.startsWith(compactY)||compactY.startsWith(compactX)))||(Math.min(x.length,y.length)>=3&&(x.startsWith(y+' ')||y.startsWith(x+' ')));
    const acronym=(value:string)=>value.split(' ').map(word=>word[0]).join('');
    const programme=(acronym(y).length>=3&&x.startsWith(acronym(y)+' '))||(acronym(x).length>=3&&y.startsWith(acronym(x)+' '));
    const tokensX=new Set(x.split(' ')),tokensY=new Set(y.split(' '));
    const common=[...tokensX].filter(token=>token.length>2&&tokensY.has(token));
    const shared=common.length>=2&&common.length/Math.min(tokensX.size,tokensY.size)>=.66;
    let reason='';
    if(sameKey)reason='Same reviewed canonical identity';
    else if(linked)reason='Existing catalog alias';
    else if(normalized(a.name)===normalized(b.name))reason='Same normalized display name';
    else if(compactX&&compactX===compactY)reason='Same name after punctuation/legal-suffix normalization';
    else if(Math.min(compactX.length,compactY.length)>=5&&score>=.82)reason='Close spelling';
    else if(prefix||shared||programme)reason='Shared name or parent/programme variant; may be distinct';
    if(reason)pairs.push({companies:[a,b],reason,score:Number(score.toFixed(3)),alreadyLinked:linked});
  }
  return pairs;
}
