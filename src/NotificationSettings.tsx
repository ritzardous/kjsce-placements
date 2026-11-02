import { useEffect, useRef, useState } from 'react';
import { community } from './community-api';
import { procedureCompanies, procedureError } from './procedures-api';
import { useNotifications } from './notification-store';
import type { NotificationSettings as Settings } from '../shared/notifications';

export function FollowButton({ kind, itemKey, label }: { kind: 'company' | 'experience' | 'batch'; itemKey: string; label: string }) {
  const [settings, setSettings] = useState<Settings | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0);
  const { changed, revision } = useNotifications();
  const active = useRef(true);
  useEffect(() => { let current = true; active.current = true; void community<Settings>('notificationSettings').then(value => { if (current) { setSettings(value); setError(''); } }).catch(cause => { if (current) setError(procedureError(cause)); }); return () => { current = false; active.current = false; }; }, [itemKey, revision, attempt]);
  const followed = settings?.following.some(item => item.kind === kind && item.key === itemKey);
  async function toggle() {
    if (!settings) return;
    setBusy(true); setError('');
    try {
      const next = await community<Settings>('saveNotificationSettings', { ...settings, discovery: followed ? settings.discovery : true, following: followed ? settings.following.filter(item => item.kind !== kind || item.key !== itemKey) : [...settings.following, { kind, key: itemKey, label: label.slice(0, 120), muted: false, since: 0 }] });
      if (active.current) { setSettings(next); changed(); }
    } catch (cause) { if (active.current) setError(procedureError(cause)); } finally { if (active.current) setBusy(false); }
  }
  return <div className="notification-follow"><button disabled={busy || !settings} aria-pressed={Boolean(followed)} onClick={() => void toggle()}>{busy ? 'Saving…' : followed ? 'Stop following' : `Follow ${kind === 'batch' ? 'batch' : kind} updates`}</button>{error && <p role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry following</button></p>}</div>;
}

export function NotificationSettings() {
  const requested = new URLSearchParams(location.hash.split('?')[1]).get('preferences') === '1';
  const [opened, setOpened] = useState(requested);
  const preferences=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{if(requested&&preferences.current){preferences.current.open=true;setOpened(true);preferences.current.scrollIntoView({block:'start'});}},[requested]);
  return <details ref={preferences} id="notification-preferences" className="notification-settings procedure-card" onToggle={event => { if (event.currentTarget.open) setOpened(true); }}><summary>Notification preferences and following</summary>{opened && <SettingsBody/>}</details>;
}
function SettingsBody() {
  const [settings, setSettings] = useState<Settings | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [options, setOptions] = useState<{ key: string; name: string }[]>([]), [selection, setSelection] = useState('');
  const { changed } = useNotifications(), [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  useEffect(() => { let current = true; mounted.current = true; void community<Settings>('notificationSettings').then(value => { if (current) { setSettings(value); setError(''); } }).catch(cause => { if (current) setError(procedureError(cause)); }); void procedureCompanies().then(value => { if (current) setOptions(value); }).catch(() => { if (current) setError('Company choices could not load. Retry preferences, or follow an available batch.'); }); return () => { current = false; mounted.current = false; }; }, [attempt]);
  async function save(next: Settings) {
    setBusy(true); setError(''); setMessage('');
    try { const value = await community<Settings>('saveNotificationSettings', next); if (mounted.current) { setSettings(value); setMessage('Notification settings saved.'); changed(); } }
    catch (cause) { if (mounted.current) setError(procedureError(cause)); } finally { if (mounted.current) setBusy(false); }
  }
  async function cleanup() {
    setBusy(true); setError('');
    try { const value = await community<{ removed: number; more: boolean }>('cleanupNotifications'); if (mounted.current) { setMessage(`${value.removed} read discovery updates older than 90 days removed.${value.more ? ' Run again to remove the next batch.' : ''}`); changed(); } }
    catch (cause) { if (mounted.current) setError(procedureError(cause)); } finally { if (mounted.current) setBusy(false); }
  }
  return <div><p>Review decisions and report outcomes always stay in your private history. Optional updates are in-app only. Saving an experience does not follow it.</p>{error && <p role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry preferences</button></p>}{message && <p role="status">{message}</p>}{settings ? <>
    <label className="notification-checkbox"><input type="checkbox" checked={settings.discovery} aria-busy={busy} disabled={busy} onChange={event => void save({ ...settings, discovery: event.target.checked })}/>Show updates from my followed companies, experiences and batches</label>
    <div className="procedure-actions"><label>Follow a company or batch<select value={selection} aria-busy={busy} disabled={busy} onChange={event => setSelection(event.target.value)}><option value="">Choose one</option><optgroup label="Placement batches">{[2025, 2026].map(year => <option key={year} value={`batch:${year}`}>Class of {year}</option>)}</optgroup><optgroup label="Companies">{options.map(item => <option key={item.key} value={`company:${item.key}`}>{item.name}</option>)}</optgroup></select></label><button disabled={busy || !selection || settings.following.length >= 20} onClick={() => { const [kind, key] = selection.split(':'); const label = kind === 'batch' ? `Class of ${key}` : options.find(item => item.key === key)?.name || key; if (settings.following.some(item => item.kind === kind && item.key === key)) { setMessage('You already follow this item.'); return; } void save({ ...settings, discovery: true, following: [...settings.following, { kind: kind as 'company' | 'batch', key, label, muted: false, since: 0 }] }); }}>Follow updates</button></div>
    <p className="procedure-note">Up to 20 follows. Updates are checked while you use the app; only publications after following are included. Muted items stay listed here.</p>
    {settings.following.length ? <ul className="notification-follow-list">{settings.following.map(item => <li key={`${item.kind}:${item.key}`}><span>{item.label} <small>({item.kind})</small></span><button aria-busy={busy} disabled={busy} aria-pressed={item.muted} onClick={() => void save({ ...settings, following: settings.following.map(row => row === item ? { ...row, muted: !row.muted } : row) })}>{item.muted ? 'Unmute' : 'Mute'}</button><button aria-busy={busy} disabled={busy} aria-label={`Stop following ${item.label}`} onClick={() => void save({ ...settings, following: settings.following.filter(row => row !== item) })}>Stop following</button></li>)}</ul> : <p>You aren't following anything yet.</p>}
    <button aria-busy={busy} disabled={busy} onClick={() => void cleanup()}>Remove old read discovery updates</button><p className="procedure-note">Removes at most 50 optional updates older than 90 days per action. Direct decisions and moderation history are kept.</p>
  </> : <p>Loading preferences…</p>}</div>;
}
