import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Candidat, Niveau } from '../lib/types';

/** Monogramme neutre : mêmes formes, même couleur pour tous les candidats. */
export function Monogramme({ nom, taille = 44 }: { nom: string; taille?: number }) {
  const mots = nom.replace(/·\S*/g, '').split(/\s+/).filter(Boolean);
  const initiales = (mots.length > 1 ? mots[0][0] + mots[mots.length - 1][0] : (mots[0] ?? '?').slice(0, 2)).toUpperCase();
  return (
    <span aria-hidden className="inline-flex items-center justify-center rounded-2xl bg-surface-solid border border-line shadow-sm font-semibold text-ink-2 shrink-0"
      style={{ width: taille, height: taille, fontSize: taille * 0.34 }}>
      {initiales}
    </span>
  );
}

const STATUTS: Record<Candidat['statut'], string> = {
  pressenti: 'Candidature pressentie',
  declare: 'Candidature déclarée',
  officiel: 'Candidature officielle',
  retire: 'Candidature retirée',
};
export const libelleStatut = (s: Candidat['statut']) => STATUTS[s];

export function Conteneur({ children, etroit = false }: { children: ReactNode; etroit?: boolean }) {
  return <div className={etroit ? 'mx-auto max-w-3xl' : ''}>{children}</div>;
}

export function Surtitre({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-accent">{children}</p>;
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return <p className="respire text-ink-3 py-16 text-center" role="status">{texte}</p>;
}

export function Erreur({ message }: { message: string }) {
  return <p className="rounded-2xl bg-alert-soft text-alert px-4 py-3 text-sm" role="alert">{message}</p>;
}

export function Fil({ etapes }: { etapes: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-ink-3 flex flex-wrap gap-1.5">
      {etapes.map((e, i) => (
        <span key={i} className="flex gap-1.5">
          {e.to ? <Link to={e.to} className="hover:text-ink">{e.label}</Link> : <span className="text-ink-2">{e.label}</span>}
          {i < etapes.length - 1 && <span aria-hidden>/</span>}
        </span>
      ))}
    </nav>
  );
}

const NIVEAUX: Record<Niveau, { label: string; aide: string; style: string }> = {
  explicite: { label: 'Écrit dans le texte', aide: 'Figure explicitement dans la mesure.', style: 'bg-pill text-pill-ink border-transparent' },
  deduit: { label: 'Conséquence directe', aide: 'Découle juridiquement ou logiquement du texte ; la justification est donnée.', style: 'bg-pastel-lilas text-ink border-transparent' },
  hypothese: { label: 'Effet possible', aide: 'Effet plausible mais incertain, à confirmer.', style: 'bg-transparent text-ink-2 border-dashed border-ink-3' },
};

export function BadgeNiveau({ niveau }: { niveau: Niveau }) {
  const n = NIVEAUX[niveau];
  return (
    <span title={n.aide} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${n.style}`}>
      {n.label}
    </span>
  );
}

export function LegendeNiveaux() {
  return (
    <dl className="grid sm:grid-cols-3 gap-3 text-xs text-ink-2">
      {(Object.keys(NIVEAUX) as Niveau[]).map((k) => (
        <div key={k} className="flex flex-col gap-1.5">
          <dt><BadgeNiveau niveau={k} /></dt>
          <dd>{NIVEAUX[k].aide}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Carte en verre dépoli, brique de base de l'interface. */
export function Carte({ children, className = '', as: Balise = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Balise className={`verre rounded-3xl ${className}`}>{children}</Balise>;
}

export function EnTete({ surtitre, titre, children }: { surtitre: string; titre: ReactNode; children?: ReactNode }) {
  return (
    <header className="pt-4 pb-8 max-w-3xl">
      <Surtitre>{surtitre}</Surtitre>
      <h1 className="mt-3 text-3xl sm:text-[44px] font-bold tracking-tight leading-[1.1]">{titre}</h1>
      {children && <div className="mt-4 text-ink-2 text-lg leading-relaxed">{children}</div>}
    </header>
  );
}
