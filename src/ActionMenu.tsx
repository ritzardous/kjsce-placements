import { useEffect, useRef, type ReactNode } from 'react';

/** A disclosure of ordinary buttons/links: native keyboard support without faux menu roles. */
export function ActionMenu({ label = 'More actions', children, className = '', trigger }: { label?: string; children: ReactNode; className?: string; trigger?: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!document.querySelector('dialog[open]') && !ref.current?.contains(event.target as Node)) ref.current?.removeAttribute('open'); };
    const route = () => ref.current?.removeAttribute('open');
    window.addEventListener('pointerdown', outside); window.addEventListener('hashchange', route);
    return () => { window.removeEventListener('pointerdown', outside); window.removeEventListener('hashchange', route); };
  }, []);
  return <details ref={ref} className={`action-disclosure ${className}`} onKeyDown={event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.stopPropagation(); ref.current?.removeAttribute('open'); ref.current?.querySelector('summary')?.focus(); }
  }}><summary aria-label={label}>{trigger || (label.startsWith('More actions for ')?'More actions':label)}<span aria-hidden="true">⌄</span></summary><div className="action-disclosure-content">{children}<button type="button" className="action-disclosure-close" onClick={()=>{ref.current?.removeAttribute('open');ref.current?.querySelector('summary')?.focus();}}>Close options</button></div></details>;
}
