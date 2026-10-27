import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession, messageErreurAuth } from '../lib/auth';
import { Conteneur, Erreur } from '../components/ui';

export default function ConnexionPage() {
  const { utilisateur, actif, viaGoogle, viaEmail, inscription, reinitialiser } = useSession();
  const [params] = useSearchParams();
  const naviguer = useNavigate();
  const retour = params.get('retour')?.startsWith('/') ? params.get('retour')! : '/';
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [info, setInfo] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => { if (utilisateur) naviguer(retour, { replace: true }); }, [utilisateur, retour, naviguer]);

  const tenter = async (action: () => Promise<void>) => {
    setErreur(''); setInfo(''); setOccupe(true);
    try { await action(); } catch (e) { setErreur(messageErreurAuth(e)); } finally { setOccupe(false); }
  };
  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    tenter(() => (mode === 'connexion' ? viaEmail(email, mdp) : inscription(email, mdp)));
  };

  if (!actif) {
    return <Conteneur etroit><div className="py-20"><Erreur message="L'authentification n'est pas configurée (variables VITE_FIREBASE_* manquantes)." /></div></Conteneur>;
  }

  const champ = 'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 outline-none focus:border-ink-3';

  return (
    <Conteneur etroit>
      <div className="mx-auto max-w-sm py-16">
        <h1 className="text-3xl font-bold tracking-tight">{mode === 'connexion' ? 'Se connecter' : 'Créer un compte'}</h1>
        <p className="mt-2 text-ink-2">
          Avec votre compte <strong className="font-medium text-ink">Challenger</strong> : pas besoin de vous réinscrire.
        </p>

        <button onClick={() => tenter(viaGoogle)} disabled={occupe}
          className="mt-8 w-full flex items-center justify-center gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 font-medium hover:border-ink-3 disabled:opacity-50">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Continuer avec Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-ink-3"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>

        <form onSubmit={soumettre} className="space-y-3">
          <label className="block">
            <span className="text-sm text-ink-2">Email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1 ${champ}`} />
          </label>
          <label className="block">
            <span className="text-sm text-ink-2">Mot de passe</span>
            <input type="password" required minLength={6} autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
              value={mdp} onChange={(e) => setMdp(e.target.value)} className={`mt-1 ${champ}`} />
          </label>
          {erreur && <Erreur message={erreur} />}
          {info && <p className="text-sm text-ink-2" role="status">{info}</p>}
          <button type="submit" disabled={occupe} className="w-full rounded-lg bg-pill text-pill-ink px-4 py-2.5 font-medium hover:opacity-90 disabled:opacity-50">
            {mode === 'connexion' ? 'Se connecter' : 'Créer mon compte Challenger'}
          </button>
        </form>

        <div className="mt-6 flex justify-between text-sm">
          <button onClick={() => setMode(mode === 'connexion' ? 'inscription' : 'connexion')} className="text-accent hover:underline">
            {mode === 'connexion' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
          </button>
          {mode === 'connexion' && (
            <button onClick={() => (email ? tenter(async () => { await reinitialiser(email); setInfo('Email de réinitialisation envoyé.'); }) : setErreur('Saisissez votre email.'))}
              className="text-ink-3 hover:text-ink">Mot de passe oublié</button>
          )}
        </div>
      </div>
    </Conteneur>
  );
}
