import {useEffect,useRef,useState} from 'react';
import {AppIcon} from './AppIcon';
import {community,invalidatePages} from './community-api';
import {procedureError} from './procedures-api';
import {useBackgroundSync} from './background-sync';

export function BookmarkButton({postId,initialSaved,onChange}:{postId:string;initialSaved?:boolean;onChange?:(saved:boolean)=>void}) {
  const [saved,setSaved]=useState(initialSaved??false),[ready,setReady]=useState(initialSaved!==undefined),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useBackgroundSync(async()=>{
    try {const result=await community<{saved:boolean}>('bookmarkState',{postId});if(mounted.current){setSaved(result.saved);setReady(true);setError('');}return true;}
    catch{return false;}
  },120000,!ready&&Boolean(error));
  useEffect(()=>{if(initialSaved!==undefined){setSaved(initialSaved);setReady(true);}},[initialSaved]);
  useEffect(()=>{
    let active=true;
    const load=()=>void community<{saved:boolean}>('bookmarkState',{postId}).then(result=>{if(active){setSaved(result.saved);setReady(true);setError('');}}).catch(cause=>{if(active)setError(procedureError(cause));});
    if(initialSaved===undefined)load();
    const changed=(event:Event)=>{const value=(event as CustomEvent<{postId:string;saved:boolean}>).detail;if(value?.postId===postId){setSaved(value.saved);setReady(true);}};
    window.addEventListener('bookmark-changed',changed);
    return()=>{active=false;window.removeEventListener('bookmark-changed',changed);};
  },[postId]);
  async function toggle() {
    if(busy)return;
    if(!ready){setError('Your saved list could not load yet. We will try again automatically.');return;}
    setBusy(true);setError('');
    try {
      const result=await community<{saved:boolean}>('bookmark',{postId,saved:!saved});
      setSaved(result.saved);setMessage(result.saved?'Saved to your profile.':'Removed from your saved experiences.');
      invalidatePages('saved');invalidatePages('browse');
      window.dispatchEvent(new CustomEvent('bookmark-changed',{detail:{postId,saved:result.saved}}));
      onChange?.(result.saved);
    }catch(cause){setError(procedureError(cause));}finally{setBusy(false);}
  }
  return <div className="bookmark-control"><button type="button" className="article-bookmark" aria-pressed={saved} aria-label={saved?'Remove from saved experiences':'Save for prep'} title={saved?'Remove from saved experiences':'Save for prep'} disabled={busy || !ready&&!error} onClick={()=>void toggle()}><AppIcon name="bookmark"/></button>{message&&<span className="bookmark-feedback" role="status">{message}</span>}{error&&<p role="alert">{error}</p>}</div>;
}
