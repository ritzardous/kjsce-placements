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
export function usePaged<T>(action: string, payload: Record<string, unknown> = {}, preserve = false) {
  const { user } = useAuth();
  const key = `${user?.uid}:${action}:${JSON.stringify(payload)}`;
  const initial = preserve ? cache.get(key) as (Page<T> & { scroll: number }) | undefined : undefined;
  const [rows, setRows] = useState<T[]>(initial?.rows || []), [cursor, setCursor] = useState<Cursor>(initial?.cursor || null), [more, setMore] = useState(initial?.more || false), [loading, setLoading] = useState(!initial), [error, setError] = useState('');
  const generation = useRef(0), latest = useRef({ rows, cursor, more }), currentKey = useRef(key);
  latest.current = { rows, cursor, more };
  currentKey.current = key;
  const request = useCallback(async (append = false) => {
    const token = append ? generation.current : ++generation.current;
    setLoading(true); setError('');
    try {
      const page = await community<Page<T>>(action, { ...JSON.parse(key.slice(key.indexOf('{'))), cursor: append ? latest.current.cursor : null });
      if (generation.current !== token || currentKey.current !== key) return;
      setRows(previous => append ? [...previous, ...page.rows].filter((row, i, all) => all.findIndex(item => (item as {id:string}).id === (row as {id:string}).id) === i) : page.rows);
      setCursor(page.cursor); setMore(page.more);
    } catch (cause) { if (generation.current === token && currentKey.current === key) setError(procedureError(cause)); }
    finally { if (generation.current === token && currentKey.current === key) setLoading(false); }
  }, [key, action]);
  useEffect(() => {
    const saved = preserve ? cache.get(key) as (Page<T> & {scroll:number}) | undefined : undefined;
    setRows(saved?.rows || []); setCursor(saved?.cursor || null); setMore(saved?.more || false); setError('');
    if (saved) { setLoading(false); requestAnimationFrame(() => window.scrollTo(0, saved.scroll)); }
    else void request();
    return () => { generation.current++; };
  }, [key, request, preserve]);
  return { rows, loading, more, error, refresh: () => request(), next: () => request(true), remove: (id: string) => setRows(previous => previous.filter(row => (row as {id:string}).id !== id)), rememberScroll: () => { if (preserve) cache.set(key, { ...latest.current, scroll: window.scrollY }); } };
}
export function ageLabel(time: number) { const hours = Math.max(0, Math.floor((Date.now() - time) / 3600000)); return hours < 24 ? `${hours}h waiting` : `${Math.floor(hours / 24)}d waiting`; }
export function safeStored<T>(key: string, fallback: T): T { try { return JSON.parse(sessionStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
export function storeSession(key: string, value: unknown) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsing remains usable without storage. */ } }
