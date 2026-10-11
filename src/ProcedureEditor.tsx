import { useBackgroundSync } from './background-sync';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebase } from './firebase';
import { FetchLoader } from './FetchLoader';
import { AppIcon } from './AppIcon';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { procedureDraftSchema, initialProcedureDraft, procedureStarter, oneRoundStarter, meaningfulBody, roundOptions, submissionSchema, type ProcedureDraft, type ProcedureSubmission } from '../shared/procedures';
import { getSubmission, saveProcedure, callProcedure, procedureError } from './procedures-api';
import { community } from './community-api';
import { useCompanies } from './ProcedureCommunity';
import { Markdown } from './ProcedureMarkdown';
import { ProcedureCompanyPicker } from './ProcedureCompanyPicker';
import { ConfirmAction } from './ProcedureUX';
import { ProcedureCompanyPreview } from './ProcedureCompanyPreview';
import { toggleWritingFormat, isWritingFormatActive, type WritingFormat } from './procedure-formatting';
const writingTools: {label:string;format:WritingFormat;shortcut?:string}[] = [
  {label:'Bold',format:'bold',shortcut:'B'}, {label:'Italic',format:'italic',shortcut:'I'},
  {label:'Heading',format:'heading'}, {label:'List',format:'list'}, {label:'Code',format:'code'},
  {label:'Quote',format:'quote'}, {label:'Link',format:'link',shortcut:'K'},
];

