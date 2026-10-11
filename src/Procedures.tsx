import { useEffect } from 'react';
import { PortalShell } from './Portal';
import { ProcedureBrowse, PostDetail, SavedExperiences } from './ProcedureCommunity';
import { ProcedureEditor } from './ProcedureEditor';
import { Contributions, ProcedureNotifications } from './Contributions';
import { BackToExperiences } from './ProcedureUX';
import { ProcedureNavigation } from './ProcedureNavigation';
import './procedures.css';
export { Markdown } from './ProcedureMarkdown';
export { AdminProcedures } from './ProcedureAdmin';
export default function Procedures({parameter,draftId}:{parameter?:string;draftId?:string}) {
  const params=new URLSearchParams(location.hash.split('?')[1]),companyKey=params.get('company')||undefined;
  const titles:Record<string,string>={contribute:draftId?'Your experience':'Share an experience',saved:'Saved for prep',contributions:'My contributions',notifications:'Notifications',company:'Company experiences'};
  const detail=Boolean(parameter&&parameter!=='compare'&&!titles[parameter]),title=parameter?titles[parameter]||'Recruitment experience':'Company Procedures';
  useEffect(()=>{document.title=`${title} · Placement Stats KJSCE`;document.getElementById('portal-main')?.focus({preventScroll:true});},[title]);
  const content=parameter==='contribute'?<ProcedureEditor key={draftId||params.get('new')||'new'} draftId={draftId} freshKey={params.get('new')||undefined}/>:parameter==='company'?<ProcedureBrowse key={companyKey} companyKey={companyKey}/>:parameter==='saved'?<SavedExperiences/>:parameter==='compare'?<ProcedureBrowse/>:parameter==='notifications'?<ProcedureNotifications/>:parameter==='contributions'?<Contributions standalone/>:parameter?<PostDetail key={parameter} id={parameter}/>:<ProcedureBrowse/>;
  return <PortalShell active="procedures"><div className="procedure-ui">
    {(!parameter||parameter==='compare') ? <header className="portal-welcome procedure-intro"><span className="eyebrow">INTERVIEW EXPERIENCES</span><h1>Company Procedures</h1><p>Find firsthand recruitment experiences by company, year and role.</p></header> : !detail&&parameter!=='company'&&<div className="procedure-section-name"><BackToExperiences>Company Procedures</BackToExperiences></div>}
    {!detail&&<ProcedureNavigation view={parameter}/>}
    {!detail && parameter && parameter!=='compare' && parameter!=='company' && <header className="procedure-context"><h1 id="procedure-page-title">{title}</h1></header>}
    {content}
  </div></PortalShell>;
}
