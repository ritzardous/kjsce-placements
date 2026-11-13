import '../styles/experience-invite.css';
import { useAuth } from '../lib/auth';
import { useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import { experienceInviteUrl } from './experience-invitation';
export function InviteWriter({company}:{company:{key:string;name:string}}) {
  const {admin}=useAuth();
  const [message,setMessage]=useState(''),[fallback,setFallback]=useState('');
  async function share() {
    if(!admin)return;
    const url=experienceInviteUrl(location.href,company);
    try {
      if(navigator.share) {await navigator.share({title:'Share your '+company.name+' experience',text:'Would you share your interview experience? The company is already selected—just sign in and write.',url});setMessage('');}
      else {await navigator.clipboard.writeText(url);setMessage('Invitation link copied');}
      setFallback('');
    } catch(error) {
      if((error as Error).name==='AbortError')return;
      setFallback(url);setMessage('Copy this invitation link');
    }
  }
  if(!admin)return null;
  return <div className="experience-invite"><button type="button" className="text-button" onClick={()=>void share()}><AppIcon name="share"/>Invite an alum</button>{message&&<span role="status">{message}</span>}{fallback&&<input aria-label="Experience invitation link" readOnly value={fallback} onFocus={event=>event.target.select()}/>}</div>;
}
