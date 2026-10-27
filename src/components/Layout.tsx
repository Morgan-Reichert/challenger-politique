import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Users, Columns3, ChartNoAxesCombined, MessageCircle, ShieldCheck, LogIn, LogOut,
  Search, Menu, X, Moon, Sun, Compass, Plus, Lock,
} from 'lucide-react';
import { useSession } from '../lib/auth';
import { MODE_DEMO, AVERTISSEMENT_DEMO, rechercherMesures } from '../lib/corpus';
import { nomTheme } from '../lib/themes';

const NAV = [
  { to: '/', label: 'Accueil', icone: Home, fin: true },
  { to: '/candidats', label: 'Candidats', icone: Users },
  { to: '/themes', label: 'Comparer', icone: Columns3 },
  { to: '/budget', label: 'Budget de l\'État', icone: ChartNoAxesCombined },
  { to: '/question', label: 'Poser une question', icone: MessageCircle },
  { to: '/methode', label: 'Méthode', icone: ShieldCheck },
];

export default function Layout() {
  const { pathname } = useLocation();
  const [tiroir, setTiroir] = useState(false);
  useEffect(() => { window.scrollTo(0, 0); setTiroir(false); }, [pathname]);

  return (
    <div className="min-h-dvh">
      {MODE_DEMO && (
        <div className="bg-alert-soft text-alert text-xs px-4 py-2 text-center" role="status">
          <strong className="font-semibold">Démonstration</strong> — {AVERTISSEMENT_DEMO}
        </div>
      )}

      <div className="mx-auto max-w-[1440px] flex gap-6 p-3 sm:p-5">
        {/* Barre latérale — bureau */}
        <aside className="hidden lg:block w-[268px] shrink-0">
          <div className="sticky top-5 max-h-[calc(100dvh-2.5rem)] overflow-y-auto sans-barre">
            <Lateral />
          </div>
        </aside>

        {/* Tiroir — mobile */}
        {tiroir && (
          <div className="lg:hidden fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setTiroir(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-[290px] p-3 overflow-y-auto bg-bg">
              <Lateral onFermer={() => setTiroir(false)} />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <BarreHaute onMenu={() => setTiroir(true)} />
          <main className="mt-5">
            <Outlet />
          </main>
          <footer className="mt-16 mb-4 px-2 text-xs text-ink-3 flex flex-wrap justify-between gap-3">
            <p>Challenger Politique n'émet aucune consigne de vote et n'enregistre pas vos questions.</p>
            <p>Un outil <a href="https://qlicklab.eu" className="hover:text-ink">QlickLab</a></p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function Logo({ onMenu, ouvert }: { onMenu?: () => void; ouvert?: boolean }) {
  return (
    <div className="pilule !rounded-2xl flex items-center justify-between px-4 h-14">
      <Link to="/" className="flex items-center gap-2.5" aria-label="Accueil Challenger Politique">
        <span aria-hidden className="grid grid-cols-2 gap-[3px]">
          <span className="w-[7px] h-[7px] rounded-[2px] bg-current" />
          <span className="w-[7px] h-[7px] rounded-[2px] bg-current opacity-60" />
          <span className="w-[7px] h-[7px] rounded-[2px] bg-current opacity-60" />
          <span className="w-[7px] h-[7px] rounded-[2px] bg-current opacity-30" />
        </span>
        <span className="font-semibold tracking-tight text-[17px]">Challenger <span className="opacity-60 font-medium">Politique</span></span>
      </Link>
      {onMenu && (
        <button onClick={onMenu} aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'} className="opacity-80 hover:opacity-100">
          {ouvert ? <X size={20} /> : <Menu size={20} />}
        </button>
      )}
    </div>
  );
}

function Lateral({ onFermer }: { onFermer?: () => void }) {
  const { utilisateur, deconnexion, actif } = useSession();
  return (
    <div className="space-y-4">
      <div className="verre rounded-3xl p-2.5 space-y-2.5">
        <Logo onMenu={onFermer} ouvert={!!onFermer} />
        <div className="grid grid-cols-2 gap-2">
          <Link to="/candidats" className="rounded-2xl bg-surface-solid/70 p-3 flex flex-col gap-3 hover:bg-surface-solid transition-colors">
            <Compass size={20} className="text-ink-2" aria-hidden />
            <span className="flex items-center justify-between text-sm font-medium">Explorer <span aria-hidden className="text-ink-3">›</span></span>
          </Link>
          <Link to="/question" className="rounded-2xl border border-dashed border-ink-3/40 p-3 flex flex-col gap-3 hover:bg-surface-solid/60 transition-colors">
            <MessageCircle size={20} className="text-ink-2" aria-hidden />
            <span className="flex items-center justify-between text-sm font-medium">Demander <Plus size={14} className="text-ink-3" aria-hidden /></span>
          </Link>
        </div>
      </div>

      <nav className="verre rounded-3xl p-2.5 space-y-1.5" aria-label="Navigation principale">
        {NAV.map(({ to, label, icone: Icone, fin }) => (
          <NavLink key={to} to={to} end={fin}
            className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] transition-colors ${isActive
              ? 'bg-surface-solid font-semibold text-ink shadow-sm'
              : 'text-ink-2 hover:bg-surface-solid/60 hover:text-ink'}`}>
            <Icone size={19} strokeWidth={1.8} aria-hidden /> {label}
          </NavLink>
        ))}
        <div className="h-px bg-line mx-3 my-1" />
        {utilisateur ? (
          <button onClick={deconnexion} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-ink-2 hover:bg-surface-solid/60 hover:text-ink">
            <LogOut size={19} strokeWidth={1.8} aria-hidden /> Déconnexion
          </button>
        ) : actif ? (
          <NavLink to="/connexion" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] text-ink-2 hover:bg-surface-solid/60 hover:text-ink">
            <LogIn size={19} strokeWidth={1.8} aria-hidden /> Se connecter
          </NavLink>
        ) : null}
      </nav>

      <div className="space-y-2.5">
        <Link to="/methode" className="block rounded-2xl bg-pastel-lilas px-4 py-3.5 text-center text-sm font-medium hover:brightness-[1.03]">
          Notre charte de neutralité
        </Link>
        <p className="flex items-center justify-center gap-2 rounded-2xl bg-pastel-vert px-4 py-3.5 text-sm font-medium">
          <Lock size={14} aria-hidden /> Questions non enregistrées
        </p>
        <a href="https://qlicklab.eu" className="block rounded-2xl bg-pastel-bleu px-4 py-3.5 text-center text-sm font-medium hover:brightness-[1.03]">
          Découvrir Challenger IA
        </a>
      </div>
    </div>
  );
}

function BarreHaute({ onMenu }: { onMenu: () => void }) {
  const { utilisateur, actif } = useSession();
  const naviguer = useNavigate();
  return (
    <div className="flex items-center gap-3">
      <button onClick={onMenu} aria-label="Ouvrir le menu" className="lg:hidden verre rounded-full w-12 h-12 grid place-items-center shrink-0">
        <Menu size={20} />
      </button>
      <Recherche />
      <BasculeTheme />
      {utilisateur ? (
        <span className="verre rounded-full h-12 pl-1.5 pr-4 hidden sm:flex items-center gap-2.5 max-w-[240px]">
          <span className="w-9 h-9 rounded-full bg-pastel-lilas grid place-items-center text-sm font-semibold uppercase" aria-hidden>
            {(utilisateur.displayName ?? utilisateur.email ?? '?')[0]}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold truncate">{utilisateur.displayName ?? 'Mon compte'}</span>
            <span className="block text-[11px] text-ink-3 truncate">{utilisateur.email}</span>
          </span>
        </span>
      ) : actif ? (
        <button onClick={() => naviguer('/connexion')} className="pilule h-12 px-5 text-sm font-medium hidden sm:inline-flex items-center gap-2 shrink-0">
          <LogIn size={16} aria-hidden /> Se connecter
        </button>
      ) : null}
    </div>
  );
}

function BasculeTheme() {
  const [sombre, setSombre] = useState(() => {
    try {
      const t = localStorage.getItem('pol-theme');
      if (t) return t === 'dark';
    } catch { /* stockage indisponible */ }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = sombre ? 'dark' : 'light';
    try { localStorage.setItem('pol-theme', sombre ? 'dark' : 'light'); } catch { /* ignoré */ }
  }, [sombre]);
  return (
    <button onClick={() => setSombre(!sombre)} aria-label={sombre ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="verre rounded-full w-12 h-12 grid place-items-center shrink-0 text-ink-2 hover:text-ink">
      {sombre ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

function Recherche() {
  const [q, setQ] = useState('');
  const [resultats, setResultats] = useState<Awaited<ReturnType<typeof rechercherMesures>>>([]);
  const [ouvert, setOuvert] = useState(false);
  const naviguer = useNavigate();
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => { rechercherMesures(q).then(setResultats).catch(() => setResultats([])); }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const fermer = (e: MouseEvent) => { if (!boite.current?.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, []);

  const poser = () => { if (q.trim()) { naviguer(`/question?q=${encodeURIComponent(q.trim())}`); setOuvert(false); setQ(''); } };

  return (
    <div ref={boite} className="relative flex-1 min-w-0">
      <div className="verre rounded-full h-12 flex items-center gap-3 pl-4 pr-1.5">
        <Search size={19} className="text-ink-2 shrink-0" aria-hidden />
        <label htmlFor="recherche" className="sr-only">Rechercher une mesure</label>
        <input id="recherche" value={q} onChange={(e) => { setQ(e.target.value); setOuvert(true); }} onFocus={() => setOuvert(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') poser(); if (e.key === 'Escape') setOuvert(false); }}
          placeholder="Rechercher une mesure, un mot…" autoComplete="off"
          className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-3" />
        <button onClick={poser} className="pilule h-9 px-4 text-sm font-medium hidden sm:inline-flex items-center gap-1.5 shrink-0">
          <Plus size={14} aria-hidden /> Question
        </button>
      </div>
      {ouvert && q.trim().length >= 2 && (
        <div className="absolute z-30 left-0 right-0 mt-2 verre !bg-surface-solid rounded-3xl p-2 max-h-[60vh] overflow-y-auto">
          {resultats.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-3">Aucune mesure ne contient « {q.trim()} ».</p>
          ) : resultats.map((m) => (
            <Link key={m.id} to={`/mesures/${m.id}`} onClick={() => { setOuvert(false); setQ(''); }}
              className="block rounded-2xl px-4 py-3 hover:bg-surface-2">
              <p className="text-sm font-semibold">{m.intitule}</p>
              <p className="text-xs text-ink-3">{m.candidat_nom} · {nomTheme(m.theme_id)}</p>
            </Link>
          ))}
          <button onClick={poser} className="w-full text-left rounded-2xl px-4 py-3 text-sm text-accent font-medium hover:bg-surface-2">
            Poser la question « {q.trim()} » →
          </button>
        </div>
      )}
    </div>
  );
}
