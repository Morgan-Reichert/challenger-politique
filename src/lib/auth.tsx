import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, type User,
} from 'firebase/auth';
import { auth, fournisseurGoogle, FIREBASE_ACTIF } from './firebase';

interface Session {
  utilisateur: User | null;
  pret: boolean;
  actif: boolean;
  viaGoogle: () => Promise<void>;
  viaEmail: (email: string, mdp: string) => Promise<void>;
  inscription: (email: string, mdp: string) => Promise<void>;
  reinitialiser: (email: string) => Promise<void>;
  deconnexion: () => Promise<void>;
  jeton: () => Promise<string | null>;
}

const Ctx = createContext<Session | null>(null);

export function FournisseurSession({ children }: { children: ReactNode }) {
  const [utilisateur, setUtilisateur] = useState<User | null>(null);
  const [pret, setPret] = useState(!FIREBASE_ACTIF);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => {
      // Une session anonyme héritée de Challenger IA ne compte pas comme compte.
      setUtilisateur(u && !u.isAnonymous ? u : null);
      setPret(true);
    });
  }, []);

  const exiger = () => { if (!auth) throw new Error('Authentification non configurée.'); return auth; };

  const valeur: Session = {
    utilisateur, pret, actif: FIREBASE_ACTIF,
    viaGoogle: async () => { await signInWithPopup(exiger(), fournisseurGoogle); },
    viaEmail: async (e, m) => { await signInWithEmailAndPassword(exiger(), e, m); },
    inscription: async (e, m) => { await createUserWithEmailAndPassword(exiger(), e, m); },
    reinitialiser: async (e) => { await sendPasswordResetEmail(exiger(), e); },
    deconnexion: async () => { if (auth) await signOut(auth); },
    jeton: async () => (auth?.currentUser ? auth.currentUser.getIdToken() : null),
  };

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession hors de FournisseurSession');
  return s;
}

/** Traduit les codes d'erreur Firebase en messages lisibles. */
export function messageErreurAuth(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const table: Record<string, string> = {
    'auth/invalid-credential': 'Email ou mot de passe incorrect.',
    'auth/invalid-email': 'Adresse email invalide.',
    'auth/email-already-in-use': 'Un compte Challenger existe déjà avec cet email. Connectez-vous.',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
    'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
    'auth/popup-closed-by-user': 'Connexion annulée.',
    'auth/unauthorized-domain': 'Ce domaine n\'est pas autorisé dans Firebase (Authentication > Settings).',
  };
  return table[code] ?? 'La connexion a échoué. Réessayez.';
}
