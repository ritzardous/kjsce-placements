import { useCallback, useEffect, useRef, useState } from 'react';
import { callProcedure, procedureError } from './procedures-api';
import { useAuth } from './auth';

export type Cursor = { id: string; values: number[] } | null;
export type Page<T> = { rows: T[]; cursor: Cursor; more: boolean; scanned?: number };
export type Notification = { id: string; title: string; message: string; submissionId: string; createdAt: number; read: boolean };
export type Question = { id: string; postId: string; body: string; authorUid: string; authorName: string; companyName: string; status: string; updatedAt: number; createdAt: number; answered: boolean; answer?: { body: string; authorUid: string; authorName: string; status: string } | null };
export type Report = { id: string; postId: string; questionId?: string; target: 'post' | 'question' | 'answer'; companyName: string; reason: string; details: string; content?: string; updatedAt: number; createdAt: number };
export function community<T>(action: string, payload: unknown = {}) { return callProcedure<T>('procedureCommunity', { action, payload }); }
const cache = new Map<string, Page<unknown> & { scroll: number }>();
export function invalidatePages(action:string) { for(const key of cache.keys()) if(key.includes(`:${action}:`)) cache.delete(key); }
function rememberPage(key:string, value:Page<unknown> & {scroll:number}) {
  cache.delete(key);cache.set(key,value);
  while(cache.size>40)cache.delete(cache.keys().next().value!);
}
export function usePaged<T>(action: string, payload: Record<string, unknown> = {}, preserve = false) {
  const { user } = useAuth();
  const key = `${user?.uid}:${action}:${JSON.stringify(payload)}`;
  const initial = preserve ? cache.get(key) as (Page<T> & { scroll: number }) | undefined : undefined;
  const [rows, setRows] = useState<T[]>(initial?.rows || []), [cursor, setCursor] = useState<Cursor>(initial?.cursor || null), [more, setMore] = useState(initial?.more || false), [loading, setLoading] = useState(!initial), [error, setError] = useState('');
  const previousAccount = useRef(user?.uid);
  const generation = useRef(0), latest = useRef({ rows, cursor, more }), currentKey = useRef(key), resolvedKey=useRef(initial?key:''), inFlight=useRef<string|null>(null);
  latest.current = { rows, cursor, more };
  currentKey.current = key;
  const request = useCallback(async (append = false) => {
    if(append&&inFlight.current===key)return;
    const token = append ? generation.current : ++generation.current;
    inFlight.current=key;
    setLoading(true); setError('');
    try {
      const page = await community<Page<T>>(action, { ...JSON.parse(key.slice(key.indexOf('{'))), cursor: append ? latest.current.cursor : null });
      if (generation.current !== token || currentKey.current !== key) return;
      const nextRows=append?[...latest.current.rows,...page.rows].filter((row,i,all)=>all.findIndex(item=>(item as {id:string}).id===(row as {id:string}).id)===i):page.rows;
      resolvedKey.current=key;
      if(preserve)rememberPage(key,{...page,rows:nextRows,scroll:cache.get(key)?.scroll||0});
      setRows(nextRows);
      setCursor(page.cursor); setMore(page.more);
    } catch (cause) { if (generation.current === token && currentKey.current === key) setError(procedureError(cause)); }
    finally { if (generation.current === token && currentKey.current === key) {setLoading(false);inFlight.current=null;} }
  }, [key, action, preserve]);
  useEffect(() => {
    const saved = preserve ? cache.get(key) as (Page<T> & {scroll:number}) | undefined : undefined;
    const retainBrowse=action==='browse'&&previousAccount.current===user?.uid;previousAccount.current=user?.uid;
    setRows(previous=>saved?.rows || (retainBrowse?previous:[])); setCursor(saved?.cursor || null); setMore(saved?.more || false); setError('');
    if (saved) { resolvedKey.current=key;setLoading(false); requestAnimationFrame(() => window.scrollTo(0, saved.scroll)); }
    else void request();
    return () => { generation.current++; };
  }, [key, request, preserve]);
  useEffect(()=>{if(!preserve)return;const scroll=()=>{if(resolvedKey.current===key&&currentKey.current===key)rememberPage(key,{...latest.current,scroll:window.scrollY});};window.addEventListener('scroll',scroll,{passive:true});return()=>window.removeEventListener('scroll',scroll);},[key,preserve]);
  function editRows(transform:(rows:T[])=>T[]){setRows(previous=>{const next=transform(previous),saved=cache.get(key);if(preserve&&saved)rememberPage(key,{...saved,rows:next});return next;});}
  return { rows, loading, more, error, update: (id:string, values:Partial<T>) => editRows(previous=>previous.map(row=>(row as {id:string}).id===id?{...row,...values}:row)), refresh: () => request(), next: () => request(true), remove: (id: string) => editRows(previous => previous.filter(row => (row as {id:string}).id !== id)), rememberScroll: () => { if (preserve) rememberPage(key, { ...latest.current, scroll: window.scrollY }); } };
}
export function ageLabel(time: number) { const hours = Math.max(0, Math.floor((Date.now() - time) / 3600000)); return hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`; }
export function safeStored<T>(key: string, fallback: T): T { try { return JSON.parse(sessionStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
export function storeSession(key: string, value: unknown) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsing remains usable without storage. */ } }
