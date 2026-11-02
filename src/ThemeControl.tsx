import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { AppIcon } from './AppIcon';
import './theme-transition.css';

type ToggleOrigin = { x: number; y: number; button: HTMLButtonElement };
const ThemeContext = createContext<{ dark: boolean; toggle: (origin: ToggleOrigin) => void }>({ dark: false, toggle: () => {} });
function preference() { try { return localStorage.getItem('placement-theme'); } catch { return null; } }
function initialTheme() { const saved = preference(); return saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme(dark: boolean) {
  const publicPage = !location.hash || /^#(?:landing|login)(?:\?|$)/.test(location.hash);
  document.documentElement.dataset.theme = dark && !publicPage ? 'dark' : 'light';
}
const slapFrames: Keyframe[] = [
  { scale: '1', rotate: '0deg', offset: 0 },
  { scale: '.82 .9', rotate: '-9deg', offset: .22 },
  { scale: '1.12 1.06', rotate: '5deg', offset: .53 },
  { scale: '.97', rotate: '-2deg', offset: .78 },
  { scale: '1', rotate: '0deg', offset: 1 },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(initialTheme);
  const intended = useRef(dark), sequence = useRef(0), active = useRef<ViewTransition | null>(null), animations = useRef<Animation[]>([]);
  useLayoutEffect(() => { applyTheme(dark); }, [dark]);
  const stop = useCallback(() => {
    sequence.current++; active.current?.skipTransition(); active.current = null;
    animations.current.forEach(animation => animation.cancel()); animations.current = [];
    document.documentElement.classList.remove('theme-transitioning');
  }, []);
  useEffect(() => {
    const route = () => { stop(); setDark(intended.current); applyTheme(intended.current); };
    const system = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => { stop(); const next = initialTheme(); intended.current = next; setDark(next); applyTheme(next); };
    const storage = (event: StorageEvent) => { if (event.key === 'placement-theme' || event.key === null) sync(); };
    const systemChanged = () => { if (!preference()) sync(); };
    window.addEventListener('hashchange', route); window.addEventListener('storage', storage); system.addEventListener('change', systemChanged);
    return () => { stop(); window.removeEventListener('hashchange', route); window.removeEventListener('storage', storage); system.removeEventListener('change', systemChanged); };
  }, [stop]);

  const toggle = useCallback(({ x, y, button }: ToggleOrigin) => {
    stop();
    const token = sequence.current, next = !intended.current;
    intended.current = next;
    try { localStorage.setItem('placement-theme', next ? 'dark' : 'light'); } catch { /* The theme still works for this visit. */ }
    const apply = () => { if (sequence.current === token) flushSync(() => { setDark(next); applyTheme(next); }); };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || typeof document.startViewTransition !== 'function') {
      apply();
      if (!reduced && button.animate) animations.current.push(button.animate(slapFrames, { duration: 380, easing: 'ease-out' }));
      return;
    }
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    // Reveal real page snapshots, including charts and images, from the clicked toggle.
    // https://developer.mozilla.org/en-US/docs/Web/API/ViewTransition/ready
    const transition = document.startViewTransition(apply);
    active.current = transition;
    void transition.ready.then(() => {
      if (sequence.current !== token) return;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      animations.current = [
        root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 540, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }),
        root.animate(slapFrames, { duration: 400, easing: 'ease-out', pseudoElement: '::view-transition-image-pair(theme-toggle)' }),
      ];
    }).catch(() => { /* Skipping a snapshot must not prevent a theme change. */ });
    void transition.finished.catch(() => {}).finally(() => {
      if (sequence.current !== token) return;
      root.classList.remove('theme-transitioning'); active.current = null; animations.current = [];
    });
  }, [stop]);
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

export function ThemeControl() {
  const { dark, toggle } = useContext(ThemeContext);
  function click(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget, box = button.getBoundingClientRect();
    toggle({ x: event.detail ? event.clientX : box.left + box.width / 2, y: event.detail ? event.clientY : box.top + box.height / 2, button });
  }
  return <button type="button" className="auth-button icon-control theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={click}><AppIcon name={dark ? 'sun' : 'moon'}/></button>;
}
