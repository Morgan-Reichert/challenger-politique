import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MessageCircle, Users, Columns3, ChartNoAxesCombined, ShieldCheck, BookOpen, Sparkles, ArrowUp, Shuffle,
} from 'lucide-react';
import { candidats, compteParTheme } from '../lib/corpus';
import { budgetEnsemble } from '../lib/api';
import { ordonner } from '../lib/ordre';
import { THEMES } from '../lib/themes';
import { useCharge } from '../lib/useCharge';
import { Carte, Monogramme } from '../components/ui';

const TUILES = [
  { to: '/question', label: 'Question', icone: MessageCircle, actif: true },
  { to: '/candidats', label: 'Candidats', icone: Users },
  { to: '/themes', label: 'Comparer', icone: Columns3 },
  { to: '/budget', label: 'Budget', icone: ChartNoAxesCombined },
  { to: '/methode', label: 'Méthode', icone: ShieldCheck },
  { to: '/themes/institutions', label: 'Institutions', icone: BookOpen },
];

/** Modes de question : chacun précise ce que l'on attend, sans orienter la réponse. */
const MODES = [
  { id: 'expliquer', label: 'Expliquer simplement', prefixe: 'Explique simplement : ' },
  { id: 'comparer', label: 'Comparer les candidats', prefixe: 'Compare les propositions des candidats sur : ' },
  { id: 'non-dits', label: 'Ce qui n\'est pas précisé', prefixe: 'Qu\'est-ce que les programmes ne précisent pas sur : ' },
  { id: 'definir', label: 'Définir un terme', prefixe: 'Que veut dire concrètement, dans les programmes : ' },
];

