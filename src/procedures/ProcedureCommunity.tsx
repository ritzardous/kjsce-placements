import { DialogPortal, openTaskDialog } from '../ui/overlay';
import { loadDashboard } from '../dashboard/repository';
import { ActionMenu } from '../ui/ActionMenu';
import { canonicalCompanyKey, canonicalCompanyName } from '../../shared/company-identity';
import { FollowButton } from '../notifications/NotificationSettings';
import {notify} from '../ui/AppUtilities';
import {BookmarkButton} from '../community/BookmarkButton';
import { useBackgroundSync } from '../lib/background-sync';
import { FetchLoader } from '../ui/FetchLoader';
import { AppIcon } from '../ui/AppIcon';
import {hiddenYears} from '../app/routing';
import { PageState } from '../community/CommunityPageState';
import { BackToContext, BackToExperiences, AdvancedFilters } from './ProcedureUX';
import { browseDefaults as defaults, browseFilters, browseHref } from './procedure-navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { getFirebase } from '../lib/firebase';
import { CompanyIdentity, CompanyLogo } from '../dashboard/CompanyIdentity';
import { Markdown } from './ProcedureMarkdown';
import { callProcedure, procedureCompanies, procedureError } from './procedures-api';
import { community, usePaged, safeStored, storeSession } from '../community/community-api';
import { postTitle, readingMinutes, roundOptions, type ProcedurePost, type ProcedureCompany } from '../../shared/procedures';

