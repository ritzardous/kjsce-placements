import {notify} from './AppUtilities';
import {useEffect,useRef,useState} from 'react';
import {AppIcon} from './AppIcon';
import {community,invalidatePages} from './community-api';
import {procedureError} from './procedures-api';
import {useBackgroundSync} from './background-sync';

const pendingBookmarks=new Set<string>();
export function BookmarkButton({postId,initialSaved,onChange}:{postId:string;initialSaved?:boolean;onChange?:(saved:boolean)=>void}) {
  const [saved,setSaved]=useState(initialSaved??false),[ready,setReady]=useState(initialSaved!==undefined),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const mounted=useRef(true),pending=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useBackgroundSync(async()=>{
    try {const result=await community<{saved:boolean}>('bookmarkState',{postId});if(mounted.current&&!pending.current){setSaved(result.saved);setReady(true);setError('');}return true;}
    catch{return false;}
  },120000,!ready&&Boolean(error));
  useEffect(()=>{if(initialSaved!==undefined&&!pending.current){setSaved(initialSaved);setReady(true);}},[initialSaved]);
  useEffect(()=>{
    let active=true;
    const load=()=>void community<{saved:boolean}>('bookmarkState',{postId}).then(result=>{if(active&&!pending.current){setSaved(result.saved);setReady(true);setError('');}}).catch(cause=>{if(active)setError(procedureError(cause));});
    if(initialSaved===undefined)load();
    const changed=(event:Event)=>{const value=(event as CustomEvent<{postId:string;saved:boolean}>).detail;if(value?.postId===postId&&!pending.current){setSaved(value.saved);setReady(true);}};
    window.addEventListener('bookmark-changed',changed);
    return()=>{active=false;window.removeEventListener('bookmark-changed',changed);};
  },[postId]);
  async function toggle() {
    if(pending.current||pendingBookmarks.has(postId))return;
    if(!ready){setError('Your saved list could not load yet. We will try again automatically.');return;}
    const previous=saved,next=!previous;
    pendingBookmarks.add(postId);pending.current=true;setBusy(true);setError('');setSaved(next);
    const broadcast=(value:boolean)=>window.dispatchEvent(new CustomEvent('bookmark-changed',{detail:{postId,saved:value}}));
    broadcast(next);notify(next?'Saving to your profile…':'Removing bookmark…','progress',postId);
    try {
      const result=await community<{saved:boolean}>('bookmark',{postId,saved:next});
      if(mounted.current){setSaved(result.saved);}
      invalidatePages('saved');invalidatePages('browse');broadcast(result.saved);
      notify(result.saved?'Bookmarked. Find it in Saved for prep.':'Bookmark removed.','success',postId);
      onChange?.(result.saved);
    }catch(cause){
      if(mounted.current){setSaved(previous);setError('');}
      broadcast(previous);notify('Your bookmark could not be saved. Please try again.','error',postId);
    }finally{pendingBookmarks.delete(postId);pending.current=false;if(mounted.current)setBusy(false);}
  }
  return <div className="bookmark-control"><button type="button" className="article-bookmark" aria-pressed={saved} aria-label={saved?'Remove from saved experiences':'Save for prep'} title={saved?'Remove from saved experiences':'Save for prep'} aria-busy={busy} aria-disabled={busy || !ready&&!error} data-saving={busy} onClick={()=>void toggle()}><AppIcon name="bookmark"/></button>{error&&<p role="alert">{error}</p>}</div>;
}
