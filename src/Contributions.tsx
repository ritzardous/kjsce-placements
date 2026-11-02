import { ActionMenu } from './ActionMenu';
import { OperationStatus } from './OperationStatus';
import { canonicalCompanyName } from '../shared/company-identity';
import { useBackgroundSync } from './background-sync';
import {notify} from './AppUtilities';
export { NotificationInbox as ProcedureNotifications } from './NotificationInbox';
import { AppIcon } from './AppIcon';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { community, usePaged, invalidatePages, safeStored, storeSession } from './community-api';
import { PageState } from './CommunityPageState';
import { procedureError } from './procedures-api';
import { statusLabels, type ProcedureSubmission } from '../shared/procedures';
import { ConfirmAction } from './ProcedureUX';

type Event = {id:string;action:string;revision:number;feedback:string;createdAt:number};
export function SubmissionTimeline({ id }: {id:string}) {
  const [events,setEvents]=useState<Event[]|null>(null),[error,setError]=useState('');
  return <details open={new URLSearchParams(location.hash.split('?')[1]).get('history')==='1'} onToggle={event=>{if(event.currentTarget.open&&!events)void community<Event[]>('timeline',{submissionId:id}).then(setEvents).catch(cause=>setError(procedureError(cause)));}}><summary>Submission timeline</summary>{error&&<p role="alert">{error}</p>}{!events&&!error&&<p>Loading review history…</p>}{events?.map(event=><p key={event.id}>{new Date(event.createdAt).toLocaleString('en-GB')} · {statusLabels[event.action as keyof typeof statusLabels]||event.action.replaceAll('_',' ')} · Revision {event.revision}{event.feedback&&`. ${event.feedback}`}</p>)}{events?.length===50&&<p>Latest 50 events shown.</p>}</details>;
}
function DeviceDrafts() {
  const {user}=useAuth(),[refresh,setRefresh]=useState(0),[error,setError]=useState('');
  const drafts:{key:string;title:string;href:string;time:number}[]=[];
  try{const prefix=`procedure-backup:${user?.uid}:`;for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(prefix))continue;try{const value=JSON.parse(localStorage.getItem(key)||'null');if(!value?.draft?.body)continue;const suffix=key.slice(prefix.length);drafts.push({key,title:value.draft.title||value.draft.companyKey||'Unsynced writing',href:suffix==='new'?'#procedures/contribute':suffix.startsWith('new:')?`#procedures/contribute?new=${suffix.slice(4)}`:`#procedures/contribute?draft=${suffix}`,time:value.updatedAt||0});}catch{/* Ignore malformed recovery records. */}}}catch{/* Storage may be disabled. */}
  if(!drafts.length)return null;
  return <details key={refresh} className="device-drafts"><summary>Review recovered drafts on this device</summary><p>These copies have not fully synced to your account. Recover them in this browser before switching devices.</p>{error&&<p role="alert">{error}</p>}{drafts.sort((a,b)=>b.time-a.time).map(row=><div className="procedure-actions" key={row.key}><a href={row.href}>{row.title} · Recover writing ↗</a><ConfirmAction label="Discard device copy" title="Discard this device copy?" description="This deletes the recovery copy in this browser. Your account draft is kept, but unsynced writing in this copy cannot be recovered." confirmLabel="Discard copy" onConfirm={()=>{try{localStorage.removeItem(row.key);sessionStorage.removeItem(row.key);setError('');setRefresh(value=>value+1);}catch{setError('Could not remove this device copy. Check browser storage permissions and try again.');}}}/></div>)}</details>;
}
export function Contributions({standalone=false}:{standalone?:boolean}={}) {
  const {user}=useAuth(),statusKey=`procedure-contributions-view:${user?.uid}`;
  const [status,setStatus]=useState(()=>{const value=new URLSearchParams(location.hash.split('?')[1]).get('status')||safeStored(statusKey,'');return ['','attention','published',...Object.keys(statusLabels)].includes(value)?value:'';}),state=usePaged<ProcedureSubmission>('contributions',{status},true);
  useEffect(()=>{storeSession(statusKey,status);if(location.hash.split('?')[0]==='#procedures/contributions')window.history.replaceState(null,'',`#procedures/contributions${status?`?status=${encodeURIComponent(status)}`:''}`);},[statusKey,status]);
  useEffect(()=>{const restore=()=>{if(location.hash.split('?')[0]!=='#procedures/contributions')return;const value=new URLSearchParams(location.hash.split('?')[1]).get('status')||'';setStatus(['','attention','published',...Object.keys(statusLabels)].includes(value)?value:'');};window.addEventListener('hashchange',restore);return()=>window.removeEventListener('hashchange',restore);},[]);
  const [impact,setImpact]=useState<{total:number;drafts:number;pending:number;published:number;helpful:number;unanswered:number}|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const impactGeneration = useRef(0);
  async function refreshImpact() {
    const token = impactGeneration.current;
    try { const result = await community<typeof impact>('impact'); if (token === impactGeneration.current) { setImpact(result); setError(''); } return true; }
    catch (cause) { if (token === impactGeneration.current) setError(procedureError(cause)); return false; }
  }
  useBackgroundSync(refreshImpact, 120000);
  useEffect(() => { impactGeneration.current++; void refreshImpact(); return () => { impactGeneration.current++; }; }, [attempt,user?.uid]);
  const [managing,setManaging]=useState<Set<string>>(new Set()),[message,setMessage]=useState(''),[deviceRevision,setDeviceRevision]=useState(0),[managementError,setManagementError]=useState(''),managementNotice=useRef<HTMLParagraphElement>(null);
  async function manage(row:ProcedureSubmission,action:'withdraw'|'hide'|'delete'){
    if(managing.has(row.id))return;setManaging(previous=>new Set(previous).add(row.id));setManagementError('');setMessage('');
    try{
      await community('manageSubmission',{id:row.id,expectedVersion:row.draftVersion,action});
      invalidatePages('contributions');invalidatePages('browse');invalidatePages('saved');
      if(action==='delete'){
        state.remove(row.id);
        const key=`procedure-backup:${user?.uid}:${row.id}`;
        try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{/* Cloud content is deleted even if device storage is unavailable. */}
        setDeviceRevision(value=>value+1);
      }else await state.refresh();
      notify(action==='delete'?'Experience deleted.':action==='withdraw'?'Submission withdrawn. Your draft is kept.':'Experience unpublished. Your draft is kept.');setAttempt(value=>value+1);setMessage(action==='delete'?'Experience deleted, including its drafts and public version.':action==='withdraw'?'Submission withdrawn. You can edit the draft and submit it again.':'Experience unpublished. Your draft is kept for editing.');
      window.dispatchEvent(new Event('procedure-notifications-changed'));
      requestAnimationFrame(()=>managementNotice.current?.focus({preventScroll:true}));
    }catch(cause){setManagementError(procedureError(cause));}finally{setManaging(previous=>{const next=new Set(previous);next.delete(row.id);return next;});}
  }
  return <section onClickCapture={event=>{if((event.target as HTMLElement).closest('a'))state.rememberScroll();}} className="account-contributions procedure-ui" aria-labelledby={standalone?'procedure-page-title':'contributions-title'}>{!standalone&&<div className="procedure-heading"><h2 id="contributions-title">My contributions</h2><a className="portal-link" href="#procedures/contribute">Share an experience ↗</a></div>}{error&&<p role="alert">{error} <button onClick={()=>{setError('');setAttempt(value=>value+1);}}>Retry impact</button></p>}<DeviceDrafts key={deviceRevision}/>{managementError&&<p role="alert">{managementError} <button onClick={()=>{setManagementError('');void state.refresh();}}>Refresh contributions</button></p>}{message&&<p ref={managementNotice} tabIndex={-1} className="procedure-feedback" role="status">{message}</p>}<div className="workspace-toolbar"><label>Contribution status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All contributions</option><option value="attention">Needs your attention</option><option value="draft">Drafts</option><option value="pending">In review</option><option value="published">Published experiences</option><option value="changes_requested">Changes requested</option><option value="rejected">Rejected</option></select></label><span className="workspace-result-count">{state.rows.length}{state.more?'+':''} experiences</span></div>{!state.loading&&!state.error&&!state.rows.length&&<p>{state.more?'Older contributions load automatically as you scroll.':'Your drafts, review status and feedback will appear here.'}</p>}<div className="procedure-list">{state.rows.map(row=><article className="procedure-card" aria-busy={managing.has(row.id)} key={row.id}><div className="procedure-heading"><h3>{row.draft.title||canonicalCompanyName(row.draft.companyKey,row.companyName||row.draft.companyKey)||'New experience'}</h3><span className={`procedure-badge status-${row.status}`}>{statusLabels[row.status]}</span></div><p>{row.draft.appearanceYear} · {row.draft.coverage} procedure · {row.draft.outcome}</p>{row.feedback&&<p className="procedure-feedback"><strong>Admin feedback:</strong> {row.feedback}</p>}<div className="procedure-actions contribution-content-actions"><a className="contribution-row-action" href={row.hasPublished&&row.status==='approved'?`#procedures/${row.id}`:`#procedures/contribute?draft=${row.id}`}><AppIcon name={row.status==='pending'?'clock':row.hasPublished&&row.status==='approved'?'eye':'pen'}/>{row.status==='pending'?'View submission':row.status==='changes_requested'||row.status==='rejected'?'Revise experience':row.hasPublished&&row.status==='approved'?'Read experience':row.hasPublished?'Update experience':'Continue writing'}</a></div><ActionMenu label={`More actions for ${row.draft.title||row.companyName||'experience'}`}><div className="contribution-management" aria-label="Manage experience">{row.hasPublished&&<>{row.status!=='approved'&&<a href={`#procedures/${row.id}`}>Read approved version</a>}<a href={`#procedures/contribute?draft=${row.id}`}>Update experience</a></>}{row.status==='pending'&&<ConfirmAction label="Withdraw from review" tone="warning" title="Withdraw this submission?" description="Your writing is kept as an editable draft. Any previously approved version stays public." confirmLabel="Withdraw submission" disabled={managing.has(row.id)} onConfirm={()=>void manage(row,'withdraw')}/>} {row.hasPublished&&<ConfirmAction label="Unpublish experience" tone="warning" icon="eye" title="Take this experience offline?" description="Readers will no longer see it. Any pending revision is also withdrawn. Your draft stays in your account for editing and resubmission." confirmLabel="Unpublish" disabled={managing.has(row.id)} onConfirm={()=>void manage(row,'hide')}/>}<ConfirmAction label="Delete experience" icon="trash" title="Permanently delete this experience?" description="This removes your draft, submitted revisions, and any public version, including related activity. This cannot be undone." confirmLabel="Delete permanently" disabled={managing.has(row.id)} onConfirm={()=>void manage(row,'delete')}/></div><a href={`#procedures/contribute?draft=${row.id}&history=1`}>View history</a></ActionMenu>{managing.has(row.id)&&<OperationStatus label="Updating your experience…"/>}</article>)}</div><PageState state={state}/>{impact&&<details><summary>Contribution impact</summary><div className="procedure-metrics"><p><strong>{impact.total}</strong> contributions</p><p><strong>{impact.drafts}</strong> drafts</p><p><strong>{impact.pending}</strong> awaiting approval</p><p><strong>{impact.published}</strong> published</p><p><strong>{impact.helpful}</strong> helpful votes</p></div></details>}</section>;
}
