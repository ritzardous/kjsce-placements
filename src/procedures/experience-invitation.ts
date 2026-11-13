import { canonicalCompanyKey } from '../../shared/company-identity';
export function experienceInvitation(hash:string) {
  if(hash.split('?')[0]!=='#procedures/contribute')return null;
  const params=new URLSearchParams(hash.split('?')[1]);
  if(params.has('draft'))return null;
  const key=canonicalCompanyKey(params.get('company')||'');
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(key))return null;
  const name=(params.get('name')||'').trim().slice(0,100)||key.replaceAll('-',' ');
  return {key,name};
}
export function experienceInviteHref(company:{key:string;name:string}) {
  return '#procedures/contribute?'+new URLSearchParams({company:canonicalCompanyKey(company.key),name:company.name}).toString();
}
export function experienceInviteUrl(base:string,company:{key:string;name:string}) {
  const url=new URL(base);url.search='';url.hash=experienceInviteHref(company);return url.href;
}
