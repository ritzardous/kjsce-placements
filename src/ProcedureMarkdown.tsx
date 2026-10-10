import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect, useId, useRef, useState } from 'react';
import { readingMinutes } from '../shared/procedures';
export function Markdown({ body, outline = false }: { body: string; outline?: boolean }) {
  let heading = 0;
  const prefix = useId().replace(/[^a-zA-Z0-9]/g, '');
  const container = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<{text:string;id:string}[]>([]);
  useEffect(()=>{setItems(Array.from(container.current?.querySelectorAll('h1,h2,h3,h4,h5,h6') || []).map(node=>({text:node.textContent || '',id:node.id})));},[body]);
  const anchor = (children: React.ReactNode, tag: 'h1'|'h2'|'h3'|'h4'|'h5'|'h6') => { const Tag = tag; return <Tag id={`${prefix}-procedure-section-${heading++}`}>{children}</Tag>; };
  return <><p className="procedure-note">{readingMinutes(body)} min read</p>{outline && items.length > 0 && <details><summary>On this page</summary><nav aria-label="Experience sections" className="procedure-outline">{items.map(item => <button key={item.id} onClick={() => (() => { const target=document.getElementById(item.id); if(!target)return; target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); })()}>{item.text}</button>)}</nav></details>}<div ref={container} className="procedure-markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{ h1: ({children}) => anchor(children,'h1'), h2: ({children}) => anchor(children,'h2'), h3: ({children}) => anchor(children,'h3'), h4: ({children}) => anchor(children,'h4'), h5: ({children}) => anchor(children,'h5'), h6: ({children}) => anchor(children,'h6'), a: ({children,href}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>, img: ({alt}) => <span>[Image: {alt || 'image'}]</span> }}>{body}</ReactMarkdown></div></>;
}
