import { experienceOrigin, updateExperienceTarget } from '../app/navigation-context';
import { canonicalCompanyKey } from '../../shared/company-identity';
import { readCompanyProfile } from '../../shared/company-profile';
import { SubmissionTimeline } from '../community/Contributions';
import { OperationStatus } from '../ui/OperationStatus';
import { useBackgroundSync } from '../lib/background-sync';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebase } from '../lib/firebase';
import { FetchLoader } from '../ui/FetchLoader';
import { AppIcon } from '../ui/AppIcon';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { procedureDraftSchema, initialProcedureDraft, procedureStarter, oneRoundStarter, meaningfulBody, readingMinutes, roundOptions, submissionSchema, type ProcedureCompany, type ProcedureDraft, type ProcedureSubmission } from '../../shared/procedures';
import { getSubmission, saveProcedure, callProcedure, invalidateCompanyDirectory, procedureError } from './procedures-api';
import { community } from '../community/community-api';
import { useCompanies } from './ProcedureCommunity';
import { Markdown } from './ProcedureMarkdown';
import { ProcedureCompanyPicker } from './ProcedureCompanyPicker';
import { BackToContext, ConfirmAction } from './ProcedureUX';

import type { RichExperienceEditorHandle } from './RichExperienceEditor';
const RichExperienceEditor=lazy(()=>import('./RichExperienceEditor').then(module=>({default:module.RichExperienceEditor})));
import { ProcedureCompanyPreview } from './ProcedureCompanyPreview';
import { useCompanyPlacement } from './useCompanyPlacement';

