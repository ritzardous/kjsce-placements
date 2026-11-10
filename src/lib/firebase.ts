import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

let services: ReturnType<typeof initializeServices> | undefined;
function initializeServices() {
  const emulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase is not configured. Follow 4amchanges.md to set the Firebase web configuration.');
  if (emulators && !projectId.startsWith('demo-')) throw new Error('Local emulators require a demo- project ID to prevent accidental production access.');
  if (import.meta.env.PROD && emulators) throw new Error('Production builds must not connect to local Firebase emulators.');
  const config: FirebaseOptions = {
    projectId,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  };
  if (!config.apiKey || !config.authDomain || !config.appId) throw new Error('Missing Firebase API key, auth domain, or app ID. See 4amchanges.md.');
  const app = getApps().find(a => a.name === '[DEFAULT]') ?? initializeApp(config);
  const db = getFirestore(app);
  const auth = getAuth(app);
  const functions = getFunctions(app, 'asia-south1');
  if (emulators) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
  return { app, db, auth, functions };
}
export function getFirebase() { return services ??= initializeServices(); }
export function firebaseMessage(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code.includes('permission-denied')) return 'Firestore denied access. Deploy firestore.rules to the correct Firebase project.';
  if (code.includes('unavailable')) return 'Firestore is unavailable. Check your connection and Firebase project setup, then try again.';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) return 'The email or password is incorrect.';
  if (code.includes('auth/email-already-in-use')) return 'This email already has an account. Sign in instead.';
  if (code.includes('auth/weak-password')) return 'Choose a password with at least 6 characters.';
  if (code.includes('auth/operation-not-allowed')) return 'Enable this sign-in provider in Firebase Authentication.';
  if (code.includes('auth/popup-blocked')) return 'Your browser blocked Google sign-in. Allow popups for this site, then try again.';
  if (code.includes('auth/account-exists-with-different-credential')) return 'This email has an existing account with another sign-in method. Contact the app owner to link Google to that account; do not create a second account.';
  if (code.includes('auth/network-request-failed')) return 'Google sign-in could not connect. Check your connection and try again.';
  if (code.includes('auth/user-disabled')) return 'This account has been disabled. Contact the app owner.';
  if (code.includes('auth/user-token-expired') || code.includes('auth/invalid-user-token')) return 'Your session has expired. Sign in with Google again.';
  if (code.includes('auth/unauthorized-domain')) return 'Add this website domain to Firebase Authentication authorized domains.';
  if (code.includes('auth/popup-closed-by-user') || code.includes('auth/cancelled-popup-request')) return 'Sign-in was cancelled. You can try again.';
  if (code.includes('auth/too-many-requests')) return 'Too many attempts. Please wait and try again.';
  if (code.includes('auth/invalid-api-key')) return 'Check the Firebase web API key in your environment configuration.';
  return error instanceof Error && !code ? error.message : 'Firebase could not complete the request. Check the setup in 4amchanges.md and try again.';
}
