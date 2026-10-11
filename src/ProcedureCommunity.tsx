import {notify} from './AppUtilities';
import {BookmarkButton} from './BookmarkButton';
import { useBackgroundSync } from './background-sync';
import { FetchLoader } from './FetchLoader';
import { AppIcon } from './AppIcon';
import {hiddenYears} from './routing';
import { PageState } from './CommunityPageState';
import { BackToExperiences, AdvancedFilters } from './ProcedureUX';
import { browseDefaults as defaults, browseFilters, browseHref } from './procedure-navigation';
import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './auth';
import { getFirebase } from './firebase';
import { CompanyIdentity } from './CompanyIdentity';
import { Markdown } from './ProcedureMarkdown';
import { callProcedure, procedureCompanies, procedureError } from './procedures-api';
import { community, usePaged, safeStored, storeSession } from './community-api';
import { postTitle, readingMinutes, roundOptions, type ProcedurePost, type ProcedureCompany } from '../shared/procedures';

export function useCompanies() {
  const [companies, setCompanies] = useState<ProcedureCompany[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [attempt,setAttempt] = useState(0);
  useBackgroundSync(async () => { setAttempt(value=>value+1); }, 120000, Boolean(error));
  useEffect(() => { let active = true; void procedureCompanies().then(rows => { if(active){setCompanies(rows);setError('');} }).catch(cause => {if(active)setError(procedureError(cause));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;}; }, [attempt]);
  return { companies, error, loading };
}
function RoundChips({ post }: { post: Partial<ProcedurePost> }) { return <div className="procedure-chips">{(post.rounds || []).map(round=><span className="procedure-badge" key={round}>{round}</span>)}</div>; }
export function PostCard({ post }: { post: ProcedurePost & {saved?:boolean} }) {
  return <article className="procedure-card has-bookmark"><BookmarkButton postId={post.id} initialSaved={post.saved}/><div className="procedure-heading"><CompanyIdentity companyKey={post.companyKey} name={post.companyName}/><span className={`procedure-badge coverage-${post.coverage.toLowerCase()}`}>{post.coverage} procedure</span></div><h3><a className="procedure-card-title" href={`#procedures/${post.id}`}>{postTitle(post)}</a></h3><p>{post.appearanceYear} · {post.role || 'Role not specified'} · {post.outcome} · {readingMinutes(post.body)} min read</p>{post.summary && <p>{post.summary}</p>}<RoundChips post={post}/><p>{post.authorName} · {post.score} helpful score</p><div className="procedure-actions"><a className="portal-link" href={`#procedures/${post.id}`}><AppIcon name="arrow"/>Read experience</a><a href={`#procedures/company?company=${encodeURIComponent(post.companyKey)}`}>Company hub</a></div></article>;
}
export function ProcedureBrowse({ companyKey }: { companyKey?: string }) {
  const {user}=useAuth(), key=`procedure-filters:${user?.uid}:${companyKey || 'all'}`;
  const {companies,error:companyError}=useCompanies();
  const [filters,setFilters]=useState(()=>browseFilters(location.hash,safeStored(key,defaults),companyKey)),[search,setSearch]=useState(filters.search);
  const [moreFilters,setMoreFilters]=useState(Boolean(filters.coverage||filters.outcome||filters.round));
  const state=usePaged<ProcedurePost>('browse',filters,true),focusRestored=useRef(false);
  useEffect(()=>{if(state.loading||focusRestored.current)return;focusRestored.current=true;const key=`procedure-focus:${user?.uid}:${companyKey||'all'}`,href=safeStored(key,'');if(href){const link=Array.from(document.querySelectorAll<HTMLAnchorElement>('.procedure-card-title')).find(link=>link.getAttribute('href')===href);requestAnimationFrame(()=>link?.focus({preventScroll:true}));storeSession(key,'');}},[state.loading,user?.uid,companyKey]);
  useEffect(()=>{const timer=setTimeout(()=>setFilters(previous=>({...previous,search})),300);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{const value={...filters,search};storeSession(key,value);if(location.hash.split('?')[0]===(companyKey?'#procedures/company':'#procedures')&&(!companyKey||new URLSearchParams(location.hash.split('?')[1]).get('company')===companyKey))window.history.replaceState(null,'',browseHref(value,companyKey));},[key,filters,search,companyKey]);
  useEffect(()=>{const restore=()=>{const base=location.hash.split('?')[0];if(base!==(companyKey?'#procedures/company':'#procedures')||companyKey&&new URLSearchParams(location.hash.split('?')[1]).get('company')!==companyKey)return;const value=browseFilters(location.hash,safeStored(key,defaults),companyKey);setFilters(value);setSearch(value.search);setMoreFilters(Boolean(value.coverage||value.outcome||value.round));};window.addEventListener('hashchange',restore);return()=>window.removeEventListener('hashchange',restore);},[key,companyKey]);
  const change=(field: keyof typeof defaults,value:string)=>setFilters(previous=>({...previous,[field]:value}));

  const company=companies.find(row=>row.key===companyKey);
  const groups = new Map<string, ProcedurePost[]>();
  for (const post of state.rows) {
    const group = `${post.appearanceYear} · ${post.role || 'Role not specified'}`;
    groups.set(group, [...(groups.get(group) || []), post]);
  }
  return <section onClickCapture={event=>{if((event.target as HTMLElement).closest('a')){const card=(event.target as HTMLElement).closest('.procedure-card'),link=card?.querySelector<HTMLAnchorElement>('.procedure-card-title');if(link)storeSession(`procedure-focus:${user?.uid}:${companyKey||'all'}`,link.getAttribute('href'));storeSession(key,{...filters,search});storeSession(`procedure-return:${user?.uid}`,browseHref({...filters,search},companyKey));state.rememberScroll();}}}>
    {companyKey && <div className="procedure-card procedure-company-hub">{company&&<CompanyIdentity companyKey={company.key} name={company.name}/>}<h2>{company?.name || 'Company'} procedure hub</h2><p>Find experiences from people who appeared for this company. Your rounds may be different.</p><div className="procedure-actions">{(company?.years || []).filter(year=>!hiddenYears.has(year)).map(year=><a key={year} href={`#${year}/company/${companyKey}`}>{year} placement statistics ↗</a>)}<a href="#procedures">All companies</a></div></div>}
    <div className="procedure-discovery" role="search" aria-label="Find recruitment experiences"><div className="procedure-search"><label>Search experiences<div className="procedure-search-input"><AppIcon name="search"/><input type="search" value={search} placeholder="Company, title or role" maxLength={120} onChange={event=>setSearch(event.target.value)}/>{search&&<button className="search-clear" type="button" aria-label="Clear search" onClick={()=>setSearch('')}><AppIcon name="close"/></button>}</div></label><button className="text-button" disabled={!search&&!filters.year&&!filters.coverage&&!filters.outcome&&!filters.round&&filters.sort==='newest'&&(!filters.company||Boolean(companyKey))} onClick={()=>{setSearch('');setFilters({...defaults,...(companyKey?{company:companyKey}:{})});}}>Reset filters</button></div>
    <p className="procedure-note">Looking for a particular round? Pick a company or year to narrow your search.</p>
    <div className="procedure-fields"><label>Company<select aria-label="Company" value={filters.company} disabled={Boolean(companyKey)} onChange={e=>change('company',e.target.value)}><option value="">All companies</option>{companies.map(c=><option value={c.key} key={c.key}>{c.name}</option>)}</select></label><label className="procedure-year-filter">Appearance year<input aria-label="Appearance year" type="number" placeholder="Any year" value={filters.year} onChange={e=>change('year',e.target.value.slice(0,4))}/></label><label>Sort<select aria-label="Sort" value={filters.sort} onChange={e=>change('sort',e.target.value)}><option value="newest">Newest</option><option value="helpful">Most helpful</option></select></label></div>
    <AdvancedFilters value={{year:filters.year,coverage:filters.coverage,outcome:filters.outcome,round:filters.round}} onApply={value=>setFilters(previous=>({...previous,...value}))}/><details className="procedure-more-filters" open={moreFilters} onToggle={event=>setMoreFilters(event.currentTarget.open)}><summary>More filters</summary><div className="procedure-fields"><label>Coverage<select aria-label="Coverage" value={filters.coverage} onChange={e=>change('coverage',e.target.value)}><option value="">Any coverage</option><option>Full</option><option>Partial</option></select></label><label>Outcome<select aria-label="Outcome" value={filters.outcome} onChange={e=>change('outcome',e.target.value)}><option value="">Any outcome</option><option>Selected</option><option>Not selected</option><option>Result pending</option></select></label><label>Round<select aria-label="Round" value={filters.round} onChange={e=>change('round',e.target.value)}><option value="">Any round</option>{roundOptions.map(round=><option key={round}>{round}</option>)}</select></label></div></details>
    <div className="procedure-actions procedure-active-filters" aria-label="Active filters">{Object.entries({...filters,search}).filter(([field,value])=>value&&field!=='sort'&&!(companyKey&&field==='company')).map(([field,value])=><button className="text-button" key={field} aria-label={`Remove ${field} filter`} onClick={()=>{if(field==='search')setSearch('');change(field as keyof typeof defaults,'');}}>{field==='company'?companies.find(company=>company.key===value)?.name||'Company':value} ×</button>)}</div>
    </div>
    {companyError && <p role="alert">{companyError}</p>}
    <div className="procedure-results-heading"><div><h2>Recruitment experiences</h2><p className="procedure-note">Experiences from your peers{state.loading?' · Updating results…':!state.error?` · ${state.rows.length} shown`:''}</p></div><span className="sync-indicator"><span aria-hidden="true"/>Automatically updated</span></div>
    {!state.loading&&!state.error&&!state.rows.length&&<div className="portal-empty experience-empty"><AppIcon name="search"/><h2>{state.more?'Still looking for an experience that fits.':'No matching experiences yet.'}</h2><p>{state.more?'Keep scrolling to see more experiences.':'Try resetting filters, or share the rounds you attended.'}</p><a href="#procedures/contribute">Contribute an experience ↗</a></div>}
    <div className="procedure-list" aria-busy={state.loading}>{companyKey ? [...groups].map(([group, posts])=><section key={group}><h3>{group}</h3><p className="procedure-note">{posts.length} loaded experiences · {posts.filter(post=>post.coverage==='Full').length} full procedures · {posts.filter(post=>post.coverage==='Partial').length} partial procedures</p>{posts.map(post=><PostCard key={post.id} post={post}/>)}</section>) : state.rows.map(post=><PostCard key={post.id} post={post}/>)}</div><PageState state={state}/><p className="procedure-note">These are personal experiences. Your recruitment rounds may be different.</p>
  </section>;
}
export function SavedExperiences() {
  const state=usePaged<{id:string;postId:string;title:string;companyName:string;appearanceYear:number;available:boolean;updated:boolean}>('saved');
  const [message,setMessage]=useState('');
  return <section><p>Your saved experiences are here whenever you need them.</p>{message&&<p className="procedure-success" role="status">{message}</p>}{!state.loading&&!state.rows.length&&!state.error&&<p>Save an experience while reading it to build your private preparation list.</p>}<div className="procedure-list">{state.rows.map(row=><article className="procedure-card has-bookmark" key={row.id}><BookmarkButton postId={row.postId} initialSaved onChange={saved=>{if(!saved){state.remove(row.id);setMessage('Bookmark removed.');}}}/><h3>{row.title}</h3><p>{row.companyName} · {row.appearanceYear}</p>{row.updated&&<p className="procedure-feedback">A newer approved revision is available.</p>}{!row.available&&<p>This experience is no longer available.</p>}<div className="procedure-actions">{row.available&&<a href={`#procedures/${row.postId}`}><AppIcon name="arrow"/>Read experience</a>}</div></article>)}</div><PageState state={state}/></section>;
}
function ReportForm({ postId, questionId, target='post' }: { postId:string;questionId?:string;target?:'post'|'question'|'answer' }) {
  const [reason,setReason]=useState('outdated'),[details,setDetails]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <details className="procedure-report"><summary>Report {target==='post'?'experience':target==='answer'?'reply':'question'}</summary><form onSubmit={e=>{e.preventDefault();setBusy(true);setMessage('');setError('');void community('report',{postId,...(questionId?{questionId}:{}),target,reason,details}).then(()=>{setMessage('Report received. An admin will review it.');notify('Report sent. An admin will review it.');}).catch(cause=>setError(procedureError(cause))).finally(()=>setBusy(false));}}><label>Reason<select value={reason} onChange={e=>setReason(e.target.value)}>{['outdated','incorrect','privacy','abuse','duplicate'].map(value=><option key={value}>{value}</option>)}</select></label><label>Details (optional)<textarea value={details} maxLength={1000} rows={3} onChange={e=>setDetails(e.target.value)}/></label><button disabled={busy}>{busy?'Sending…':'Send report'}</button>{message&&<p className="procedure-success" role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</form></details>;
}
export function PostDetail({ id }: {id:string}) {
  const {user}=useAuth(),votePending=useRef(false);
  const [post,setPost]=useState<ProcedurePost|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[myVote,setMyVote]=useState(0),[busy,setBusy]=useState(false),[shareMessage,setShareMessage]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>{setError('Connection is taking longer than expected. Reconnecting automatically…');setLoading(false);},15000);const stop=onSnapshot(doc(getFirebase().db,'procedurePosts',id),snap=>{clearTimeout(timer);setError('');setPost(snap.exists()?{...snap.data(),id} as ProcedurePost:null);setLoading(false);},cause=>{clearTimeout(timer);setPost(null);setError((cause as {code?:string}).code?.includes('permission-denied')?'This experience is unavailable or has been unpublished.':procedureError(cause));setLoading(false);});return()=>{clearTimeout(timer);stop();};},[id]);
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

  if(loading)return <FetchLoader label="Loading experience…"/>;
  if(!post?.published)return <section><p role="alert">{error||'This experience is unavailable or has been unpublished.'}</p><a href="#procedures">Back to experiences</a></section>;
  return <article className="procedure-card procedure-detail reader-view has-bookmark"><BookmarkButton postId={id}/><BackToExperiences><AppIcon name="back"/>All experiences</BackToExperiences><h1>{postTitle(post)}</h1><Markdown body={post.body} showMeta={false}/>
    <footer className="reader-footer"><div className="procedure-actions"><button type="button" title="Share experience" onClick={()=>void share()}><AppIcon name="share"/>Share</button><button disabled={user?.uid===post.authorUid} aria-disabled={busy||user?.uid===post.authorUid} aria-busy={busy} aria-label={`Upvote (${post.upvotes})`} title="Helpful experience" aria-pressed={myVote===1} onClick={()=>void cast(1)}><AppIcon name="up"/>{post.upvotes}</button><button disabled={user?.uid===post.authorUid} aria-disabled={busy||user?.uid===post.authorUid} aria-busy={busy} aria-label={`Downvote (${post.downvotes})`} title="Not helpful" aria-pressed={myVote===-1} onClick={()=>void cast(-1)}><AppIcon name="down"/>{post.downvotes}</button></div>{shareMessage&&<p role="status">{shareMessage}</p>}{error&&<p role="alert">{error}</p>}<details className="reader-context"><summary>About this experience</summary><p>{post.companyName} · {post.appearanceYear} · {post.coverage} procedure · {post.outcome}{post.role&&` · ${post.role}`}</p><p>By {post.authorName}. Experiences are self-reported; future recruitment rounds may differ.</p><a href={`#procedures/company?company=${post.companyKey}`}>More from {post.companyName}<AppIcon name="arrow"/></a></details><ReportForm postId={id}/></footer></article>;
}