type Backup = { id: string; version: number; draft: ProcedureDraft; updatedAt: number };
function readBackup(key: string, draftId?: string): Backup | null {
  try {
    const value = JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || 'null');
    const parsed = procedureDraftSchema.safeParse(value?.draft || value);
    return parsed.success ? { id: draftId || value.id || crypto.randomUUID(), version: value.version || 0, draft: parsed.data, updatedAt: value.updatedAt || Date.now() } : null;
  } catch { return null; }
}
export function ProcedureEditor({ draftId, freshKey }: {draftId?:string;freshKey?:string}) {
  const {user}=useAuth(), {companies:directoryCompanies,error:companyError,loading:companiesLoading}=useCompanies();
  const [addedCompanies,setAddedCompanies]=useState<ProcedureCompany[]>([]);
  const companies=[...directoryCompanies,...addedCompanies.filter(c=>!directoryCompanies.some(d=>d.key===c.key))];
  async function addCompany(name:string) {
    const company=await community<ProcedureCompany>('createCompany',{name});
    invalidateCompanyDirectory();
    setAddedCompanies(previous=>[...previous.filter(c=>c.key!==company.key),company]);
    return company;
  }
  const newKey=freshKey?`new:${freshKey}`:'new';
  const [persistedId,setPersistedId]=useState(draftId), [backup]=useState(()=>readBackup(`procedure-backup:${user?.uid}:${draftId||newKey}`,draftId));
  const backupKey=`procedure-backup:${user?.uid}:${persistedId||newKey}`, storageKey=useRef(backupKey); storageKey.current=backupKey;
  const [draft,setDraft]=useState<ProcedureDraft>(()=>backup?.draft || {...initialProcedureDraft(),body:'',companyKey:canonicalCompanyKey(new URLSearchParams(location.hash.split('?')[1]).get('company')||'')}),[status,setStatus]=useState<ProcedureSubmission['status']>('draft'),[feedback,setFeedback]=useState(''),[ready,setReady]=useState(!draftId),[preview,setPreview]=useState(false),[saved,setSaved]=useState(backup?'Recovered writing from this device.':'Drafts save automatically.'),[error,setError]=useState(''),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[remote,setRemote]=useState<ProcedureDraft|null>(null),[deviceSaved,setDeviceSaved]=useState(false),[issues,setIssues]=useState<Partial<Record<keyof ProcedureDraft,string>>>({});
  const id=useRef(draftId||backup?.id||crypto.randomUUID()),version=useRef(backup?.version||0),latest=useRef(draft),savedBody=useRef(JSON.stringify({...initialProcedureDraft(),body:''})),queue=useRef<Promise<unknown>>(Promise.resolve()),pending=useRef(false),alive=useRef(true),writing=useRef<RichExperienceEditorHandle>(null),touched=useRef(Boolean(backup)), submitting=useRef(false);
  const discarding=useRef(false),openedDraft=useRef<ProcedureDraft|null>(null);
  const [readAttempt,setReadAttempt]=useState(0),[leaving,setLeaving]=useState(false);
  useBackgroundSync(async () => { setReadAttempt(value=>value+1); }, 120000, Boolean(!ready&&error));
  latest.current=draft;
  function deviceCopy(value:ProcedureDraft, key=storageKey.current) {
    if(discarding.current)return false;
    try { localStorage.setItem(key,JSON.stringify({id:id.current,version:version.current,draft:value,updatedAt:Date.now()}));if(alive.current)setDeviceSaved(true);return true; } catch {if(alive.current)setDeviceSaved(false);return false;}
  }
  function clearCopy(key=storageKey.current) {try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{/* Cloud saving remains available. */}}
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{if(!ready||pending.current)return;if(JSON.stringify(draft)!==savedBody.current)deviceCopy(draft);},[draft,ready,backupKey]);
  useEffect(()=>{if(draftId||backup)return;let active=true;void community<Partial<ProcedureDraft>>('preferences').then(preferences=>{if(active&&!touched.current)setDraft(previous=>({...previous,graduationYear:preferences.graduationYear??null,attribution:preferences.attribution||'anonymous',customName:preferences.customName||''}));}).catch(()=>undefined);return()=>{active=false;};},[draftId]);
  useEffect(()=>{if(!draftId)return;let active=true;void getSubmission(draftId).then(row=>{
    if(!active)return;if(!row)throw new Error('Draft not found. Start a new contribution.');
    const parsed=procedureDraftSchema.parse(row.draft);version.current=row.draftVersion;savedBody.current=JSON.stringify(parsed);if(!openedDraft.current)openedDraft.current=parsed;pending.current=row.status==='pending';setRemote(parsed);
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
      const value=latest.current;if(discarding.current||pending.current||JSON.stringify(value)===savedBody.current)return;
      if(alive.current)setSaved('Saving…');
      const result=await saveProcedure(id.current,version.current,value);version.current=result.version;savedBody.current=JSON.stringify(value);setRemote(value);
      const oldKey=storageKey.current,newKey=`procedure-backup:${user?.uid}:${id.current}`;
      if(JSON.stringify(latest.current)===savedBody.current){clearCopy(oldKey);clearCopy(newKey);}else{deviceCopy(latest.current,newKey);if(oldKey!==newKey)clearCopy(oldKey);}
      if(alive.current){setSaved(JSON.stringify(latest.current)===savedBody.current?'Saved to your account':'Saved on this device; syncing changes');setError('');setStatus('draft');if(!draftId)setPersistedId(id.current);if(!draftId&&location.hash.split('?')[0]==='#procedures/contribute'){const next=`#procedures/contribute?draft=${id.current}`;updateExperienceTarget(user?.uid,location.hash,next);window.history.replaceState(null,'',next);}}
    });queue.current=operation;return operation;
  }
  async function failed(cause:unknown) {
    if(!alive.current)return;setSaved(deviceCopy(latest.current)?'Your writing is safe on this device. Saving to your account failed.':'Your writing could not be saved. Please copy it before leaving.');setError(procedureError(cause));
    if((cause as {code?:string}).code?.includes('failed-precondition')){
      try {const row=await getSubmission(id.current);if(!row||!alive.current)return;version.current=row.draftVersion;setRemote(procedureDraftSchema.parse(row.draft));savedBody.current=JSON.stringify(procedureDraftSchema.parse(row.draft));pending.current=row.status==='pending';setStatus(row.status);setConflict(row.status!=='pending');}catch{/* Keep the existing recovery copy. */}
    }
  }
  useEffect(()=>{if(discarding.current||leaving||!touched.current||!ready||pending.current||conflict||busy||JSON.stringify(draft)===savedBody.current)return;setSaved(deviceSaved?'Your writing is safe on this device. Saving to your account soon.':'Unsaved changes');const timer=setTimeout(()=>void enqueueSave().catch(failed),900);return()=>clearTimeout(timer);},[draft,ready,conflict,busy,leaving]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(!discarding.current&&JSON.stringify(latest.current)!==savedBody.current&&!pending.current){if(!deviceCopy(latest.current)){event.preventDefault();event.returnValue='';}}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
  function update<K extends keyof ProcedureDraft>(key:K,value:ProcedureDraft[K]){touched.current=true;setIssues(previous=>{const next={...previous};delete next[key];return next;});setDraft(previous=>{const next={...previous,[key]:value};if(key==='campus'&&value===undefined)delete next.campus;return next;});}
  async function send(){if(submitting.current)return;setError('');const validated=submissionSchema.safeParse(latest.current);if(!validated.success){const errors:Partial<Record<keyof ProcedureDraft,string>>={};for(const issue of validated.error.issues){const field=String(issue.path[0]||'body') as keyof ProcedureDraft;if(!errors[field])errors[field]=issue.message;}setIssues(errors);if(errors.body)setPreview(false);requestAnimationFrame(()=>{const field=document.getElementById(`procedure-${Object.keys(errors)[0]}`);field?.closest('details')?.setAttribute('open','');field?.focus();});return;}setIssues({});submitting.current=true;setBusy(true);try{await enqueueSave();await callProcedure('submitProcedure',{id:id.current,expectedVersion:version.current});pending.current=true;clearCopy();setStatus('pending');setSaved('Submitted for review');window.dispatchEvent(new Event('procedure-notifications-changed'));requestAnimationFrame(()=>document.getElementById('procedure-submitted')?.focus());}catch(cause){await failed(cause);}finally{submitting.current=false;setBusy(false);}}
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
  async function discardWriting() {
    if(busy||leaving||discarding.current)return;
    const destination=experienceOrigin(user?.uid)?.href||'#procedures';
    discarding.current=true;setLeaving(true);setError('');
    try {
      // An already-started save must settle before rollback; queued saves are skipped.
      await queue.current.catch(()=>undefined);
      if(!conflict){
        const account=await getSubmission(id.current);
        if(account){
          if(account.draftVersion!==version.current||account.status==='pending')throw new Error('This draft changed in another tab. Reload before cancelling so that newer writing stays safe.');
          if(openedDraft.current){
            if(JSON.stringify(procedureDraftSchema.parse(account.draft))!==JSON.stringify(openedDraft.current)){
              try {await saveProcedure(id.current,version.current,openedDraft.current);}
              catch(cause){
                if(!(cause as {code?:string}).code?.includes('resource-exhausted'))throw cause;
                await new Promise(resolve=>setTimeout(resolve,350));
                await saveProcedure(id.current,version.current,openedDraft.current);
              }
            }
          }else await community('manageSubmission',{id:id.current,expectedVersion:version.current,action:'delete'});
        }
      }
      for(const key of new Set([storageKey.current,`procedure-backup:${user?.uid}:${id.current}`,`procedure-backup:${user?.uid}:${newKey}`]))clearCopy(key);
      window.dispatchEvent(new Event('procedure-notifications-changed'));
      location.hash=destination;
    } catch(cause){discarding.current=false;setError('Could not cancel safely. '+procedureError(cause));setLeaving(false);}
  }
  const locked=status==='pending'||busy||leaving;
  const selectedCompany=companies.find(company=>company.key===draft.companyKey);
  const placement=useCompanyPlacement(selectedCompany,draft.graduationYear);
  const roles=placement.company?.roles.length?placement.company.roles.filter(Boolean):readCompanyProfile(selectedCompany?.profile)?.roles||[];
  const [customRole,setCustomRole]=useState(false);
  const automaticRole=useRef('');
  const roleIsCustom=customRole||Boolean(draft.role&&!roles.includes(draft.role));
  useEffect(()=>{
    if(!ready||locked||placement.loading||customRole)return;
    if(draft.role&&draft.role!==automaticRole.current)return;
    const next=roles.length===1?roles[0]:'';
    automaticRole.current=next;
    if(next!==draft.role)update('role',next);
  },[ready,locked,placement.company,placement.loading,selectedCompany?.profile,draft.role,customRole]);
  function chooseCompany(key:string){automaticRole.current='';update('companyKey',key);update('role','');setCustomRole(false);}

  const canUseStarter=!draft.body.trim()||[procedureStarter,oneRoundStarter,procedureStarter.replace(/<!--[\s\S]*?-->/g,'')].some(starter=>starter.trim()===draft.body.trim());
  const names:Record<keyof ProcedureDraft,string>={companyKey:'Company',appearanceYear:'Year you appeared',body:'Your experience',title:'Experience title (optional)',summary:'Short summary (optional)',rounds:'Rounds covered',graduationYear:'Batch year (graduation)',role:'Role',attribution:'Public name',customName:'Custom public name',coverage:'Coverage',campus:'Recruitment route',outcome:'Did you get selected?'};
  const fieldProps=(key:keyof ProcedureDraft)=>({id:`procedure-${key}`,'aria-label':names[key],'aria-invalid':Boolean(issues[key]),'aria-describedby':issues[key]?`procedure-error-${key}`:undefined});
  const fieldError=(key:keyof ProcedureDraft)=>issues[key]?<p id={`procedure-error-${key}`} className="procedure-note">{issues[key]}</p>:null;
  useEffect(()=>{const guard=(event:MouseEvent)=>{const anchor=(event.target as HTMLElement).closest?.('a[href]');if(!anchor||discarding.current||pending.current||JSON.stringify(latest.current)===savedBody.current)return;if(!deviceCopy(latest.current)&&!window.confirm('Your latest writing could not be saved to your account or this browser. Leave and lose these unsaved changes?')){event.preventDefault();event.stopPropagation();}};document.addEventListener('click',guard,true);return()=>document.removeEventListener('click',guard,true);},[]);
  const wordCount=meaningfulBody(draft.body).split(/\s+/).filter(Boolean).length;
  const readTime=readingMinutes(draft.body);
  const publicName=draft.attribution==='custom'?draft.customName.trim()||'Community contributor':draft.attribution==='name'?user?.displayName||'Contributor':'Community contributor';
  function focusEditor(){requestAnimationFrame(()=>writing.current?.focus());}
  function togglePreview(){if(preview){setPreview(false);focusEditor();}else setPreview(true);}
  function applyStarter(value:string,coverage:ProcedureDraft['coverage']){update('body',value);update('coverage',coverage);}
  if(!ready)return <section className="procedure-editor-page studio studio-loading">{error?<p role="alert">{error}</p>:<FetchLoader variant="article" label="Loading your draft…"/>}<a href="#procedures/contributions">Back to my contributions</a></section>;
  if(status==='pending')return <section className="submission-detail studio-submission">
    <BackToContext/>
    <div id="procedure-submitted" tabIndex={-1} className="contribute-notice studio-status-banner">
      <span className="studio-status-icon"><AppIcon name="clock"/></span>
      <div><h2>Pending approval</h2><p>Your submitted revision is read-only while an admin reviews it. Your existing approved version, if any, remains available.</p></div>
    </div>
    {feedback&&<div className="procedure-feedback studio-feedback"><h3>Reviewer feedback</h3><p>{feedback}</p></div>}
    <header className="studio-submission-head">
      <p className="studio-eyebrow">{[draft.appearanceYear,draft.coverage!=='Not specified'?draft.coverage:null,draft.outcome!=='Not specified'?draft.outcome:null,draft.campus].filter(Boolean).join(' · ')}</p>
      <h2>{draft.title||selectedCompany?.name||'Your experience'}</h2>
      <button type="button" disabled className="action-button studio-pending-button"><AppIcon name="clock"/>Pending approval</button>
    </header>
    <Markdown body={draft.body}/>
    {draftId&&<SubmissionTimeline id={draftId}/>}
  </section>;
  return <section className="procedure-editor-page studio writing-document">
    <div className="studio-masthead">
      <BackToContext/>
      <div className="studio-masthead-actions">
        <button type="button" aria-label="Save now" disabled={locked||conflict} onClick={()=>void enqueueSave().catch(failed)} className={`procedure-save-status studio-save-status ${saved==='Saved to your account'?'is-saved':''}`} title={saved}><span role="status"><span className="studio-save-dot" aria-hidden="true"/>{saved==='Saved to your account'?'Saved':saved==='Saving…'?'Saving…':saved==='Drafts save automatically.'?'Autosave on':saved}</span></button>
        <button type="button" className="studio-save-button" aria-label="Submit experience" disabled={locked||conflict||companiesLoading||!selectedCompany} onClick={()=>void send()}>Submit</button>
      </div>
    </div>

    <header className="studio-doc-head">

      <h1 className="studio-doc-title">{selectedCompany?`${selectedCompany.name} experience`:'Share your experience'}</h1>

      {draft.campus && <span className="procedure-badge">{draft.campus}</span>}
    </header>

    {pending.current?<div id="procedure-submitted" tabIndex={-1} className="contribute-notice studio-status-banner">
      <span className="studio-status-icon"><AppIcon name="clock"/></span>
      <div><strong>Pending approval</strong><p>Your experience is with an admin for review. You can check My contributions for updates. Once approved, everyone can read it.</p></div>
    </div>:<div id="procedure-submitted" tabIndex={-1} className="studio-focus-anchor" aria-hidden="true"/>}
    {feedback&&<div className="procedure-feedback studio-feedback"><h3>Reviewer feedback</h3><p>{feedback}</p></div>}
    {remote&&draftId&&<p className="procedure-note studio-remote-note">If you have an approved experience, readers can still see it while this update is reviewed.</p>}
    {conflict&&<div className="procedure-feedback studio-feedback studio-conflict" role="alert">
      <h3>This draft changed on your account.</h3>
      <p>Your device writing is still in the editor. Choose which version to continue with before saving.</p>
      <details><summary>Compare account version</summary><Markdown body={remote?.body||''}/></details>
      <div className="procedure-actions">
        <button onClick={()=>{if(remote)setDraft(remote);clearCopy();setConflict(false);setSaved('Saved to your account');}}>Use account version</button>
        <button onClick={()=>{deviceCopy(latest.current);setConflict(false);}}>Keep this device version</button>
      </div>
    </div>}
    {Object.keys(issues).length>0&&<div className="procedure-feedback studio-feedback studio-issues" role="alert">
      <h3>Check these details before submitting</h3>
      {Object.entries(issues).map(([key,message])=><p key={key}><button className="text-button" onClick={()=>{const field=document.getElementById(`procedure-${key}`);field?.closest('details')?.setAttribute('open','');field?.focus();}}>{names[key as keyof ProcedureDraft]}: {message}</button></p>)}
    </div>}

    <fieldset className="procedure-editor studio-fieldset" disabled={locked}>
      <legend className="sr-only">Experience details and writing</legend>
      <div className="studio-layout">
        <div className="studio-main">
          <details className="document-company" open={!selectedCompany||Boolean(issues.companyKey)}>
            <summary>{selectedCompany ? selectedCompany.name+' · Change company' : 'Choose a company'}</summary>
            <ProcedureCompanyPicker onCreate={addCompany} companies={companies} value={draft.companyKey} onChange={chooseCompany} loading={companiesLoading} disabled={locked} invalid={Boolean(issues.companyKey)} errorId={issues.companyKey?'procedure-error-companyKey':undefined}/>
            {fieldError('companyKey')}{companyError&&<p role="alert">{companyError}</p>}
          </details>

          {selectedCompany&&<ProcedureCompanyPreview company={selectedCompany} placement={placement} role={draft.role}/>}
          <fieldset className="writing-required"><legend>Your interview</legend><div className="writing-required-fields">
            <label>Recruitment route<select {...fieldProps('campus')} aria-required="true" value={draft.campus||''} onChange={event=>update('campus',event.target.value?event.target.value as ProcedureDraft['campus']:undefined)}><option value="">Choose a route</option><option>On campus</option><option>Off campus</option></select>{fieldError('campus')}</label>
            <label>Batch year (graduation)<input {...fieldProps('graduationYear')} aria-required="true" type="number" inputMode="numeric" min="2000" max="2100" placeholder="e.g. 2025" value={draft.graduationYear??''} onChange={event=>update('graduationYear',event.target.value?Number(event.target.value):null)}/>{fieldError('graduationYear')}</label>
            <div className="writing-role-field">{roles.length>0?<><label htmlFor="procedure-role">Role</label><select {...fieldProps('role')} aria-required="true" value={roleIsCustom?'__custom__':draft.role} onChange={event=>{automaticRole.current='';setCustomRole(event.target.value==='__custom__');update('role',event.target.value==='__custom__'?'':event.target.value);}}><option value="">Choose a role</option>{roles.map(role=><option key={role}>{role}</option>)}<option value="__custom__">Write a custom role…</option></select>{roleIsCustom&&<label>Custom role<input id="procedure-custom-role" aria-required="true" value={draft.role} maxLength={100} placeholder="Your role" onChange={event=>update('role',event.target.value)}/></label>}</>:placement.loading?<label>Role<select id="procedure-role" aria-required="true" aria-busy="true" disabled><option>Loading recorded roles…</option></select></label>:<label>Role<input {...fieldProps('role')} aria-required="true" value={draft.role} maxLength={100} placeholder={placement.loading?'Your role (recorded roles loading…)':'Enter your role'} onChange={event=>{setCustomRole(true);update('role',event.target.value);}}/></label>}{fieldError('role')}</div>
          </div></fieldset>

          <section className={`procedure-composer studio-composer${preview?' is-preview':''}`}>
            <div className="procedure-composer-heading">
              <div className="procedure-composer-controls">

                <ConfirmAction label="Clear" title="Clear your writing?" description="Remove the blog text, title and optional details? Your company, recruitment route, graduation batch and role will stay." confirmLabel="Clear writing" disabled={locked||(!draft.body.length&&!draft.title&&!draft.summary&&!draft.appearanceYear&&!draft.rounds.length&&draft.coverage==='Not specified'&&draft.outcome==='Not specified'&&draft.attribution==='anonymous'&&!draft.customName)} onConfirm={()=>{const defaults=initialProcedureDraft();for(const key of ['title','summary','body','appearanceYear','coverage','outcome','rounds','attribution','customName'] as const)update(key,key==='body'?'':defaults[key]);setPreview(false);requestAnimationFrame(()=>writing.current?.focus());}}/>
                <button type="button" aria-pressed={preview} className="preview-toggle" onClick={togglePreview}><AppIcon name={preview?'pen':'eye'}/>{preview?'Continue writing':'Preview'}</button>
              </div>
            </div>
            <input {...fieldProps('title')} className="document-title" maxLength={120} placeholder="Untitled experience (optional)" value={draft.title} onChange={event=>update('title',event.target.value)}/>{fieldError('title')}
            <div className={`procedure-writing ${preview?'with-preview':''}`}>
              <div className="procedure-body-label"><Suspense fallback={<FetchLoader variant="article" label="Opening your document…"/>}><RichExperienceEditor ref={writing} value={draft.body} onChange={value=>update('body',value)} disabled={locked} invalid={Boolean(issues.body)} onLimit={()=>setError('Your experience can contain up to 20,000 characters, including formatting.')}/></Suspense>{fieldError('body')}</div>
              {preview&&<article className="procedure-reader-preview studio-preview" aria-label="Reader preview">
                <header className="studio-preview-head"><span className="studio-preview-label">Reader preview</span></header>
                <p className="studio-preview-kicker">{selectedCompany?.name||'Company'}{draft.appearanceYear && ` · ${draft.appearanceYear}`}{draft.campus && ` · ${draft.campus}`}</p>
                <h3 className="studio-preview-title">{draft.title.trim()||(selectedCompany?`${selectedCompany.name} experience`:'Your experience')}</h3>
                {draft.summary&&<p className="studio-preview-summary">{draft.summary}</p>}
                <p className="studio-preview-byline">By {publicName} · {readTime} min read</p>
                {meaningfulBody(draft.body)?<Markdown body={draft.body}/>:<p className="studio-preview-empty">Your writing will appear here as you type.</p>}
              </article>}
            </div>
            <div className="procedure-composer-footer"><span>{wordCount} {wordCount===1?'word':'words'}{draft.body.length>=18000 && ` · ${draft.body.length.toLocaleString()} / 20,000 characters`}</span></div>
            <details className="procedure-starters studio-starters">
              <summary><span><AppIcon name="book"/>Start with an outline</span></summary>
              <div className="studio-starter-grid">
                <button type="button" disabled={!canUseStarter} onClick={()=>applyStarter(procedureStarter.replace(/<!--[\s\S]*?-->/g,''),'Full')}><strong>Full experience</strong><span>Rounds, questions and preparation tips.</span></button>
                <button type="button" disabled={!canUseStarter} onClick={()=>applyStarter(oneRoundStarter,'Partial')}><strong>One round</strong><span>A focused account of a single stage.</span></button>
              </div>
            </details>
          </section>
        </div>

        <aside className="studio-rail" aria-label="Experience settings">
          <details className="procedure-optional studio-optional studio-rail-card">
            <summary><span>Optional details</span><span className="studio-details-hint">Interview year, summary and public name</span></summary>
            <div className="studio-optional-body">
          <div className="document-metadata">


              <div className="procedure-fields">
                <label>Year you appeared<input {...fieldProps('appearanceYear')} type="number" min="2000" max={new Date().getFullYear()+1} value={draft.appearanceYear||''} onChange={e=>update('appearanceYear',e.target.value?Number(e.target.value):null)}/>{fieldError('appearanceYear')}</label>
                <label>Coverage<select {...fieldProps('coverage')} value={draft.coverage} onChange={e=>update('coverage',e.target.value as ProcedureDraft['coverage'])}><option>Not specified</option><option>Partial</option><option>Full</option></select></label>
                <label>Did you get selected?<select {...fieldProps('outcome')} value={draft.outcome} onChange={e=>update('outcome',e.target.value as ProcedureDraft['outcome'])}><option>Not specified</option><option>Result pending</option><option>Selected</option><option>Not selected</option></select></label>
              </div>

          </div>


              <label>Short summary (optional)<textarea {...fieldProps('summary')} rows={2} maxLength={320} placeholder="What should a reader know before opening your experience?" value={draft.summary} onChange={e=>update('summary',e.target.value)}/>{fieldError('summary')}</label>
              <fieldset className="procedure-rounds"><legend>Rounds covered (optional)</legend>{roundOptions.map(round=><label key={round}><input type="checkbox" checked={draft.rounds.includes(round)} onChange={e=>update('rounds',e.target.checked?[...draft.rounds,round]:draft.rounds.filter(value=>value!==round))}/>{round}</label>)}</fieldset>
              <div className="procedure-fields">
                <label>Public name<select {...fieldProps('attribution')} value={draft.attribution} onChange={e=>update('attribution',e.target.value as ProcedureDraft['attribution'])}><option value="anonymous">Anonymous</option><option value="name">Google profile name</option><option value="custom">Custom name</option></select></label>
                {draft.attribution==='custom'&&<label>Custom public name<input {...fieldProps('customName')} aria-required="true" maxLength={60} placeholder="Name readers will see" value={draft.customName} onChange={event=>update('customName',event.target.value)}/>{fieldError('customName')}</label>}
              </div>
              <p className="procedure-note">Readers will see: <strong>{publicName}</strong>.</p>
            </div>
          </details>

          {draftId&&<SubmissionTimeline id={draftId}/>}
        </aside>
      </div>
    </fieldset>

    {error&&<p className="auth-message studio-error" role="alert">{error}</p>}
    {(busy||leaving)&&<OperationStatus label={leaving?(discarding.current?'Discarding changes…':'Keeping your draft…'):'Submitting your experience…'}/>}
    <div className="procedure-actions procedure-submit-bar studio-submit-bar">
      <div className="studio-submit-copy"><strong>{pending.current?'Submitted for review':'Ready to share?'}</strong><span>{pending.current?'An admin will review your latest revision.':'An admin reviews it before it goes live.'}</span></div>
      <div className="studio-submit-actions">
        <ConfirmAction label="Cancel & back" title="Discard changes and go back?" description="New drafts will be removed from your profile. Existing drafts return to the version you opened. Published experiences stay unchanged." confirmLabel="Discard & go back" disabled={locked} onConfirm={()=>void discardWriting()} tone="warning"/>
        <button type="button" disabled={busy||leaving} title="Keep your draft and return to My contributions" onClick={()=>void cancelWriting()}><AppIcon name="back"/>{leaving?(discarding.current?'Discarding changes…':'Keeping your draft…'):'Save & close'}</button>
        <button className="action-button" disabled={locked||conflict||companiesLoading||!companies.length} onClick={()=>void send()}><AppIcon name={pending.current?'clock':'share'}/>{busy?'Submitting…':pending.current?'Pending approval':'Submit for review'}</button>
      </div>
      {pending.current&&<a href="#procedures/contributions?status=pending">View submission status ↗</a>}
    </div>
  </section>;
}
