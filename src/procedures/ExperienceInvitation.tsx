import { GoogleButton, useAuth } from '../lib/auth';
import { ThemeControl } from '../ui/ThemeControl';
import { useEffect } from 'react';
import '../styles/experience-invitation.css';
export function ExperienceInvitation({company}:{company:{key:string;name:string}}) {
  const {error}=useAuth();
  useEffect(()=>{document.title='Share your '+company.name+' experience · Placement Stats';},[company.name]);
  return <div className="experience-invitation-page"><header><a href="#landing">Placement Stats</a><ThemeControl/></header><main><p className="invite-kicker">A LITTLE CONTEXT GOES A LONG WAY</p><h1>Share your<br/><em>{company.name}</em> experience.</h1><p>Tell the next batch what the process was like. A few paragraphs about your rounds, questions or preparation can help someone find their footing.</p><GoogleButton/>{error&&<p role={/cancel/i.test(error)?'status':'alert'}>{error}</p>}<p className="invite-small">Your company will be selected for you. Writing saves privately as you go; you decide when to submit it for review.</p><a className="invite-about" href="#about/privacy">About this project &amp; your privacy</a></main></div>;
}
