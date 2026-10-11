import { useCallback, useEffect, useRef, useState } from 'react';
import { callProcedure, procedureError } from './procedures-api';
import { useAuth } from './auth';
import { useBackgroundSync } from './background-sync';
import { getFirebase } from './firebase';

export type Cursor = { id: string; values: number[] } | null;
export type Page<T> = { rows: T[]; cursor: Cursor; more: boolean; scanned?: number };
export type Notification = { id: string; title: string; message: string; submissionId: string; createdAt: number; read: boolean };
export type Question = { id: string; postId: string; body: string; authorUid: string; authorName: string; companyName: string; status: string; updatedAt: number; createdAt: number; answered: boolean; answer?: { body: string; authorUid: string; authorName: string; status: string } | null };
export type Report = { id: string; postId: string; questionId?: string; target: 'post' | 'question' | 'answer'; companyName: string; reason: string; details: string; content?: string; updatedAt: number; createdAt: number };
const pendingReads = new Map<string, Promise<unknown>>();
const readActions = new Set(['companyBrowse','browse','saved','contributions','notifications','notificationSummary','impact','preferences','timeline','bookmarkState','queue','moderationInbox','moderationOverview','reviewContext']);
export function community<T>(action: string, payload: unknown = {}): Promise<T> {
  if (!readActions.has(action)) return callProcedure<T>('procedureCommunity', { action, payload });
  const key = `${getFirebase().auth.currentUser?.uid}:${action}:${JSON.stringify(payload)}`;
  const pending = pendingReads.get(key);
  if (pending) return pending as Promise<T>;
  const request = callProcedure<T>('procedureCommunity', { action, payload }).finally(() => { if (pendingReads.get(key) === request) pendingReads.delete(key); });
  pendingReads.set(key, request);
  return request;
}
const cache = new Map<string, Page<unknown> & { scroll: number; pages?: number }>();
export function invalidatePages(action:string) { for(const key of cache.keys()) if(key.includes(`:${action}:`)||(action==='browse'&&key.includes(':companyBrowse:'))) cache.delete(key); }
function rememberPage(key:string, value:Page<unknown> & {scroll:number; pages?:number}) {
  cache.delete(key);cache.set(key,value);
  while(cache.size>40)cache.delete(cache.keys().next().value!);
}
export function usePaged<T>(action: string, payload: Record<string, unknown> = {}, preserve = false) {
  const { user } = useAuth();
  const key = `${user?.uid}:${action}:${JSON.stringify(payload)}`;
  const initial = preserve ? cache.get(key) as (Page<T> & { scroll: number; pages?: number }) | undefined : undefined;
  const [rows, setRows] = useState<T[]>(initial?.rows || []), [cursor, setCursor] = useState<Cursor>(initial?.cursor || null), [more, setMore] = useState(initial?.more || false), [loading, setLoading] = useState(!initial), [error, setError] = useState('');
  const automatic = !['queue', 'moderationInbox'].includes(action);
  const loadedPages = useRef(initial?.pages || 1);
  const previousAccount = useRef(user?.uid);
  const generation = useRef(0), latest = useRef({ rows, cursor, more }), currentKey = useRef(key), resolvedKey=useRef(initial?key:''), inFlight=useRef<string|null>(null);
  latest.current = { rows, cursor, more };
  currentKey.current = key;
  const request = useCallback(async (append = false, quiet = false): Promise<boolean> => {
    if (inFlight.current === key) return true;
    const token = append ? generation.current : ++generation.current;
    inFlight.current = key;
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const parameters = JSON.parse(key.slice(key.indexOf('{')));
      let page = await community<Page<T>>(action, { ...parameters, cursor: append ? latest.current.cursor : null });
      let nextRows = append ? [...latest.current.rows, ...page.rows] : page.rows;
      let pages = append ? loadedPages.current + 1 : 1;
      // Refresh the window the reader has already opened; never drop older visible items.
      if (quiet && !append) {
        while (page.more && pages < loadedPages.current) {
          if (generation.current !== token || currentKey.current !== key) return false;
          page = await community<Page<T>>(action, { ...parameters, cursor: page.cursor });
          nextRows = [...nextRows, ...page.rows]; pages++;
        }
      }
      if (generation.current !== token || currentKey.current !== key) return false;
      nextRows = [...new Map(nextRows.map(row => [(row as {id:string}).id, row])).values()];
      loadedPages.current = pages;
      resolvedKey.current = key;
      if (preserve) rememberPage(key, { ...page, rows: nextRows, pages, scroll: cache.get(key)?.scroll || 0 });
      latest.current = { rows: nextRows, cursor: page.cursor, more: page.more };
      setRows(nextRows); setCursor(page.cursor); setMore(page.more); setError('');
      return true;
    } catch (cause) {
      if (generation.current === token && currentKey.current === key && (!quiet || !latest.current.rows.length)) setError(procedureError(cause));
      return false;
    } finally {
      if (generation.current === token && currentKey.current === key) { setLoading(false); inFlight.current = null; }
    }
  }, [key, action, preserve]);
  useBackgroundSync(() => request(false, true), action === 'notifications' ? 60000 : Math.min(300000, 120000 * loadedPages.current), automatic);
  useEffect(() => {
    const saved = preserve ? cache.get(key) as (Page<T> & {scroll:number; pages?:number}) | undefined : undefined;
    inFlight.current = null; loadedPages.current = saved?.pages || 1;
    latest.current = { rows: saved?.rows || [], cursor: saved?.cursor || null, more: saved?.more || false };
    const retainBrowse=action==='browse'&&previousAccount.current===user?.uid;previousAccount.current=user?.uid;
    setRows(previous=>saved?.rows || (retainBrowse?previous:[])); setCursor(saved?.cursor || null); setMore(saved?.more || false); setError('');
    if (saved) { resolvedKey.current=key;setLoading(false); requestAnimationFrame(() => window.scrollTo(0, saved.scroll)); void request(false, true); }
    else void request();
    return () => { generation.current++; };
  }, [key, request, preserve]);
  useEffect(()=>{if(!preserve)return;const scroll=()=>{if(resolvedKey.current===key&&currentKey.current===key)rememberPage(key,{...latest.current,pages:loadedPages.current,scroll:window.scrollY});};window.addEventListener('scroll',scroll,{passive:true});return()=>window.removeEventListener('scroll',scroll);},[key,preserve]);
  function editRows(transform:(rows:T[])=>T[]){setRows(previous=>{const next=transform(previous),saved=cache.get(key);if(preserve&&saved)rememberPage(key,{...saved,rows:next});return next;});}
  return { rows, loading, more, error, automatic, update: (id:string, values:Partial<T>) => editRows(previous=>previous.map(row=>(row as {id:string}).id===id?{...row,...values}:row)), refresh: () => request(), next: () => request(true), remove: (id: string) => editRows(previous => previous.filter(row => (row as {id:string}).id !== id)), rememberScroll: () => { if (preserve) rememberPage(key, { ...latest.current, pages: loadedPages.current, scroll: window.scrollY }); } };
}
export function ageLabel(time: number) { const hours = Math.max(0, Math.floor((Date.now() - time) / 3600000)); return hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`; }
export function safeStored<T>(key: string, fallback: T): T { try { return JSON.parse(sessionStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
export function storeSession(key: string, value: unknown) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsing remains usable without storage. */ } }
