import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { overlayHost, popupEvent } from './overlay';

/** Ordinary links/buttons in a top-layer surface, independent of scrolling cards. */
export function ActionMenu({ label = 'More actions', children, className = '', trigger }: { label?: string; children: ReactNode; className?: string; trigger?: ReactNode }) {
  const ref=useRef<HTMLDetailsElement>(null), panel=useRef<HTMLDialogElement>(null), id=useId();
  useEffect(()=>{
    const details=ref.current!, surface=panel.current!, summary=details.querySelector('summary')!;
    let frame=0;
    const close=(restore=false)=>{
      if(surface.open)surface.close();
      if(typeof surface.hidePopover==='function'&&surface.matches(':popover-open'))surface.hidePopover();
      details.open=false;summary.setAttribute('aria-expanded','false');
      if(restore)summary.focus({preventScroll:true});
    };
    const place=()=>{
      if(!details.open)return;
      const view=visualViewport, left=view?.offsetLeft||0, top=view?.offsetTop||0;
      const width=view?.width||innerWidth,height=view?.height||innerHeight,gap=12;
      const sheet=surface.dataset.sheet==='true';
      surface.classList.toggle('is-sheet',sheet);
      surface.style.maxHeight=Math.max(100,height-2*gap)+'px';
      surface.style.width=Math.min(className.includes('account-menu')?328:248,width-2*gap)+'px';
      const anchor=summary.getBoundingClientRect(),box=surface.getBoundingClientRect();
      const x=sheet?left+(width-box.width)/2:Math.max(left+gap,Math.min(anchor.right-box.width,left+width-box.width-gap));
      const below=anchor.bottom+6,above=anchor.top-box.height-6;
      const y=sheet?top+height-box.height-gap:below+box.height<=top+height-gap?below:above>=top+gap?above:Math.max(top+gap,Math.min(below,top+height-box.height-gap));
      surface.style.left=x+'px';surface.style.top=y+'px';
    };
    const toggle=()=>{
      if(!details.open){close();return;}
      window.dispatchEvent(new CustomEvent(popupEvent,{detail:id}));
      const sheet=innerWidth<=600&&(className.includes('account-menu')||surface.querySelectorAll('a,button').length>6);
      surface.dataset.sheet=String(sheet);
      if(sheet)surface.showModal();else if(typeof surface.showPopover==='function')surface.showPopover();else surface.show();
      surface.querySelector<HTMLElement>('a[href],button:not(:disabled)')?.focus({preventScroll:true});
      summary.setAttribute('aria-expanded','true');place();frame=requestAnimationFrame(place);
    };
    const outside=(event:PointerEvent)=>{if(!surface.contains(event.target as Node)&&!details.contains(event.target as Node))close();};
    const other=(event:Event)=>{if((event as CustomEvent).detail!==id)close();};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&details.open&&!document.querySelector('dialog[open]:not(.action-disclosure-content)')){event.preventDefault();close(true);}};
    const route=()=>close();
    const tab=(event:KeyboardEvent)=>{
      if(event.key!=='Tab'||surface.dataset.sheet==='true')return;
      const actions=Array.from(surface.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input,select,textarea')).filter(node=>node.getClientRects().length);
      if(event.shiftKey&&document.activeElement===actions[0]){event.preventDefault();close(true);}
      else if(!event.shiftKey&&document.activeElement===actions.at(-1)){close(true);}
    };
    const cancel=(event:Event)=>{event.preventDefault();close(true);};
    const observer=new ResizeObserver(place);observer.observe(surface);
    details.addEventListener('toggle',toggle);surface.addEventListener('cancel',cancel);surface.addEventListener('keydown',tab);
    window.addEventListener('pointerdown',outside);window.addEventListener(popupEvent,other);window.addEventListener('hashchange',route);window.addEventListener('keydown',escape);
    window.addEventListener('resize',place);window.addEventListener('scroll',place,true);visualViewport?.addEventListener('resize',place);visualViewport?.addEventListener('scroll',place);
    return()=>{observer.disconnect();cancelAnimationFrame(frame);close();details.removeEventListener('toggle',toggle);surface.removeEventListener('cancel',cancel);surface.removeEventListener('keydown',tab);window.removeEventListener('pointerdown',outside);window.removeEventListener(popupEvent,other);window.removeEventListener('hashchange',route);window.removeEventListener('keydown',escape);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);visualViewport?.removeEventListener('resize',place);visualViewport?.removeEventListener('scroll',place);};
  },[id,className]);
  return <><details ref={ref} className={`action-disclosure ${className}`}><summary id={`${id}-trigger`} aria-label={label} aria-controls={id} aria-expanded="false" aria-haspopup="dialog">{trigger || (label.startsWith('More actions for ')?'More actions':label)}<span aria-hidden="true">⌄</span></summary></details>{createPortal(<dialog id={id} ref={panel} popover="manual" data-action-panel data-trigger={`${id}-trigger`} className={`action-disclosure-content ${className.includes('account-menu')?'account-panel':''}`} aria-label={label} onClick={event=>{
    const action=(event.target as HTMLElement).closest('a,button');
    if(action&&!action.hasAttribute('disabled')&&!action.closest('.notification-follow')&&!action.hasAttribute('aria-haspopup')&&!action.hasAttribute('data-keep-open')){
      if(panel.current?.open)panel.current.close();
      if(panel.current&&typeof panel.current.hidePopover==='function'&&panel.current.matches(':popover-open'))panel.current.hidePopover();
      if(ref.current)ref.current.open=false;
    }
  }}>{children}<button type="button" className="action-sheet-close" onClick={()=>{panel.current?.close();if(panel.current?.matches(':popover-open'))panel.current.hidePopover();if(ref.current)ref.current.open=false;ref.current?.querySelector('summary')?.focus();}}>Close {className.includes('account-menu')?'account':'options'}</button></dialog>,overlayHost())}</>;
}
