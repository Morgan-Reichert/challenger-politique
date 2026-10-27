import type { Analyse, Controles, SourceReponse } from './types';

export class ErreurApi extends Error {
  constructor(public statut: number, public code: string, message: string) { super(message); }
}

async function appeler<T>(chemin: string, corps: unknown): Promise<T> {
  const r = await fetch(chemin, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErreurApi(r.status, data.erreur ?? 'inconnue', data.message ?? 'Une erreur est survenue.');
  return data as T;
}

export const analyser = (mesureId: string) =>
  appeler<{ analyse: Analyse; controles: Controles; version_grille: string; cache: boolean }>('/api/analyse', { mesureId });

export const poserQuestion = (question: string, candidatId?: string) =>
  appeler<{ reponse: string; sources: SourceReponse[]; controles: Controles; interception?: string }>(
    '/api/question', { question, candidatId });

export interface Faisabilite {
  verdict: 'realisable_en_l_etat' | 'realisable_sous_conditions' | 'obstacle_majeur' | 'inconcluant';
  vehicule: string;
  resume: string;
  etapes: { etape: string; acteur: string; detail: string }[];
  obstacles: { niveau: string; description: string; gravite: 'faible' | 'moyenne' | 'forte'; sources: number[] }[];
  precedents: { description: string; sources: number[] }[];
  confiance: string;
  limites: string;
  sources: { n: number; titre: string; url: string; type: 'referentiel' | 'recherche' }[];
  controles: Controles & { obstacles_ecartes?: string[] };
}

export const analyserFaisabilite = (mesureId: string) => appeler<Faisabilite>('/api/faisabilite', { mesureId });

export interface Serie { id: string; label: string; points: { annee: number; valeur: number; provisoire: boolean }[] }
export interface SourceDonnees { nom: string; jeu: string; url: string }

async function lire<T>(chemin: string): Promise<T> {
  const r = await fetch(chemin);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErreurApi(r.status, data.erreur ?? 'inconnue', data.message ?? 'Données indisponibles.');
  return data as T;
}

export type Unite = 'PC_GDP' | 'MIO_EUR';

export const budgetEnsemble = (unite: Unite) => lire<{
  unite: string;
  recettesDepenses: { series: Serie[]; source: SourceDonnees };
  solde: { series: Serie[]; source: SourceDonnees };
  dette: { series: Serie[]; source: SourceDonnees };
}>(`/api/budget?vue=ensemble&unite=${unite}`);

export const budgetTheme = (theme: string, unite: Unite) => lire<
  { indisponible: true; message: string } |
  { indisponible?: undefined; titre: string; unite: string; series: Serie[]; source: SourceDonnees; note: string }
>(`/api/budget?theme=${encodeURIComponent(theme)}&unite=${unite}`);
