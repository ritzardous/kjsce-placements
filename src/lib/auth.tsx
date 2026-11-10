import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, onIdTokenChanged, signInWithPopup, signInWithCredential, signOut, type User } from 'firebase/auth';
import { firebaseMessage, getFirebase } from './firebase';
import { withTimeout } from './request-timeout';
import { syncGoogleProfile } from './account-profile';
import { useBackgroundSync } from './background-sync';

type AuthState = { user: User | null; ready: boolean; allowed: boolean; admin: boolean; busy: boolean; error: string; profileError: boolean; login: () => Promise<void>; logout: () => Promise<void>; betaLogin: (role: string) => Promise<void> };
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef(false);
  const [profileError,setProfileError] = useState(false);
  const profileRevision = useRef(0);
  async function syncProfile() {
    if (!user || !allowed) return;
    const revision = profileRevision.current;
    try { await syncGoogleProfile(user); if (revision === profileRevision.current) setProfileError(false); return true; }
    catch { if (revision === profileRevision.current) setProfileError(true); return false; }
  }
  useEffect(() => {
    profileRevision.current++; setProfileError(false);
    void syncProfile();
    return () => { profileRevision.current++; };
  }, [allowed,user?.uid,user?.metadata.lastSignInTime]);
  useBackgroundSync(syncProfile,120000,allowed && profileError);
  useEffect(() => {
    let revision = 0;
    let disposed = false;
    let identity: string | undefined;
    const startupTimer = setTimeout(() => { if (!disposed) { setError('Your session could not load. Check your connection and reload.'); setReady(true); } }, 15000);
    try {
      const unsubscribe = onIdTokenChanged(getFirebase().auth, current => {
        const request = ++revision;
        clearTimeout(startupTimer);
        if (identity !== current?.uid) { setReady(false); setAllowed(false); setAdmin(false); }
        identity = current?.uid; setUser(current);
        void (async () => {
          try {
            const token = current ? await withTimeout(current.getIdTokenResult()) : null;
            if (!disposed && request === revision) {
              setAllowed(token?.signInProvider === 'google.com' && token.claims.email_verified === true);
              setAdmin(token?.claims.role === 'admin');
              setReady(true); setError('');
            }
          } catch (cause) { if (!disposed && request === revision) { setError(firebaseMessage(cause)); setReady(true); } }
        })();
      }, cause => { setError(firebaseMessage(cause)); setReady(true); });
      return () => { disposed = true; revision++; clearTimeout(startupTimer); unsubscribe(); };
    } catch (cause) { setError(firebaseMessage(cause)); setReady(true); }
  }, []);
  async function act(action: () => Promise<unknown>) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError('');
    try { await action(); } catch (cause) { setError(firebaseMessage(cause)); }
    finally { operation.current = false; setBusy(false); }
  }
  const login = () => act(() => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(getFirebase().auth, provider);
  });
  const betaLogin = (role: string) => act(async () => {
    if (!import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'true' || import.meta.env.VITE_LOCAL_BETA !== 'true' || !['contributor', 'admin', 'reader'].includes(role)) throw new Error('Local beta accounts are unavailable.');
    await signInWithCredential(getFirebase().auth, GoogleAuthProvider.credential(JSON.stringify({ sub: `local-beta-${role}`, email: `${role}@local-beta.test`, email_verified: true, name: `Beta ${role}` })));
  });
  const logout = () => act(async () => {
    await signOut(getFirebase().auth);
    location.hash = '#landing';
  });
  return <AuthContext.Provider value={{ user, ready, allowed, admin, busy, error, profileError, login, logout, betaLogin }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('Authentication must be used inside AuthProvider.');
  return auth;
}
export function GoogleButton() {
  const { login, betaLogin, busy, ready } = useAuth();
  return <><button className="google-button" disabled={busy || !ready} onClick={() => void login()}><span className="google-letter" aria-hidden="true"><img src="/company-logos/google.png" width="20" height="20" alt="" /></span>{busy ? 'Signing in…' : 'Continue with Google'}<span aria-hidden="true">↗</span></button>{import.meta.env.DEV && import.meta.env.VITE_LOCAL_BETA === 'true' && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && <div className="beta-accounts"><p>Local beta - isolated test data</p>{['contributor', 'admin', 'reader'].map(role => <button key={role} disabled={busy || !ready} onClick={() => void betaLogin(role)}>Test as {role}</button>)}</div>}</>;
}
