import {notify} from './AppUtilities';
import { useBackgroundSync } from './background-sync';
import { AppIcon } from './AppIcon';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { community, usePaged, invalidatePages, safeStored, storeSession, type Notification } from './community-api';
import { PageState } from './CommunityPageState';
import { procedureError } from './procedures-api';
import { statusLabels, type ProcedureSubmission } from '../shared/procedures';
import { ConfirmAction } from './ProcedureUX';

export function NotificationLink() {
  const { user } = useAuth(), [count, setCount] = useState<number|null>(null),generation=useRef(0);
  const refresh = async () => {
    const token = generation.current;
    try { const value = await community<{unread:number}>('notificationSummary'); if (token === generation.current) setCount(value.unread); return true; }
    catch { return false; }
  };
  useBackgroundSync(refresh, 60000, Boolean(user));
  useEffect(() => { generation.current++; void refresh(); return () => { generation.current++; }; }, [user?.uid]);
  return <a href="#procedures/notifications" aria-current={location.hash.split('?')[0]==='#procedures/notifications'?'page':undefined} title="Notifications update automatically"><AppIcon name="bell"/>Notifications{count?` (${count})`:''}</a>;
}

type Event = {id:string;action:string;revision:number;feedback:string;createdAt:number};
function SubmissionTimeline({ id }: {id:string}) {
  const [events,setEvents]=useState<Event[]|null>(null),[error,setError]=useState('');
  return <details onToggle={event=>{if(event.currentTarget.open&&!events)void community<Event[]>('timeline',{submissionId:id}).then(setEvents).catch(cause=>setError(procedureError(cause)));}}><summary>Submission timeline</summary>{error&&<p role="alert">{error}</p>}{!events&&!error&&<p>Loading review history…</p>}{events?.map(event=><p key={event.id}>{new Date(event.createdAt).toLocaleString('en-GB')} · {statusLabels[event.action as keyof typeof statusLabels]||event.action.replaceAll('_',' ')} · Revision {event.revision}{event.feedback&&`. ${event.feedback}`}</p>)}{events?.length===50&&<p>Latest 50 events shown.</p>}</details>;
}
export function ProcedureNotifications() {
  const [unread,setUnread]=useState(false),state=usePaged<Notification & {href?:string}>('notifications',{unread}),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function mark(ids:string[]){setBusy(true);setError('');try{await community('readNotifications',{ids});ids.forEach(id=>{if(unread)state.remove(id);else state.update(id,{read:true});});setMessage(`${ids.length} notification${ids.length===1?'':'s'} marked as read.`);window.dispatchEvent(new Event('procedure-notifications-changed'));}catch(cause){setError(procedureError(cause));}finally{setBusy(false);}}
  const unreadRows=state.rows.filter(row=>!row.read),visibleUnread=unreadRows.slice(0,50);
  return <section><div className="procedure-heading"><p>Review decisions and updates, all in one place.</p><span className="sync-indicator"><span aria-hidden="true"/>Automatic updates</span></div><div className="procedure-actions"><button aria-pressed={!unread} onClick={()=>setUnread(false)}>All notifications</button><button aria-pressed={unread} onClick={()=>setUnread(true)}>Unread notifications</button><button disabled={busy||!visibleUnread.length} onClick={()=>void mark(visibleUnread.map(row=>row.id))}>{unreadRows.length>50?'Mark first 50 unread notifications as read':'Mark displayed notifications as read'}</button></div>{message&&<p className="procedure-success" role="status">{message}</p>}{error&&<p role="alert">{error}</p>}{!state.loading&&!state.rows.length&&!state.error&&<p>{state.more?'Checking older notifications as you scroll.':unread?'You are caught up. View all notifications to revisit earlier updates.':'No notifications yet. Review decisions and updates appear here.'}</p>}<div className="procedure-list">{state.rows.map(row=><article className="procedure-card" key={row.id}><h3>{row.title} {!row.read&&<span className="procedure-badge status-pending">New</span>}</h3><p>{row.message}</p><time dateTime={new Date(row.createdAt).toISOString()}>{new Date(row.createdAt).toLocaleString('en-GB')}</time><div className="procedure-actions"><a href={row.href||`#procedures/contribute?draft=${row.submissionId}`}>Open related item ↗</a>{!row.read&&<button disabled={busy} onClick={()=>void mark([row.id])}>Mark as read</button>}</div></article>)}</div><PageState state={state}/></section>;
}
function DeviceDrafts() {
  const {user}=useAuth(),[refresh,setRefresh]=useState(0),[error,setError]=useState('');
  const drafts:{key:string;title:string;href:string;time:number}[]=[];
  try{const prefix=`procedure-backup:${user?.uid}:`;for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(prefix))continue;try{const value=JSON.parse(localStorage.getItem(key)||'null');if(!value?.draft?.body)continue;const suffix=key.slice(prefix.length);drafts.push({key,title:value.draft.title||value.draft.companyKey||'Unsynced writing',href:suffix==='new'?'#procedures/contribute':suffix.startsWith('new:')?`#procedures/contribute?new=${suffix.slice(4)}`:`#procedures/contribute?draft=${suffix}`,time:value.updatedAt||0});}catch{/* Ignore malformed recovery records. */}}}catch{/* Storage may be disabled. */}
  if(!drafts.length)return null;
  return <section key={refresh} className="procedure-card device-drafts"><h3>Writing saved on this device</h3><p>These copies have not fully synced to your account. Recover them in this browser before switching devices.</p>{error&&<p role="alert">{error}</p>}{drafts.sort((a,b)=>b.time-a.time).map(row=><div className="procedure-actions" key={row.key}><a href={row.href}>{row.title} · Recover writing ↗</a><ConfirmAction label="Discard device copy" title="Discard this device copy?" description="This deletes the recovery copy in this browser. Your account draft is kept, but unsynced writing in this copy cannot be recovered." confirmLabel="Discard copy" onConfirm={()=>{try{localStorage.removeItem(row.key);sessionStorage.removeItem(row.key);setError('');setRefresh(value=>value+1);}catch{setError('Could not remove this device copy. Check browser storage permissions and try again.');}}}/></div>)}</section>;
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
  const [managing,setManaging]=useState<string|null>(null),[message,setMessage]=useState(''),[deviceRevision,setDeviceRevision]=useState(0),[managementError,setManagementError]=useState(''),managementNotice=useRef<HTMLParagraphElement>(null);
  async function manage(row:ProcedureSubmission,action:'withdraw'|'hide'|'delete'){
    setManaging(row.id);setManagementError('');setMessage('');
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
    }catch(cause){setManagementError(procedureError(cause));}finally{setManaging(null);}
  }
  return <section onClickCapture={event=>{if((event.target as HTMLElement).closest('a'))state.rememberScroll();}} className="account-contributions procedure-ui" aria-labelledby={standalone?'procedure-page-title':'contributions-title'}><div className="procedure-heading">{!standalone&&<h2 id="contributions-title">My Contributions</h2>}{!standalone&&<a className="portal-link" href="#procedures/contribute">Share an experience ↗</a>}</div>{impact&&<details><summary>Contribution impact</summary><div className="procedure-metrics"><p><strong>{impact.total}</strong> contributions</p><p><strong>{impact.drafts}</strong> drafts</p><p><strong>{impact.pending}</strong> awaiting approval</p><p><strong>{impact.published}</strong> published</p><p><strong>{impact.helpful}</strong> helpful votes</p></div></details>}{error&&<p role="alert">{error} <button onClick={()=>{setError('');setAttempt(value=>value+1);}}>Retry impact</button></p>}<DeviceDrafts key={deviceRevision}/>{managementError&&<p role="alert">{managementError} <button onClick={()=>{setManagementError('');void state.refresh();}}>Refresh contributions</button></p>}{message&&<p ref={managementNotice} tabIndex={-1} className="procedure-feedback" role="status">{message}</p>}<p className="procedure-note">Manage your drafts, submissions and published experiences.</p><div className="procedure-actions contribution-view-buttons" aria-label="Contribution views">{[['','All contributions'],['attention','Needs your attention'],['draft','Drafts'],['pending','In review'],['published','Published']].map(([value,label])=><button key={value} aria-pressed={status===value} onClick={()=>setStatus(value)}><AppIcon name={value==='attention'?'bell':value==='draft'?'pen':value==='pending'?'clock':value==='published'?'check':'list'}/>{label}</button>)}</div>{status==='attention'&&<p className="procedure-note">Review feedback and update your submissions.</p>}<div className="procedure-actions"><label>Contribution status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option value="attention">Needs your attention</option><option value="published">Published experiences</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><a href="#procedures/notifications"><AppIcon name="bell"/>Review notifications</a></div>{!state.loading&&!state.error&&!state.rows.length&&<p>{state.more?'Older contributions load automatically as you scroll.':'Your drafts, review status and feedback will appear here.'}</p>}<div className="procedure-list">{state.rows.map(row=><article className="procedure-card" key={row.id}><div className="procedure-heading"><h3>{row.draft.title||row.companyName||row.draft.companyKey||'New experience'}</h3><span className={`procedure-badge status-${row.status}`}>{statusLabels[row.status]}</span></div><p>{row.draft.appearanceYear} · {row.draft.coverage} procedure · {row.draft.outcome}</p>{row.feedback&&<p className="procedure-feedback"><strong>Admin feedback:</strong> {row.feedback}</p>}<div className="procedure-actions contribution-content-actions"><a className="contribution-primary-action" href={`#procedures/contribute?draft=${row.id}`}><AppIcon name={row.status==='pending'?'clock':'pen'}/>{row.status==='pending'?'View submission':row.status==='changes_requested'||row.status==='rejected'?'Revise experience':row.hasPublished?'Update this experience':'Continue writing'}</a>{row.hasPublished&&<a href={`#procedures/${row.id}`}><AppIcon name="eye"/>Read approved version</a>}</div><div className="contribution-management" aria-label="Manage experience">{row.status==='pending'&&<ConfirmAction label="Withdraw from review" tone="warning" title="Withdraw this submission?" description="Your writing is kept as an editable draft. Any previously approved version stays public." confirmLabel="Withdraw submission" disabled={managing!==null} onConfirm={()=>void manage(row,'withdraw')}/>} {row.hasPublished&&<ConfirmAction label="Unpublish experience" tone="warning" icon="eye" title="Take this experience offline?" description="Readers will no longer see it. Any pending revision is also withdrawn. Your draft stays in your account for editing and resubmission." confirmLabel="Unpublish" disabled={managing!==null} onConfirm={()=>void manage(row,'hide')}/>}<ConfirmAction label="Delete experience" icon="trash" title="Permanently delete this experience?" description="This removes your draft, submitted revisions, and any public version, including related activity. This cannot be undone." confirmLabel="Delete permanently" disabled={managing!==null} onConfirm={()=>void manage(row,'delete')}/>{managing===row.id&&<span role="status">Updating your content…</span>}</div><SubmissionTimeline id={row.id}/></article>)}</div><PageState state={state}/></section>;
}
