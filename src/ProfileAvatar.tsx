import { useState } from 'react';
import type { User } from 'firebase/auth';

export function ProfileAvatar({user}:{user:User|null}) {
  const source=user?.photoURL || user?.providerData.find(provider=>provider.providerId==='google.com')?.photoURL;
  const [failed,setFailed]=useState<string>();
  const initials=(user?.displayName || 'You').split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase();
  return <span className="profile-avatar" aria-hidden="true">{source && source!==failed
    ? <img src={source} alt="" width="76" height="76" referrerPolicy="no-referrer" onError={()=>setFailed(source)}/>
    : initials}</span>;
}
