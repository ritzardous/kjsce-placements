export function normalizeSearch(value: unknown): string {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu,' ').trim().replace(/\s+/g,' ');
}
function oneTypo(a:string,b:string) {
  if(Math.abs(a.length-b.length)>1)return false;
  if(a.length===b.length){const mismatches:number[]=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])mismatches.push(i);return mismatches.length<=1 || mismatches.length===2 && mismatches[1]===mismatches[0]+1 && a[mismatches[0]]===b[mismatches[1]] && a[mismatches[1]]===b[mismatches[0]];}
  const shorter=a.length<b.length?a:b,longer=a.length<b.length?b:a;
  let i=0,j=0,skips=0;
  while(i<shorter.length&&j<longer.length){if(shorter[i]===longer[j]){i++;j++;}else{if(++skips>1)return false;j++;}}
  return true;
}
/** All query words must match. Short terms and roll numbers remain exact. */
export function matchesSearch(value:unknown,query:unknown):boolean {
  const search=normalizeSearch(query);
  if(!search)return true;
  const text=normalizeSearch(value),words=text.split(' '),compact=text.replaceAll(' ','');
  return search.split(' ').every(term=>text.includes(term) || term.length>=4 && !/\d/.test(term) && (compact.includes(term) || words.some(word=>oneTypo(term,word))));
}