type Backup = { id: string; version: number; draft: ProcedureDraft; updatedAt: number };
function readBackup(key: string, draftId?: string): Backup | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null');
    const parsed = procedureDraftSchema.safeParse(value?.draft || value);
    return parsed.success ? { id: draftId || value.id || crypto.randomUUID(), version: value.version || 0, draft: parsed.data, updatedAt: value.updatedAt || Date.now() } : null;
  } catch { return null; }
}
export function ProcedureEditor({ draftId, freshKey }: {draftId?:string;freshKey?:string}) {
  const {user}=useAuth(), {companies,error:companyError,loading:companiesLoading}=useCompanies();
  const newKey=freshKey?`new:${freshKey}`:'new';
  const [persistedId,setPersistedId]=useState(draftId), [backup]=useState(()=>readBackup(`procedure-backup:${user?.uid}:${draftId||newKey}`,draftId));
  const backupKey=`procedure-backup:${user?.uid}:${persistedId||newKey}`, storageKey=useRef(backupKey); storageKey.current=backupKey;
  const [draft,setDraft]=useState<ProcedureDraft>(()=>backup?.draft || {...initialProcedureDraft(),body:''}),[status,setStatus]=useState<ProcedureSubmission['status']>('draft'),[feedback,setFeedback]=useState(''),[ready,setReady]=useState(!draftId),[preview,setPreview]=useState(false),[saved,setSaved]=useState(backup?'Recovered writing from this device.':'Start writing; your draft saves automatically.'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[remote,setRemote]=useState<ProcedureDraft|null>(null),[deviceSaved,setDeviceSaved]=useState(false),[issues,setIssues]=useState<Partial<Record<keyof ProcedureDraft,string>>>({});
  const id=useRef(draftId||backup?.id||crypto.randomUUID()),version=useRef(backup?.version||0),latest=useRef(draft),savedBody=useRef(JSON.stringify({...initialProcedureDraft(),body:''})),queue=useRef<Promise<unknown>>(Promise.resolve()),pending=useRef(false),alive=useRef(true),textarea=useRef<HTMLTextAreaElement>(null),touched=useRef(Boolean(backup)), submitting=useRef(false);
  const [readAttempt,setReadAttempt]=useState(0),[leaving,setLeaving]=useState(false);
  useBackgroundSync(async () => { setReadAttempt(value=>value+1); }, 120000, Boolean(!ready&&error));
  const [selection,setSelection]=useState({start:0,end:0});
  const formattedSelection=useRef<{start:number;end:number}|null>(null);
  useLayoutEffect(()=>{const range=formattedSelection.current,element=textarea.current;if(!range||!element)return;formattedSelection.current=null;element.focus({preventScroll:true});element.setSelectionRange(range.start,range.end);},[draft.body,selection]);
  function trackSelection(){const element=textarea.current;if(element)setSelection({start:element.selectionStart,end:element.selectionEnd});}
  latest.current=draft;
  function deviceCopy(value:ProcedureDraft, key=storageKey.current) {
    try { localStorage.setItem(key,JSON.stringify({id:id.current,version:version.current,draft:value,updatedAt:Date.now()}));if(alive.current)setDeviceSaved(true);return true; } catch {if(alive.current)setDeviceSaved(false);return false;}
  }
  function clearCopy(key=storageKey.current) {try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{/* Cloud saving remains available. */}}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{if(!ready||pending.current)return;if(JSON.stringify(draft)!==savedBody.current)deviceCopy(draft);},[draft,ready,backupKey]);
  useEffect(()=>{if(draftId||backup)return;let active=true;void community<Partial<ProcedureDraft>>('preferences').then(preferences=>{if(active&&!touched.current)setDraft(previous=>({...previous,graduationYear:preferences.graduationYear??null,role:preferences.role||'',attribution:preferences.attribution||'anonymous',customName:preferences.customName||''}));}).catch(()=>undefined);return()=>{active=false;};},[draftId]);
  useEffect(()=>{if(!draftId)return;let active=true;void getSubmission(draftId).then(row=>{
    if(!active)return;if(!row)throw new Error('Draft not found. Start a new contribution.');
    const parsed=procedureDraftSchema.parse(row.draft);version.current=row.draftVersion;savedBody.current=JSON.stringify(parsed);pending.current=row.status==='pending';setRemote(parsed);
    const unsynced=backup&&JSON.stringify(backup.draft)!==JSON.stringify(parsed);
    setDraft(pending.current?parsed:unsynced?backup.draft:parsed);setConflict(Boolean(unsynced&&backup.version!==row.draftVersion&&!pending.current));
    setStatus(row.status);setFeedback(row.feedback);setSaved(unsynced&&!pending.current?'Your latest writing is back. It still needs to save to your account.':'Saved to your account');setError('');setReady(true);
  }).catch(cause=>{if(active)setError(procedureError(cause));});return()=>{active=false;};},[draftId,readAttempt]);
  useEffect(() => {
    if (status !== 'pending') return;
    return onSnapshot(doc(getFirebase().db,'procedureSubmissions',id.current), snapshot => {
      if (!alive.current || snapshot.metadata.fromCache) return;
      const row = snapshot.data() as (ProcedureSubmission & {deleted?:boolean}) | undefined;
      if (!row || row.deleted) { setError('This submission was deleted in another session. Return to My contributions.'); return; }
      if (row.status === 'pending') return;
      const value = procedureDraftSchema.parse(row.draft);
      pending.current = false; version.current = row.draftVersion; savedBody.current = JSON.stringify(value);
      setDraft(value); setRemote(value); setStatus(row.status); setFeedback(row.feedback || ''); setSaved('Saved to your account');
    }, cause => { if (alive.current) setError(procedureError(cause)); });
  }, [status]);
  function enqueueSave() {
    const operation=queue.current.catch(()=>undefined).then(async()=>{
      const value=latest.current;if(pending.current||JSON.stringify(value)===savedBody.current)return;
      if(alive.current)setSaved('Saving…');
      const result=await saveProcedure(id.current,version.current,value);version.current=result.version;savedBody.current=JSON.stringify(value);setRemote(value);
      const oldKey=storageKey.current,newKey=`procedure-backup:${user?.uid}:${id.current}`;
      if(JSON.stringify(latest.current)===savedBody.current){clearCopy(oldKey);clearCopy(newKey);}else{deviceCopy(latest.current,newKey);if(oldKey!==newKey)clearCopy(oldKey);}
      if(alive.current){setSaved(JSON.stringify(latest.current)===savedBody.current?'Saved to your account':'Saved on this device; syncing changes');setError('');setStatus('draft');if(!draftId)setPersistedId(id.current);if(!draftId&&location.hash.split('?')[0]==='#procedures/contribute')window.history.replaceState(null,'',`#procedures/contribute?draft=${id.current}`);}
    });queue.current=operation;return operation;
  }
  async function failed(cause:unknown) {
    if(!alive.current)return;setSaved(deviceCopy(latest.current)?'Your writing is safe on this device. Saving to your account failed.':'Your writing could not be saved. Please copy it before leaving.');setError(procedureError(cause));
    if((cause as {code?:string}).code?.includes('failed-precondition')){
      try {const row=await getSubmission(id.current);if(!row||!alive.current)return;version.current=row.draftVersion;setRemote(procedureDraftSchema.parse(row.draft));savedBody.current=JSON.stringify(procedureDraftSchema.parse(row.draft));pending.current=row.status==='pending';setStatus(row.status);setConflict(row.status!=='pending');}catch{/* Keep the existing recovery copy. */}
    }
  }
  useEffect(()=>{if(!touched.current||!ready||pending.current||conflict||busy||JSON.stringify(draft)===savedBody.current)return;setSaved(deviceSaved?'Your writing is safe on this device. Saving to your account soon.':'Unsaved changes');const timer=setTimeout(()=>void enqueueSave().catch(failed),900);return()=>clearTimeout(timer);},[draft,ready,conflict,busy]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(JSON.stringify(latest.current)!==savedBody.current&&!pending.current){if(!deviceCopy(latest.current)){event.preventDefault();event.returnValue='';}}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
  function update<K extends keyof ProcedureDraft>(key:K,value:ProcedureDraft[K]){touched.current=true;setIssues(previous=>{const next={...previous};delete next[key];return next;});setDraft(previous=>({...previous,[key]:value}));}
  function format(action:WritingFormat){
    const element=textarea.current;
    const result=toggleWritingFormat(latest.current.body,element?.selectionStart??selection.start,element?.selectionEnd??selection.end,action);
    if(result.body.length>20000){setError('Your experience can contain up to 20,000 characters. Shorten it before adding formatting.');return;}
    formattedSelection.current={start:result.start,end:result.end};
    update('body',result.body);setSelection({start:result.start,end:result.end});
  }
  async function send(){if(submitting.current)return;setError('');const validated=submissionSchema.safeParse(latest.current);if(!validated.success){const errors:Partial<Record<keyof ProcedureDraft,string>>={};for(const issue of validated.error.issues){const field=String(issue.path[0]||'body') as keyof ProcedureDraft;if(!errors[field])errors[field]=issue.message;}setIssues(errors);if(errors.body)setPreview(false);requestAnimationFrame(()=>{const field=document.getElementById(`procedure-${Object.keys(errors)[0]}`);field?.closest('details')?.setAttribute('open','');field?.focus();});return;}setIssues({});submitting.current=true;setBusy(true);try{await enqueueSave();await callProcedure('submitProcedure',{id:id.current,expectedVersion:version.current});pending.current=true;clearCopy();clearCopy(`procedure-backup:${user?.uid}:new`);setStatus('pending');setSaved('Submitted for review');window.dispatchEvent(new Event('procedure-notifications-changed'));requestAnimationFrame(()=>document.getElementById('procedure-submitted')?.focus());}catch(cause){await failed(cause);}finally{submitting.current=false;setBusy(false);}}
  async function cancelWriting() {
    if(busy || leaving)return;
    if(!ready || pending.current){location.hash='#procedures/contributions';return;}
    setLeaving(true);
    try {
      if(conflict){if(!deviceCopy(latest.current))throw new Error('I could not keep your draft on this device. Please save your writing before leaving.');}
      else await enqueueSave();
      location.hash='#procedures/contributions';
    } catch(cause) {
      await failed(cause);
      if(deviceCopy(latest.current))location.hash='#procedures/contributions';
    } finally {if(alive.current)setLeaving(false);}
  }
  const locked=status==='pending'||busy||leaving;
  const selectedCompany=companies.find(company=>company.key===draft.companyKey);
  const canUseStarter=!draft.body.trim()||[procedureStarter,oneRoundStarter,procedureStarter.replace(/<!--[\s\S]*?-->/g,'')].some(starter=>starter.trim()===draft.body.trim());
  const names:Record<keyof ProcedureDraft,string>={companyKey:'Company',appearanceYear:'Year you appeared',body:'Your experience',title:'Experience title (optional)',summary:'Short summary (optional)',rounds:'Rounds covered',graduationYear:'Graduation year',role:'Role',attribution:'Public name',customName:'Custom public name',coverage:'Coverage',outcome:'Did you get selected?'};
  const fieldProps=(key:keyof ProcedureDraft)=>({id:`procedure-${key}`,'aria-label':names[key],'aria-invalid':Boolean(issues[key]),'aria-describedby':issues[key]?`procedure-error-${key}`:undefined});
  const fieldError=(key:keyof ProcedureDraft)=>issues[key]?<p id={`procedure-error-${key}`} className="procedure-note">{issues[key]}</p>:null;
  useEffect(()=>{const guard=(event:MouseEvent)=>{const anchor=(event.target as HTMLElement).closest?.('a[href]');if(!anchor||pending.current||JSON.stringify(latest.current)===savedBody.current)return;if(!deviceCopy(latest.current)&&!window.confirm('Your latest writing could not be saved to your account or this browser. Leave and lose these unsaved changes?')){event.preventDefault();event.stopPropagation();}};document.addEventListener('click',guard,true);return()=>document.removeEventListener('click',guard,true);},[]);
  if(!ready)return <section>{error?<p role="alert">{error}</p>:<FetchLoader label="Loading your draft…"/>}<a href="#procedures/contributions">Back to my contributions</a></section>;
  return <section className="procedure-editor-page"><div className={status==='pending'?'contribute-notice':'procedure-compose-intro'} id="procedure-submitted" tabIndex={-1}>{status==='pending'&&<strong>Pending approval</strong>}<p>{status==='pending'?'Your experience is with an admin for review. You can check My contributions for updates. Once approved, everyone can read it.':'Share one round or the whole process. A short account is enough, and your draft saves as you write.'}</p>{remote&&draftId&&<p className="procedure-note">If you have an approved experience, readers can still see it while this update is reviewed.</p>}</div>{feedback&&<p className="procedure-feedback"><strong>Admin feedback:</strong> {feedback}</p>}
    {conflict&&<div className="procedure-feedback" role="alert"><h3>This draft changed on your account.</h3><p>Your device writing is still in the editor. Choose which version to continue with before saving.</p><details><summary>Compare account version</summary><Markdown body={remote?.body||''}/></details><div className="procedure-actions"><button onClick={()=>{if(remote)setDraft(remote);clearCopy();setConflict(false);setSaved('Saved to your account');}}>Use account version</button><button onClick={()=>{deviceCopy(latest.current);setConflict(false);}}>Keep this device version</button></div></div>}
    {Object.keys(issues).length>0&&<div className="procedure-feedback" role="alert"><h3>Check these details before submitting</h3>{Object.entries(issues).map(([key,message])=><p key={key}><button className="text-button" onClick={()=>{const field=document.getElementById(`procedure-${key}`);field?.closest('details')?.setAttribute('open','');field?.focus();}}>{names[key as keyof ProcedureDraft]}: {message}</button></p>)}</div>}{companyError&&<p role="alert">{companyError}</p>}<fieldset className="procedure-editor" disabled={locked}><legend>The essentials</legend><p className="procedure-note">Choose the company, confirm your attempt details, and write what happened. Everything else is optional.</p><ProcedureCompanyPicker companies={companies} value={draft.companyKey} onChange={value=>update('companyKey',value)} loading={companiesLoading} disabled={locked} invalid={Boolean(issues.companyKey)} errorId={issues.companyKey?'procedure-error-companyKey':undefined}/>{fieldError('companyKey')}{selectedCompany&&<ProcedureCompanyPreview company={selectedCompany} appearanceYear={draft.appearanceYear}/>}
      <div className="procedure-fields"><label>Year you appeared<input {...fieldProps('appearanceYear')} aria-required="true" type="number" min="2000" max={new Date().getFullYear()+1} value={draft.appearanceYear||''} onChange={e=>update('appearanceYear',Number(e.target.value))}/>{fieldError('appearanceYear')}</label><label>Coverage<select value={draft.coverage} onChange={e=>update('coverage',e.target.value as ProcedureDraft['coverage'])}><option>Partial</option><option>Full</option></select></label><label>Did you get selected?<select value={draft.outcome} onChange={e=>update('outcome',e.target.value as ProcedureDraft['outcome'])}><option>Result pending</option><option>Selected</option><option>Not selected</option></select></label></div>
      <div className="procedure-composer"><div className="procedure-composer-heading"><h2>Your experience</h2><div className="procedure-composer-controls"><ConfirmAction label="Clear all" title="Clear all your writing?" description="This clears the text in your experience editor. Your company and other details are kept. The empty editor will save automatically." confirmLabel="Clear writing" disabled={locked||!draft.body.length} onConfirm={()=>{update('body','');setPreview(false);requestAnimationFrame(()=>textarea.current?.focus());}}/>{!locked&&<button type="button" aria-pressed={preview} className="preview-toggle" onClick={()=>{setPreview(value=>!value);if(preview)requestAnimationFrame(()=>{textarea.current?.focus({preventScroll:true});textarea.current?.setSelectionRange(selection.start,selection.end);});}}><AppIcon name="eye"/>{preview?'Hide preview':'Preview Markdown'}</button>}</div></div>
      <p className="procedure-note">A short account is enough. Mention the round, a question you remember, or what helped you prepare.</p>
      <details className="procedure-starters"><summary>Need a starting point?</summary><div className="procedure-actions"><button type="button" disabled={!canUseStarter} onClick={()=>{update('body',procedureStarter.replace(/<!--[\s\S]*?-->/g,''));update('coverage','Full');}}>Full experience starter</button><button type="button" disabled={!canUseStarter} onClick={()=>{update('body',oneRoundStarter);update('coverage','Partial');}}>One round starter</button></div><p className="procedure-note">A starter adds a few headings. It never replaces your own writing.</p></details>
      <div className="procedure-toolbar" role="toolbar" aria-label="Writing tools">{writingTools.map(tool=><button type="button" key={tool.format} aria-pressed={isWritingFormatActive(draft.body,selection.start,selection.end,tool.format)} aria-keyshortcuts={tool.shortcut?`Control+${tool.shortcut} Meta+${tool.shortcut}`:undefined} title={`${tool.label}${tool.shortcut?` (Ctrl/⌘+${tool.shortcut})`:''}. Click again to remove`} onMouseDown={event=>event.preventDefault()} onClick={()=>format(tool.format)}><AppIcon name={tool.format}/><span>{tool.label}</span></button>)}</div>
      <div className={`procedure-writing ${preview?'with-preview':''}`}><label className="procedure-body-label"><span className="sr-only">Your experience</span><textarea {...fieldProps('body')} aria-required="true" ref={textarea} rows={12} maxLength={20000} placeholder="I appeared for… The round included… My advice would be…" value={draft.body} onSelect={trackSelection} onChange={e=>{update('body',e.target.value);trackSelection();}} onKeyDown={event=>{if(!(event.ctrlKey||event.metaKey)||event.altKey)return;const key=event.key.toLowerCase();if(['b','i','k'].includes(key)){event.preventDefault();if(key==='b')format('bold');if(key==='i')format('italic');if(key==='k')format('link');}}}/>{fieldError('body')}</label>{preview&&<article className="procedure-reader-preview"><h3>Reader preview</h3>{draft.summary&&<p>{draft.summary}</p>}<Markdown body={draft.body}/></article>}</div>
      <div className="procedure-composer-footer"><span>{meaningfulBody(draft.body).split(/\s+/).filter(Boolean).length} words · {draft.body.length.toLocaleString()} / 20,000 characters</span><span>Plain text or Markdown</span></div></div>
      <details className="procedure-optional"><summary>Optional details and attribution <span>Title, summary, rounds, role and public name</span></summary><p className="procedure-note">Skip this section to submit faster. Your experience gets a title automatically if you leave it blank.</p>
      <label>Experience title (optional)<input {...fieldProps('title')} maxLength={120} placeholder="e.g. Software engineer interview: coding and SQL" value={draft.title} onChange={e=>update('title',e.target.value)}/>{fieldError('title')}</label><label>Short summary (optional)<textarea {...fieldProps('summary')} rows={2} maxLength={320} placeholder="What should a reader know before opening your experience?" value={draft.summary} onChange={e=>update('summary',e.target.value)}/>{fieldError('summary')}</label>
      <fieldset className="procedure-rounds"><legend>Rounds covered (optional)</legend>{roundOptions.map(round=><label key={round}><input type="checkbox" checked={draft.rounds.includes(round)} onChange={e=>update('rounds',e.target.checked?[...draft.rounds,round]:draft.rounds.filter(value=>value!==round))}/>{round}</label>)}</fieldset>
<div className="procedure-fields"><label>Graduation year<input {...fieldProps('graduationYear')} type="number" min="2000" max="2100" value={draft.graduationYear??''} onChange={e=>update('graduationYear',e.target.value?Number(e.target.value):null)}/>{fieldError('graduationYear')}</label><label>Role<input {...fieldProps('role')} maxLength={100} placeholder="e.g. Software Engineer" value={draft.role} onChange={e=>update('role',e.target.value)}/>{fieldError('role')}</label><label>Public name<select {...fieldProps('attribution')} value={draft.attribution} onChange={e=>update('attribution',e.target.value as ProcedureDraft['attribution'])}><option value="anonymous">Anonymous</option><option value="name">Google profile name</option><option value="custom">Custom name</option></select></label>{draft.attribution==='custom'&&<label>Custom public name<input {...fieldProps('customName')} aria-required="true" maxLength={60} placeholder="Name readers will see" value={draft.customName} onChange={event=>update('customName',event.target.value)}/>{fieldError('customName')}</label>}</div><p className="procedure-note">Readers will see: <strong>{draft.attribution==='custom'?draft.customName.trim()||'Enter a custom name':draft.attribution==='name'?user?.displayName||'Contributor':'Community contributor'}</strong>.</p><p className="procedure-note">These preferences are remembered for your next experience. Your email stays private.</p>
      </details>
    </fieldset><div className="procedure-actions">{locked&&<button type="button" aria-pressed={preview} className="preview-toggle" onClick={()=>{setPreview(value=>!value);if(preview)requestAnimationFrame(()=>{textarea.current?.focus({preventScroll:true});textarea.current?.setSelectionRange(selection.start,selection.end);});}}><AppIcon name="eye"/>{preview?'Hide preview':'Preview Markdown'}</button>}<span className={`procedure-save-status ${saved==='Saved to your account'?'is-saved':''}`} role="status"><AppIcon name={saved==='Saved to your account'?'check':'clock'}/>{saved}</span>{!locked&&<button className="text-button" disabled={conflict} onClick={()=>void enqueueSave().catch(failed)}>Save now</button>}</div><p className="procedure-note">You can pick up a saved draft on any device. If your connection drops, your writing stays on this browser until it can be saved.</p>{error&&<p className="auth-message" role="alert">{error}</p>}<div className="procedure-actions procedure-submit-bar"><button type="button" disabled={busy||leaving} title="Keep your draft and return to My contributions" onClick={()=>void cancelWriting()}><AppIcon name="back"/>{leaving?'Keeping your draft…':'Cancel'}</button><button className="action-button" disabled={locked||conflict||companiesLoading||!companies.length} onClick={()=>void send()}><AppIcon name={status==='pending'?'clock':'share'}/>{busy?'Submitting…':status==='pending'?'Pending approval':'Submit for review'}</button>{status==='pending'&&<a href="#procedures/contributions?status=pending">View submission status ↗</a>}</div><div className="procedure-actions"><a href="#procedures/contributions">My contributions ↗</a><a href={`#procedures/contribute?new=${Date.now()}`}>Share another company experience ↗</a></div>
  </section>;
}
