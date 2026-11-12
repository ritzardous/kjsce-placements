import { useEffect, useRef, type ReactNode } from 'react';

/** Source context stays local to the current page and reading position. */
export function SourceNotes({children}: {children: ReactNode}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const element = ref.current!;
    const close = () => { element.open = false; };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !element.contains(event.target)) close();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) close();
    });
    observer.observe(element);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('hashchange', close);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('hashchange', close);
    };
  }, []);
  return <details ref={ref} className="source-notes" onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
  }}><summary>Data sources &amp; limitations</summary>{children}</details>;
}
