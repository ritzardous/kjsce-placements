import {useEffect,useRef} from 'react';
import {useStatisticsHref,statisticsSections} from './statistics-navigation';
import {routeHref} from './components';
export function MobileAppNav({active,statisticsHref,year,section}:{active:string;statisticsHref?:string;year?:number;section?:string}) {
 const remembered=useStatisticsHref(),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const close=()=>dialog.current?.close();window.addEventListener('hashchange',close);return()=>window.removeEventListener('hashchange',close);},[]);
 const items=[
 {key:'statistics',label:'Statistics',href:statisticsHref||remembered,path:'M4 20h16M6 16V9m6 7V4m6 12v-5'},
 {key:'procedures',label:'Experiences',href:'#procedures',path:'M4 4h6a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H4V4Zm16 0h-4a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h4V4Z'},
 {key:'account',label:'Account',href:'#account',path:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2'}
 ];
 return <><nav className="mobile-app-nav" aria-label="Quick navigation">{items.map(item=>{
 const content=<><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={item.path}/></svg><span>{item.label}</span></>;
 return item.key==='statistics'&&section?<button key={item.key} type="button" aria-current="page" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>{content}</button>:<a key={item.key} href={item.href} aria-current={active===item.key||active==='home'&&item.key==='statistics'?'page':undefined}>{content}</a>;
 })}</nav><dialog ref={dialog} className="mobile-statistics-sheet" aria-labelledby="mobile-statistics-title"><div className="mobile-sheet-heading"><h2 id="mobile-statistics-title">Class of {year}</h2><button type="button" autoFocus onClick={()=>dialog.current?.close()}>Close</button></div><nav aria-label="Statistics sections">{statisticsSections.map(([key,label])=><a key={key} href={routeHref(key,year)} aria-current={section===key?'page':undefined} onClick={()=>dialog.current?.close()}>{label}<span aria-hidden="true">→</span></a>)}</nav><a className="batch-back" href="#home" onClick={()=>dialog.current?.close()}>← Back to Home / change batch</a></dialog></>;
}