export function useCompanies() {
  const [companies, setCompanies] = useState<ProcedureCompany[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt,setAttempt] = useState(0);
  useBackgroundSync(async () => { setAttempt(value=>value+1); }, 120000, Boolean(error));
  useEffect(() => { let active = true; void procedureCompanies().then(rows => { if(active){setCompanies(rows);setError('');} }).catch(cause => {if(active)setError(procedureError(cause));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;}; }, [attempt]);
  return { companies, error, loading };
}
function RoundChips({ post }: { post: Partial<ProcedurePost> }) { if(!post.rounds?.length)return null; return <div className="procedure-chips">{post.rounds.map(round=><span className="procedure-badge" key={round}>{round}</span>)}</div>; }
export function PostCard({ post, companyPage=false }: { post: ProcedurePost & {saved?:boolean}; companyPage?:boolean }) {
  return <article className="procedure-card has-bookmark"><div className="procedure-heading"><CompanyIdentity companyKey={post.companyKey} name={post.companyName}/><span className={`procedure-badge coverage-${post.coverage.toLowerCase()}`}>{post.coverage} procedure</span><BookmarkButton postId={post.id} initialSaved={post.saved}/></div><h3><a className="procedure-card-title" href={`#procedures/${post.id}`}>{postTitle(post)}</a></h3><p>{post.appearanceYear} · {post.role ? `${post.role} · ` : ''}{post.outcome} · {readingMinutes(post.body)} min read</p>{post.summary && <p>{post.summary}</p>}<RoundChips post={post}/><p>{post.authorName} · {post.score} helpful votes</p><div className="procedure-actions"><a className="portal-link" href={`#procedures/${post.id}`}><AppIcon name="arrow"/>Read experience</a>{!companyPage&&<a href={`#procedures/company?company=${encodeURIComponent(post.companyKey)}`}>Company details</a>}</div></article>;
}
type CompanyExperienceCard={id:string;companyKey:string;companyName:string;count:number;publishedAt:number;score:number};
function CompanyStatisticsLinks({company}:{company:ProcedureCompany}) {
 const [open,setOpen]=useState(false);
 return <details className="company-statistics-links" onToggle={event=>setOpen(event.currentTarget.open)}><summary>Placement statistics</summary>{open&&<div className="procedure-actions">{company.years.filter(year=>!hiddenYears.has(year)).map(year=><CompanyStatisticsLink key={year} year={year} companyKey={company.key}/>)}</div>}</details>;
}
function CompanyStatisticsLink({year,companyKey}:{year:number;companyKey:string}) {
 const {user}=useAuth(),[key,setKey]=useState<string|null|undefined>(undefined);
 useEffect(()=>{let active=true;void loadDashboard(year).then(data=>{if(active)setKey(data.statistics.companies.find(row=>canonicalCompanyKey(row.key)===canonicalCompanyKey(companyKey))?.key||null);}).catch(()=>{if(active)setKey(null);});return()=>{active=false;};},[year,companyKey,user?.uid]);
 return key===undefined?<span role="status">Finding Class of {year} statistics…</span>:<a href={key?`#${year}/company/${encodeURIComponent(key)}`:`#${year}/overview`}>Class of {year}{key?' company statistics':' batch overview'} ↗</a>;
}
export function ProcedureBrowse({ companyKey }: { companyKey?: string }) {
  const {user}=useAuth(), key=`procedure-filters:${user?.uid}:${companyKey || 'all'}`;
  const {companies,error:companyError}=useCompanies();
  const [filters,setFilters]=useState(()=>browseFilters(location.hash,safeStored(key,defaults),companyKey)),[search,setSearch]=useState(filters.search);
  const state=usePaged<ProcedurePost|CompanyExperienceCard>(companyKey?'browse':'companyBrowse',filters,true),focusRestored=useRef(false);
  useEffect(()=>{if(state.loading||focusRestored.current)return;focusRestored.current=true;const key=`procedure-focus:${user?.uid}:${companyKey||'all'}`,href=safeStored(key,'');if(href){const link=Array.from(document.querySelectorAll<HTMLAnchorElement>('.procedure-card-title, .procedure-company-card')).find(link=>link.getAttribute('href')===href);requestAnimationFrame(()=>link?.focus({preventScroll:true}));storeSession(key,'');}},[state.loading,user?.uid,companyKey]);
  useEffect(()=>{const timer=setTimeout(()=>setFilters(previous=>({...previous,search})),300);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{const value={...filters,search};storeSession(key,value);if(location.hash.split('?')[0]===(companyKey?'#procedures/company':'#procedures')&&(!companyKey||new URLSearchParams(location.hash.split('?')[1]).get('company')===companyKey))window.history.replaceState(null,'',browseHref(value,companyKey));},[key,filters,search,companyKey]);
  useEffect(()=>{const restore=()=>{const base=location.hash.split('?')[0];if(base!==(companyKey?'#procedures/company':'#procedures')||companyKey&&new URLSearchParams(location.hash.split('?')[1]).get('company')!==companyKey)return;const value=browseFilters(location.hash,safeStored(key,defaults),companyKey);setFilters(value);setSearch(value.search);};window.addEventListener('hashchange',restore);return()=>window.removeEventListener('hashchange',restore);},[key,companyKey]);

  const company=companies.find(row=>row.key===companyKey);
  const directoryHref=browseHref({...browseFilters('#procedures',safeStored(`procedure-filters:${user?.uid}:all`,defaults)),company:''});
  const groups = new Map<string, ProcedurePost[]>();
  for (const post of (companyKey?state.rows:[]) as ProcedurePost[]) {
    const group = `${post.appearanceYear}${post.role ? ` · ${post.role}` : ''}`;
    groups.set(group, [...(groups.get(group) || []), post]);
  }
  return <section onClickCapture={event=>{if((event.target as HTMLElement).closest('a')){const card=(event.target as HTMLElement).closest('.procedure-card'),link=(event.target as HTMLElement).closest<HTMLAnchorElement>('.procedure-company-card')||card?.querySelector<HTMLAnchorElement>('.procedure-card-title');if(link)storeSession(`procedure-focus:${user?.uid}:${companyKey||'all'}`,link.getAttribute('href'));storeSession(key,{...filters,search});storeSession(`procedure-return:${user?.uid}`,browseHref({...filters,search},companyKey));state.rememberScroll();}}}>
    {companyKey && <><a className="procedure-back-link company-directory-back" href={directoryHref}><AppIcon name="back"/>Back to companies</a><div className="procedure-card procedure-company-hub"><h2 className="company-hub-title">{company&&<CompanyLogo companyKey={company.key} name={company.name}/>}<span>{company?.name || 'Company'} experiences</span></h2><ActionMenu label="Company options"><FollowButton kind="company" itemKey={companyKey} label={company?.name || companyKey}/></ActionMenu>{company&&<CompanyStatisticsLinks company={company}/>}<a className="portal-link" href={`#procedures/contribute?company=${encodeURIComponent(companyKey)}`}>Share an experience for this company</a></div></>}
    <div className="procedure-discovery" role="search" aria-label="Find recruitment experiences"><div className="procedure-search"><label>{companyKey?'Search experiences':'Search companies'}<div className="procedure-search-input"><AppIcon name="search"/><input type="search" value={search} placeholder={companyKey?'Search experiences':'Search companies'} maxLength={120} onChange={event=>setSearch(event.target.value)}/>{search&&<button className="search-clear" type="button" aria-label="Clear search" onClick={()=>setSearch('')}><AppIcon name="close"/></button>}</div></label><AdvancedFilters companies={companies} lockedCompany={Boolean(companyKey)} value={{company:filters.company,year:filters.year,sort:filters.sort,coverage:filters.coverage,outcome:filters.outcome,round:filters.round}} onApply={value=>setFilters(previous=>({...previous,...value}))}/></div>
    </div>
    {companyError && <p role="alert">{companyError}</p>}
    <div className="procedure-results-heading"><div><h2>{companyKey?'Recruitment experiences':'Companies'}</h2></div></div>
    {!state.loading&&!state.error&&!state.rows.length&&<div className="portal-empty experience-empty"><AppIcon name="search"/><h2>{state.more?'Still looking for an experience that fits.':'No matching experiences yet.'}</h2><p>{state.more?'Keep scrolling to see more experiences.':'Try resetting filters, or share the rounds you attended.'}</p><a href="#procedures/contribute">Contribute an experience ↗</a></div>}
    <div className={`procedure-list${companyKey?'':' procedure-company-directory'}`} aria-busy={state.loading}>{companyKey ? [...groups].map(([group, posts])=><section key={group}><h3>{group}</h3>{posts.map(post=><PostCard key={post.id} post={post} companyPage/>)}</section>) : (state.rows as CompanyExperienceCard[]).map(company=><a className="procedure-company-card" key={company.id} href={browseHref({...filters,company:company.companyKey},company.companyKey)} aria-label={company.companyName+' experiences'}><CompanyIdentity companyKey={company.companyKey} name={company.companyName}/><span className="company-experience-count"><strong>{company.count}</strong> {company.count===1?'experience':'experiences'}</span><span className="company-card-action">View experiences<AppIcon name="arrow"/></span></a>)}</div><PageState state={state}/>
  </section>;
}
export function SavedExperiences() {
  const state=usePaged<{id:string;postId:string;title:string;companyName:string;appearanceYear:number;available:boolean;updated:boolean}>('saved',{},true);
  const [message,setMessage]=useState('');
  return <section className="saved-workspace" onClickCapture={event=>{if((event.target as HTMLElement).closest('a'))state.rememberScroll();}}><p>Your saved experiences are here whenever you need them.</p>{message&&<p className="procedure-success" role="status">{message}</p>}{!state.loading&&!state.rows.length&&!state.error&&<p>Save an experience while reading it to build your private preparation list.</p>}<div className="procedure-list">{state.rows.map(row=><article className="procedure-card has-bookmark" key={row.id}><BookmarkButton postId={row.postId} initialSaved onChange={saved=>{if(!saved){state.remove(row.id);setMessage('Bookmark removed.');}}}/><h3>{row.title}</h3><p>{row.companyName} · {row.appearanceYear}</p>{row.updated&&<p className="procedure-feedback">A newer approved revision is available.</p>}{!row.available&&<p>This experience is no longer available.</p>}<div className="procedure-actions">{row.available&&<a href={`#procedures/${row.postId}`}><AppIcon name="arrow"/>Read experience</a>}</div></article>)}</div><PageState state={state}/></section>;
}
function ReportForm({ postId, questionId, target='post', context }: { postId:string;questionId?:string;target?:'post'|'question'|'answer';context?:string }) {
    const dialog=useRef<HTMLDialogElement>(null),heading=useId(),reasonId=useId(),detailsId=useId();
    const [reason,setReason]=useState('outdated'),[details,setDetails]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
    const label='Report '+(target==='post'?'experience':target==='answer'?'reply':'question');
    return <><button type="button" aria-haspopup="dialog" onClick={event=>openTaskDialog(dialog.current,event.currentTarget)}>{label}</button><DialogPortal><dialog ref={dialog} className="procedure-card task-dialog report-dialog" aria-labelledby={heading} onCancel={event=>{if(busy)event.preventDefault();}}>
    <header className="task-dialog-heading"><h2 id={heading}>{label}</h2><button type="button" aria-label="Close report" disabled={busy} onClick={()=>dialog.current?.close()}><AppIcon name="close"/></button></header>
    {context&&<p className="report-context">{context}</p>}<p>Tell us what needs attention. An admin will review your report.</p>
    <form onSubmit={event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');void community('report',{postId,...(questionId?{questionId}:{}),target,reason,details}).then(()=>{dialog.current?.close();setDetails('');notify('Report sent. An admin will review it.');}).catch(cause=>setError(procedureError(cause))).finally(()=>setBusy(false));}}>
    <label htmlFor={reasonId}>Reason</label><select id={reasonId} autoFocus value={reason} disabled={busy} onChange={event=>setReason(event.target.value)}>{[['outdated','Outdated information'],['incorrect','Incorrect information'],['privacy','Privacy concern'],['abuse','Abusive content'],['duplicate','Duplicate experience']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
    <label htmlFor={detailsId}>Details (optional)</label><textarea id={detailsId} value={details} maxLength={1000} rows={4} disabled={busy} onChange={event=>setDetails(event.target.value)}/><small>{details.length}/1,000 characters</small>
    {error&&<p role="alert">{error}</p>}<div className="procedure-actions"><button type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button className="action-button" aria-busy={busy} disabled={busy}>{busy?'Sending report…':'Send report'}</button></div>
    </form></dialog></DialogPortal></>;
  }
export function PostDetail({ id }: {id:string}) {
  const {user}=useAuth(),votePending=useRef(false);
  const [post,setPost]=useState<ProcedurePost|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[myVote,setMyVote]=useState(0),[busy,setBusy]=useState(false),[shareMessage,setShareMessage]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>{setError('Connection is taking longer than expected. Reconnecting automatically…');setLoading(false);},15000);const stop=onSnapshot(doc(getFirebase().db,'procedurePosts',id),snap=>{clearTimeout(timer);setError('');setPost(snap.exists()?{...snap.data(),companyKey:canonicalCompanyKey(snap.data()!.companyKey),companyName:canonicalCompanyName(snap.data()!.companyKey,snap.data()!.companyName),id} as ProcedurePost:null);setLoading(false);},cause=>{clearTimeout(timer);setPost(null);setError((cause as {code?:string}).code?.includes('permission-denied')?'This experience is unavailable or has been unpublished.':procedureError(cause));setLoading(false);});return()=>{clearTimeout(timer);stop();};},[id]);
  useEffect(()=>{if(!post?.published||!user)return;return onSnapshot(doc(getFirebase().db,'procedurePosts',id,'votes',user.uid),snap=>{if(!votePending.current)setMyVote(snap.data()?.value||0);},cause=>{if((cause as {code?:string}).code?.includes('permission-denied')){setPost(null);setError('This experience is unavailable or has been unpublished.');}else setError(procedureError(cause));});},[id,post?.published,user]);
  useEffect(()=>{if(post)document.title=`${postTitle(post)} · Placement Stats KJSCE`;},[post?.title,post?.companyName,post?.appearanceYear]);
  async function share(){setShareMessage('');try{const url=location.origin+location.pathname+`#procedures/${id}`;if(navigator.share)await navigator.share({title:post?postTitle(post):'Recruitment experience',url});else {await navigator.clipboard.writeText(url);setShareMessage('Experience link copied.');notify('Experience link copied.');}}catch(cause){if((cause as Error).name!=='AbortError')setShareMessage('Could not share the link. Copy the page address to share it.');}}
  async function cast(value:number){
    if(votePending.current||user?.uid===post?.authorUid)return;
    const previous=myVote,next=previous===value?0:value;
    votePending.current=true;setBusy(true);setError('');setMyVote(next);
    try{const result=await callProcedure<{value:number}>('setProcedureVote',{id,value:next});setMyVote(result.value);notify(next?'Thanks for your feedback.':'Vote removed.');}
    catch(cause){setMyVote(previous);setError(procedureError(cause));notify('Your vote could not be saved. Please try again.','error');}
    finally{votePending.current=false;setBusy(false);}
  }

  if(loading)return <FetchLoader variant="article" label="Loading experience…"/>;
  if(!post?.published)return <section><p role="alert">{error||'This experience is unavailable or has been unpublished.'}</p><a href="#procedures">Back to experiences</a></section>;
  return <article className="procedure-card procedure-detail reader-view has-bookmark"><BookmarkButton postId={id}/><BackToContext fallback={`#procedures/company?company=${encodeURIComponent(post.companyKey)}`} label={post.companyName+' experiences'}/><h1>{postTitle(post)}</h1><Markdown body={post.body} showMeta={false}/>
    <footer className="reader-footer"><div className="procedure-actions"><ActionMenu label="Experience options"><FollowButton kind="experience" itemKey={id} label={postTitle(post)}/><button type="button" title="Share experience" onClick={()=>void share()}><AppIcon name="share"/>Share</button><ReportForm postId={id} context={postTitle(post)}/></ActionMenu><button disabled={user?.uid===post.authorUid} aria-disabled={busy||user?.uid===post.authorUid} aria-busy={busy} aria-label={`Upvote (${post.upvotes})`} title="Helpful experience" aria-pressed={myVote===1} onClick={()=>void cast(1)}><AppIcon name="up"/>{post.upvotes}</button><button disabled={user?.uid===post.authorUid} aria-disabled={busy||user?.uid===post.authorUid} aria-busy={busy} aria-label={`Downvote (${post.downvotes})`} title="Not helpful" aria-pressed={myVote===-1} onClick={()=>void cast(-1)}><AppIcon name="down"/>{post.downvotes}</button></div>{shareMessage&&<p role="status">{shareMessage}</p>}{error&&<p role="alert">{error}</p>}<details className="reader-context"><summary>About this experience</summary><p>{post.companyName} · {post.appearanceYear} · {post.coverage} procedure · {post.outcome}{post.role&&` · ${post.role}`}</p><p>By {post.authorName}. Experiences are self-reported; future recruitment rounds may differ.</p><a href={`#procedures/company?company=${post.companyKey}`}>More from {post.companyName}<AppIcon name="arrow"/></a></details></footer></article>;
}
