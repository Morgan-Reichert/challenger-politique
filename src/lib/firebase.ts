/**
 * Authentification — MÊME projet Firebase que Challenger IA : les comptes
 * existants fonctionnent tels quels. Seul le module Auth est chargé ici ;
 * Challenger Politique ne stocke rien dans Firestore.
 */
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const FIREBASE_ACTIF = !!(config.apiKey && config.projectId);

const app = FIREBASE_ACTIF ? (getApps()[0] ?? initializeApp(config)) : null;

function creerAuth(a: NonNullable<typeof app>) {
  try {
    return initializeAuth(a, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  } catch {
    return getAuth(a);
  }
}

export const auth = app ? creerAuth(app) : null;
export const fournisseurGoogle = new GoogleAuthProvider();
