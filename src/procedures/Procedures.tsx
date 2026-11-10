import { useEffect } from 'react';
import { PortalShell } from '../app/Portal';
import { ProcedureBrowse, PostDetail, SavedExperiences } from './ProcedureCommunity';
import { ProcedureEditor } from './ProcedureEditor';
import { Contributions, ProcedureNotifications } from '../community/Contributions';
import { useWorkspaceFocus } from './ProcedureUX';
import { ProcedureNavigation } from './ProcedureNavigation';
import '../styles/procedures.css';
import '../styles/editor-studio.css';
export { Markdown } from './ProcedureMarkdown';
export { AdminProcedures } from './ProcedureAdmin';
export default function Procedures({parameter,draftId}:{parameter?:string;draftId?:string}) {
  useWorkspaceFocus();
  const params=new URLSearchParams(location.hash.split('?')[1]),companyKey=params.get('company')||undefined;
  const preferences = parameter === 'notifications' && params.get('preferences') === '1';
  const titles:Record<string,string>={contribute:draftId?'Your experience':'Share an experience',saved:'Saved for prep',contributions:'My contributions',notifications:preferences?'Notification preferences':'Notifications',company:'Company experiences'};
  const detail=Boolean(parameter&&parameter!=='compare'&&!titles[parameter]),title=parameter?titles[parameter]||'Recruitment experience':'Company Procedures';
  useEffect(()=>{document.title=`${title} · Placement Stats KJSCE`;document.getElementById('portal-main')?.focus({preventScroll:true});},[title]);
  const content=parameter==='contribute'?<ProcedureEditor key={draftId||params.get('new')||'new'} draftId={draftId} freshKey={params.get('new')||undefined}/>:parameter==='company'?<ProcedureBrowse key={companyKey} companyKey={companyKey}/>:parameter==='saved'?<SavedExperiences/>:parameter==='compare'?<ProcedureBrowse/>:parameter==='notifications'?<ProcedureNotifications/>:parameter==='contributions'?<Contributions standalone/>:parameter?<PostDetail key={parameter} id={parameter}/>:<ProcedureBrowse/>;
  return <PortalShell active="procedures"><div className="procedure-ui">
    <nav className="workspace-breadcrumb" aria-label="Breadcrumb"><a href="#home">Home</a><span aria-hidden="true">/</span>{parameter?<a href="#procedures">Company Procedures</a>:<span aria-current="page">Company Procedures</span>}{parameter&&<><span aria-hidden="true">/</span><span aria-current="page">{title}</span></>}</nav>
    {!detail&&<header className="workspace-page-header"><div><h1 id="procedure-page-title">{title}</h1><p>{preferences?'Choose what reaches your inbox.':parameter==='contributions'?'Manage your writing and review feedback.':parameter==='contribute'?'Your experience and review progress, all in one place.':!parameter?'Firsthand recruitment experiences, organised by company.':''}</p></div>{(!parameter||parameter==='contributions'||parameter==='compare')&&<a className="action-button" href="#procedures/contribute">Share an experience</a>}</header>}
    {!detail&&!preferences&&<ProcedureNavigation view={parameter}/>}
    {content}
  </div></PortalShell>;
}
