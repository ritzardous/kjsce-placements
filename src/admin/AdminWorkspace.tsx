import {useEffect} from 'react';
import {AdminLayout} from './AdminLayout';
import {AdminProcedures} from '../procedures/ProcedureAdmin';
import {AdminUsers} from './AdminUsers';
import {AdminData} from './AdminData';
import {AdminAnalytics} from './AdminAnalytics';
import {AdminOperations} from './AdminOperations';
import {useAdminQuery,QueryState,adminDate,type AdminOverview} from './admin-api';
import {JobList} from './AdminJobs';
function Overview(){const state=useAdminQuery<AdminOverview>('overview'),data=state.data;return <section><div className="procedure-heading"><h2>Needs attention</h2><button type="button" onClick={state.refresh}>Refresh overview</button></div><QueryState state={state}>{data&&<><ul className="admin-priorities"><li><a href="#admin/procedures"><strong>{data.pending} submissions awaiting review</strong><span>Oldest pending: {adminDate(data.oldestAt)}</span></a></li><li><a href="#admin/procedures?view=discussion"><strong>{data.reports} open reports</strong><span>Review reported content and privacy concerns</span></a></li><li><a href="#admin/operations"><strong>{data.jobs.filter(job=>['failed','invalid','queued','running','uploading'].includes(job.state)).length} unfinished jobs in latest 12</strong><span>Continue uploads, resume work or review failures</span></a></li></ul>{data.lastError&&<p role="status">An admin request error was recorded at {adminDate(data.lastError.createdAt)}. <a href="#admin/operations">Review operations</a></p>}<section><h2>Publication freshness</h2><ul className="admin-record-list">{data.batches.map(batch=><li key={batch.year}><a href="#admin/data"><strong>Batch {batch.year}</strong><span>{batch.activeVersion?`Published ${adminDate(batch.publishedAt)}`:'No active publication'}</span></a></li>)}</ul></section><details><summary>Recent administrative jobs</summary>{data.jobs.length?<JobList jobs={data.jobs}/>:<p>No administrative jobs yet.</p>}</details><p className="procedure-note">Checked {adminDate(data.checkedAt)}. Counts come from application records; infrastructure and notification health require separate telemetry.</p></>}</QueryState></section>;}
export default function AdminWorkspace({section}:{section?:string}) {
 const params=new URLSearchParams(location.hash.split('?')[1]),jobId=params.get('job')||undefined,auditId=params.get('audit')||undefined;
 useEffect(()=>{document.title=`${section||'Administration'} · Placement Stats KJSCE`;},[section]);
 if(section==='procedures')return <AdminProcedures/>;
 const label=section==='users'?'Users':section==='data'?'Data':section==='analytics'?'Analytics':section==='operations'?'Operations':'Overview';
 return <AdminLayout active={label}>{!section?<Overview/>:section==='users'?<AdminUsers/>:section==='data'?<AdminData jobId={jobId}/>:section==='analytics'?<AdminAnalytics/>:section==='operations'?<AdminOperations jobId={jobId} auditId={auditId}/>:<p>Admin page not found. <a href="#admin">Open administration</a></p>}</AdminLayout>;
}
