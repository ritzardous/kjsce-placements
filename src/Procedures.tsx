import { PortalShell } from './Portal';
import { useAuth } from './auth';
import { ProcedureBrowse, PostDetail, SavedExperiences, CompareExperiences } from './ProcedureCommunity';
import { ProcedureEditor } from './ProcedureEditor';
import { ProcedureNotifications } from './Contributions';
import './procedures.css';
export { Markdown } from './ProcedureMarkdown';
export { AdminProcedures } from './ProcedureAdmin';
export default function Procedures({parameter,draftId}:{parameter?:string;draftId?:string}) {
  const {admin}=useAuth(),params=new URLSearchParams(location.hash.split('?')[1]),companyKey=params.get('company')||undefined;
  const content=parameter==='contribute'?<ProcedureEditor key={draftId||params.get('new')||'new'} draftId={draftId} freshKey={params.get('new')||undefined}/>:parameter==='company'?<ProcedureBrowse key={companyKey} companyKey={companyKey}/>:parameter==='saved'?<SavedExperiences/>:parameter==='compare'?<CompareExperiences ids={(params.get('ids')||'').split(',').filter(Boolean)}/>:parameter==='notifications'?<ProcedureNotifications/>:parameter?<PostDetail key={parameter} id={parameter}/>:<ProcedureBrowse/>;
  return <PortalShell active="procedures"><section className="portal-welcome"><span className="eyebrow">THE COMMUNITY ARCHIVE</span><h1>Company Procedures</h1><p>Firsthand recruitment experiences. Find the rounds that matter, share your experience and prepare together.</p></section><nav className="procedure-tabs" aria-label="Company procedures views"><a href="#procedures" aria-current={!parameter?'page':undefined}>Browse</a><a href="#procedures/contribute" aria-current={parameter==='contribute'?'page':undefined}>Contribute</a><a href="#procedures/saved" aria-current={parameter==='saved'?'page':undefined}>Saved for prep</a><a href="#procedures/notifications" aria-current={parameter==='notifications'?'page':undefined}>Notifications</a><a href="#account">My contributions</a>{admin&&<a href="#admin/procedures">Admin review</a>}</nav>{content}</PortalShell>;
}