export default function Accueil() {
  const naviguer = useNavigate();
  const liste = useCharge(candidats, []);
  const comptes = useCharge(compteParTheme, []);
  const budget = useCharge(() => budgetEnsemble('PC_GDP'), []);
  const [mode, setMode] = useState<string | null>(null);
  const [texte, setTexte] = useState('');

  const envoyer = () => {
    const q = texte.trim();
    if (!q) return;
    const prefixe = MODES.find((m) => m.id === mode)?.prefixe ?? '';
    naviguer(`/question?q=${encodeURIComponent(prefixe + q)}`);
  };

  const dernier = (s?: { points: { annee: number; valeur: number }[] }) => s?.points.at(-1);
  const dette = dernier(budget.data?.dette.series[0]);
  const solde = dernier(budget.data?.solde.series[0]);
  const depenses = dernier(budget.data?.recettesDepenses.series.find((s) => s.id === 'TE'));

  return (
    <div className="space-y-6">
      <Carte className="px-5 sm:px-10 pt-12 pb-8 text-center overflow-hidden">
        <div className="sphere w-24 h-24 sm:w-28 sm:h-28 mx-auto" aria-hidden />
        <h1 className="mt-8 text-[28px] sm:text-[40px] font-bold tracking-tight leading-[1.15]">
          Présidentielle 2027<br />
          <span className="text-ink-2">Comprendre chaque mesure, avant de choisir.</span>
        </h1>

        <nav aria-label="Accès rapides" className="mt-9 grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-4xl mx-auto">
          {TUILES.map(({ to, label, icone: Icone, actif }) => (
            <Link key={to} to={to}
              className={`rounded-3xl py-5 flex flex-col items-center gap-2.5 text-[15px] transition-transform hover:-translate-y-0.5 ${actif
                ? 'bg-gradient-to-br from-pastel-bleu to-pastel-lilas shadow-sm'
                : 'bg-surface-solid/80 border border-line shadow-sm'}`}>
              <span className={`w-10 h-10 rounded-full grid place-items-center ${actif ? 'bg-pill text-pill-ink' : 'bg-surface-2 text-ink-2'}`}>
                <Icone size={19} strokeWidth={1.8} aria-hidden />
              </span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 max-w-4xl mx-auto text-left rounded-3xl bg-surface-solid border border-line shadow-sm p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-2">
            <span className="flex items-center gap-1.5"><Sparkles size={14} aria-hidden /> Réponses tirées du texte exact des programmes</span>
            <span className="text-ink-3">Aucune consigne de vote</span>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} className="mt-3 flex items-end gap-3">
            <label htmlFor="q-accueil" className="sr-only">Votre question</label>
            <textarea id="q-accueil" rows={2} value={texte} maxLength={700} onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
              placeholder="Exemple : « Que proposent les candidats sur l'âge de départ à la retraite ? »"
              className="flex-1 resize-none bg-transparent outline-none text-[17px] placeholder:text-ink-3 py-1" />
            <button type="submit" disabled={!texte.trim()} aria-label="Envoyer"
              className="pilule w-12 h-12 grid place-items-center shrink-0 disabled:opacity-30">
              <ArrowUp size={19} aria-hidden />
            </button>
          </form>
          <div className="mt-3 flex gap-2 overflow-x-auto sans-barre" role="group" aria-label="Type de réponse">
            {MODES.map((m) => (
              <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(mode === m.id ? null : m.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] border transition-colors ${mode === m.id
                  ? 'bg-pill text-pill-ink border-transparent'
                  : 'border-line text-ink-2 hover:text-ink hover:border-ink-3/50'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 max-w-4xl mx-auto text-left">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Les candidats</h2>
            <span className="flex items-center gap-1.5 text-xs text-ink-3" title="L'ordre est tiré au sort à chaque visite.">
              <Shuffle size={13} aria-hidden /> Ordre tiré au sort
            </span>
          </div>
          {liste.data?.length === 0 && <p className="text-ink-2 text-sm">Aucun programme n'a encore été intégré.</p>}
          <ul className="flex gap-4 sm:gap-6 overflow-x-auto sans-barre pb-2">
            {liste.data && ordonner(liste.data).map((c) => (
              <li key={c.id} className="shrink-0">
                <Link to={`/candidats/${c.id}`} className="group flex flex-col items-center gap-2 w-24 text-center">
                  <span className="transition-transform group-hover:-translate-y-0.5"><Monogramme nom={c.nom} taille={64} /></span>
                  <span className="text-[13px] leading-tight">{c.nom}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Carte>

      <section aria-labelledby="titre-budget">
        <div className="flex items-end justify-between gap-4 mb-3 px-1">
          <h2 id="titre-budget" className="text-xl font-bold">Les finances publiques aujourd'hui</h2>
          <Link to="/budget" className="text-sm text-accent font-medium hover:underline shrink-0">Voir l'évolution →</Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Dette publique', p: dette, fond: 'bg-pastel-lilas' },
            { label: 'Solde public', p: solde, fond: 'bg-pastel-rose' },
            { label: 'Dépenses publiques', p: depenses, fond: 'bg-pastel-bleu' },
          ].map(({ label, p, fond }) => (
            <div key={label} className={`rounded-3xl ${fond} p-5`}>
              <p className="text-sm text-ink-2">{label}</p>
              <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
                {p ? `${p.valeur.toLocaleString('fr-FR')} %` : budget.erreur ? '—' : '…'}
              </p>
              <p className="mt-1 text-xs text-ink-2">{p ? `du PIB en ${p.annee} · Eurostat` : budget.erreur ? 'Données indisponibles' : 'Chargement'}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="titre-themes">
        <h2 id="titre-themes" className="text-xl font-bold mb-3 px-1">Comparer par thème</h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {THEMES.map((t) => {
            const n = comptes.data?.[t.id] ?? 0;
            return (
              <li key={t.id}>
                <Link to={`/themes/${t.id}`}
                  className={`verre rounded-2xl flex items-center justify-between gap-3 px-5 py-4 hover:-translate-y-0.5 transition-transform ${n === 0 ? 'text-ink-3' : ''}`}>
                  <span className="font-medium">{t.nom}</span>
                  <span className="text-xs tabular-nums text-ink-3 shrink-0">{n} mesure{n > 1 ? 's' : ''}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
