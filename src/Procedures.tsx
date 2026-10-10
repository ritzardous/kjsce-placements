import { useEffect } from 'react';
import { PortalShell } from './Portal';
import { useAuth } from './auth';
import { ProcedureBrowse, PostDetail, SavedExperiences, CompareExperiences } from './ProcedureCommunity';
import { ProcedureEditor } from './ProcedureEditor';
import { Contributions, ProcedureNotifications, NotificationLink } from './Contributions';
import { BackToExperiences } from './ProcedureUX';
import './procedures.css';
export { Markdown } from './ProcedureMarkdown';
export { AdminProcedures } from './ProcedureAdmin';
export default function Procedures({parameter,draftId}:{parameter?:string;draftId?:string}) {
  const {admin}=useAuth(),params=new URLSearchParams(location.hash.split('?')[1]),companyKey=params.get('company')||undefined;
  const titles:Record<string,string>={contribute:draftId?'Your experience':'Share an experience',saved:'Saved for prep',contributions:'My contributions',notifications:'Notifications',compare:'Compare experiences',company:'Company experiences'};
  const detail=Boolean(parameter&&!titles[parameter]),title=parameter?titles[parameter]||'Recruitment experience':'Company Procedures';
  useEffect(()=>{document.title=`${title} · Placement Stats KJSCE`;document.getElementById('portal-main')?.focus({preventScroll:true});},[title]);
  const content=parameter==='contribute'?<ProcedureEditor key={draftId||params.get('new')||'new'} draftId={draftId} freshKey={params.get('new')||undefined}/>:parameter==='company'?<ProcedureBrowse key={companyKey} companyKey={companyKey}/>:parameter==='saved'?<SavedExperiences/>:parameter==='compare'?<CompareExperiences ids={(params.get('ids')||'').split(',').filter(Boolean)}/>:parameter==='notifications'?<ProcedureNotifications/>:parameter==='contributions'?<Contributions standalone/>:parameter?<PostDetail key={parameter} id={parameter}/>:<ProcedureBrowse/>;
  return <PortalShell active="procedures"><nav className="procedure-tabs" aria-label="Company procedures views"><a href="#procedures" aria-current={!parameter||parameter==='company'||detail?'page':undefined}>Explore</a><a href="#procedures/saved" aria-current={parameter==='saved'?'page':undefined}>Saved for prep</a><a href="#procedures/contributions" aria-current={parameter==='contributions'?'page':undefined}>My contributions</a></nav><div className="procedure-actions" aria-label="Community actions">{parameter!=='contribute'&&parameter!=='contributions'&&<a className="portal-link" href="#procedures/contribute">Share an experience ↗</a>}<NotificationLink/>{admin&&<a href="#admin/procedures">Admin review</a>}</div>{!parameter?<section className="portal-welcome"><span className="eyebrow">THE COMMUNITY ARCHIVE</span><h1>Company Procedures</h1><p>Find firsthand recruitment experiences by company, year and role.</p></section>:!detail&&<header className="portal-welcome"><nav className="procedure-actions" aria-label="Breadcrumb"><BackToExperiences>Company Procedures</BackToExperiences><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav><h1 id="procedure-page-title">{title}</h1></header>}{content}</PortalShell>;
}
