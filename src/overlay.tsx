import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
// A stable host keeps overlays mounted across page shells and inherits the shared theme.
export function overlayHost() {
  let host=document.getElementById('workspace-overlays');
  if(!host){host=document.createElement('div');host.id='workspace-overlays';host.className='portal-shell workspace-overlays';document.body.append(host);}
  return host;
}
export const popupEvent = 'workspace-popup-open';
export function DialogPortal({children}:{children:ReactNode}) {
  return createPortal(children, overlayHost());
}
export function openTaskDialog(dialog:HTMLDialogElement|null, trigger:HTMLElement) {
  if (!dialog) return;
  const returnTo=trigger.closest('[data-action-panel]')?.getAttribute('data-trigger');
  const target=returnTo?document.getElementById(returnTo):trigger;
  dialog.addEventListener('close',()=>{if(target&&document.contains(target))target.focus({preventScroll:true});},{once:true});
  window.dispatchEvent(new CustomEvent(popupEvent));
  dialog.showModal();
  const fit=()=>{const view=visualViewport;if(!view)return;dialog.style.maxHeight=Math.max(100,view.height-24)+'px';dialog.style.top=view.offsetTop+'px';};
  fit();visualViewport?.addEventListener('resize',fit);visualViewport?.addEventListener('scroll',fit);
  dialog.addEventListener('close',()=>{visualViewport?.removeEventListener('resize',fit);visualViewport?.removeEventListener('scroll',fit);},{once:true});
}
