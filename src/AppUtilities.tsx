import {useEffect,useRef,useState} from 'react';
import {AppIcon} from './AppIcon';

type Feedback={message:string;tone:'success'|'error'|'progress';key?:string};
export function notify(message:string,tone:Feedback['tone']='success',key?:string) {
  window.dispatchEvent(new CustomEvent<Feedback>('app-feedback',{detail:{message,tone,key}}));
}

export function AppUtilities() {
  const [visible,setVisible]=useState(false),[feedback,setFeedback]=useState<Feedback|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),frame=useRef(0),focusTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>{
    const scroll=()=>{if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;setVisible(window.scrollY>400);});};
    const show=(event:Event)=>{clearTimeout(timer.current);const value=(event as CustomEvent<Feedback>).detail;setFeedback(value);timer.current=setTimeout(()=>setFeedback(null),value.tone==='error'?7000:value.tone==='progress'?15000:4200);};
    scroll();window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('app-feedback',show);
    return()=>{window.removeEventListener('scroll',scroll);window.removeEventListener('app-feedback',show);cancelAnimationFrame(frame.current);frame.current=0;clearTimeout(timer.current);clearTimeout(focusTimer.current);};
  },[]);
  function top(){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const route=location.hash;
    window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});
    clearTimeout(focusTimer.current);
    focusTimer.current=setTimeout(()=>{if(location.hash===route&&window.scrollY<20&&document.activeElement===document.body){const heading=document.querySelector<HTMLElement>('main h1,main h2,main');if(heading){if(!heading.hasAttribute('tabindex'))heading.tabIndex=-1;heading.focus({preventScroll:true});}}},reduced?0:1100);
  }
  return <>{visible&&<button className="scroll-top-control" type="button" aria-label="Scroll to top" title="Back to top" onClick={top}><AppIcon name="up"/><span>Top</span></button>}
    {feedback&&<div className={`app-feedback feedback-${feedback.tone}`} role={feedback.tone==='error'?'alert':'status'} key={`${feedback.key}:${feedback.message}`}><AppIcon name={feedback.tone==='success'?'check':feedback.tone==='error'?'close':'clock'}/><span>{feedback.message}</span><button type="button" aria-label="Dismiss notification" onClick={()=>{clearTimeout(timer.current);setFeedback(null);}}><AppIcon name="close"/></button></div>}</>;
}
