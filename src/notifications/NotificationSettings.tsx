import { FetchLoader } from '../ui/FetchLoader';
import { useEffect, useId, useRef, useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import { community } from '../community/community-api';
import { procedureCompanies, procedureError } from '../procedures/procedures-api';
import { useNotifications } from './notification-store';
import type { NotificationSettings as Settings } from '../../shared/notifications';

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

export function NotificationSettings({ standalone = false }: { standalone?: boolean }) {
  const requested = new URLSearchParams(location.hash.split('?')[1]).get('preferences') === '1';
  const [opened, setOpened] = useState(requested);
  const preferences=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{if(requested&&preferences.current){preferences.current.open=true;setOpened(true);preferences.current.scrollIntoView({block:'start'});}},[requested]);
  if (standalone) return <section id="notification-preferences" className="notification-settings settings-workspace" aria-label="Notification preferences"><SettingsBody/></section>;
  return <details ref={preferences} id="notification-preferences" className="notification-settings procedure-card" onToggle={event => { if (event.currentTarget.open) setOpened(true); }}><summary>Notification preferences and following</summary>{opened && <SettingsBody/>}</details>;
}
function SettingsBody() {
  const [settings, setSettings] = useState<Settings | null>(null), [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [options, setOptions] = useState<{ key: string; name: string }[]>([]), [selection, setSelection] = useState('');
  const { changed } = useNotifications(), [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  const updatesId = useId();
  useEffect(() => { let current = true; mounted.current = true; void community<Settings>('notificationSettings').then(value => { if (current) { setSettings(value); setError(''); } }).catch(cause => { if (current) setError(procedureError(cause)); }); void procedureCompanies().then(value => { if (current) setOptions(value); }).catch(() => { if (current) setError('Company choices could not load. Retry preferences, or follow an available batch.'); }); return () => { current = false; mounted.current = false; }; }, [attempt]);
  async function save(next: Settings) {
    const previous = settings;
    setSettings(next);
    setBusy(true); setError(''); setMessage('');
    try { const value = await community<Settings>('saveNotificationSettings', next); if (mounted.current) { setSettings(value); setMessage('Notification settings saved.'); changed(); } }
    catch (cause) { if (mounted.current) { setSettings(previous); setError(procedureError(cause)); } } finally { if (mounted.current) setBusy(false); }
  }
  async function cleanup() {
    setBusy(true); setError('');
    try { const value = await community<{ removed: number; more: boolean }>('cleanupNotifications'); if (mounted.current) { setMessage(`${value.removed} read discovery updates older than 90 days removed.${value.more ? ' Run again to remove the next batch.' : ''}`); changed(); } }
    catch (cause) { if (mounted.current) setError(procedureError(cause)); } finally { if (mounted.current) setBusy(false); }
  }
  return <div className="settings-body">{error && <p className="settings-feedback" role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>Retry preferences</button></p>}{message && <p className="settings-feedback" role="status">{message}</p>}{settings ? <>
    <section className="settings-panel">
      <div className="settings-toggle-row"><div><h2 id={updatesId}>Followed updates</h2><p>New activity from companies, experiences and batches you follow.</p></div><label className="settings-switch"><input type="checkbox" role="switch" aria-labelledby={updatesId} checked={settings.discovery} aria-busy={busy} disabled={busy} onChange={event => void save({ ...settings, discovery: event.target.checked })}/><span aria-hidden="true"/></label></div>
      <p className="settings-history-note"><AppIcon name="check"/>Review decisions and report outcomes stay in your private history.</p>
    </section>
    <section className="settings-panel" aria-labelledby="following-title">
      <div className="settings-panel-heading"><div><h2 id="following-title">Following</h2><p>Choose the companies and batches you want to hear about.</p></div><span className="settings-count">{settings.following.length} / 20</span></div>
      <div className="settings-follow-form"><label>Follow a company or batch<select value={selection} aria-busy={busy} disabled={busy} onChange={event => setSelection(event.target.value)}><option value="">Choose one to follow</option><optgroup label="Placement batches">{[2025, 2026].map(year => <option key={year} value={`batch:${year}`}>Class of {year}</option>)}</optgroup><optgroup label="Companies">{options.map(item => <option key={item.key} value={`company:${item.key}`}>{item.name}</option>)}</optgroup></select></label><button className="action-button" disabled={busy || !selection || settings.following.length >= 20} onClick={() => { const [kind, key] = selection.split(':'); const label = kind === 'batch' ? `Class of ${key}` : options.find(item => item.key === key)?.name || key; if (settings.following.some(item => item.kind === kind && item.key === key)) { setMessage('You already follow this item.'); return; } void save({ ...settings, discovery: true, following: [...settings.following, { kind: kind as 'company' | 'batch', key, label, muted: false, since: 0 }] }); }}>Follow updates</button></div>
      {settings.following.length ? <ul className="notification-follow-list">{settings.following.map(item => <li key={`${item.kind}:${item.key}`}><span className="settings-follow-name"><strong>{item.label}</strong><small>{item.kind === 'company' ? 'Company' : item.kind === 'batch' ? 'Batch' : 'Experience'}{item.muted ? ' · Muted' : ''}</small></span><div className="settings-row-actions"><button aria-busy={busy} disabled={busy} aria-pressed={item.muted} onClick={() => void save({ ...settings, following: settings.following.map(row => row === item ? { ...row, muted: !row.muted } : row) })}>{item.muted ? 'Unmute' : 'Mute'}</button><button aria-busy={busy} disabled={busy} aria-label={`Stop following ${item.label}`} onClick={() => void save({ ...settings, following: settings.following.filter(row => row !== item) })}>Unfollow</button></div></li>)}</ul> : <div className="settings-empty"><AppIcon name="bell"/><div><strong>No follows yet</strong><p>Choose a company or batch above to get started.</p></div></div>}
    </section>
    <details className="settings-advanced settings-panel"><summary>History &amp; update details</summary><div><p>Updates are in-app only, checked while you use the app. You’ll see publications made after you follow. Saving an experience doesn’t follow it.</p><p>Muted items remain in your following list.</p><div className="settings-cleanup"><div><h3>Clear older updates</h3><p>Remove read, optional updates older than 90 days. Review decisions and report history are kept. Up to 50 updates per action.</p></div><button aria-busy={busy} disabled={busy} onClick={() => void cleanup()}>Clear older updates</button></div></div></details>
  </> : !error ? <FetchLoader label="Loading preferences…"/> : null}</div>;
}
