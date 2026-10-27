/**
 * Lecture du corpus côté client. Le corpus est public (RLS en lecture seule) :
 * il est lu directement dans Supabase avec la clé anonyme. Sans Supabase,
 * l'application bascule sur le jeu de démonstration FICTIF.
 */
import { createClient } from '@supabase/supabase-js';
import demo from '../data/demo.json';
import type { Candidat, Mesure, Programme } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const db = url && cle ? createClient(url, cle, { auth: { persistSession: false } }) : null;

export const MODE_DEMO = !db;
export const AVERTISSEMENT_DEMO = demo.avertissement;

function verifier<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function candidats(): Promise<Candidat[]> {
  if (!db) return demo.candidats as Candidat[];
  return verifier(await db.from('pol_candidats').select('id, nom, formation, statut, site_officiel').neq('statut', 'retire'));
}

export async function candidat(id: string): Promise<{ candidat: Candidat; programmes: Programme[]; mesures: Mesure[] } | null> {
  if (!db) {
    const c = demo.candidats.find((x) => x.id === id);
    if (!c) return null;
    return {
      candidat: c as Candidat,
      programmes: demo.programmes.filter((p) => p.candidat_id === id) as Programme[],
      mesures: demo.mesures.filter((m) => m.candidat_id === id) as Mesure[],
    };
  }
  const c = verifier(await db.from('pol_candidats').select('id, nom, formation, statut, site_officiel').eq('id', id).maybeSingle());
  if (!c) return null;
  const [programmes, mesures] = await Promise.all([
    db.from('pol_programmes').select('id, candidat_id, titre, url_officielle, url_archive, nature, contexte, editeur').eq('candidat_id', id),
    db.from('pol_mesures').select('id, candidat_id, programme_id, theme_id, intitule, texte_source, page').eq('candidat_id', id).order('page'),
  ]);
  return { candidat: c as Candidat, programmes: verifier(programmes), mesures: verifier(mesures) };
}

export async function mesure(id: string): Promise<{ mesure: Mesure; candidat: Candidat; programme: Programme | null } | null> {
  if (!db) {
    const m = demo.mesures.find((x) => x.id === id);
    if (!m) return null;
    return {
      mesure: m as Mesure,
      candidat: demo.candidats.find((c) => c.id === m.candidat_id) as Candidat,
      programme: (demo.programmes.find((p) => p.id === m.programme_id) ?? null) as Programme | null,
    };
  }
  const m = verifier(await db.from('pol_mesures')
    .select('id, candidat_id, programme_id, theme_id, intitule, texte_source, page, '
      + 'candidat:pol_candidats(id, nom, formation, statut), programme:pol_programmes(id, candidat_id, titre, url_officielle, url_archive, nature, contexte, editeur)')
    .eq('id', id).maybeSingle()) as (Mesure & { candidat: Candidat; programme: Programme | null }) | null;
  if (!m) return null;
  const { candidat: c, programme, ...reste } = m;
  return { mesure: reste, candidat: c, programme };
}

export async function mesuresDuTheme(themeId: string): Promise<(Mesure & { programme?: Programme })[]> {
  if (!db) return demo.mesures.filter((m) => m.theme_id === themeId)
    .map((m) => ({ ...m, programme: demo.programmes.find((p) => p.id === m.programme_id) })) as (Mesure & { programme?: Programme })[];
  return verifier(await db.from('pol_mesures')
    .select('id, candidat_id, programme_id, theme_id, intitule, texte_source, page, '
      + 'programme:pol_programmes(id, candidat_id, titre, url_officielle, nature, contexte, editeur)')
    .eq('theme_id', themeId).order('page')) as unknown as (Mesure & { programme?: Programme })[];
}

export async function compteParTheme(): Promise<Record<string, number>> {
  const liste: { theme_id: string }[] = db
    ? verifier(await db.from('pol_mesures').select('theme_id'))
    : demo.mesures;
  return liste.reduce<Record<string, number>>((acc, m) => { acc[m.theme_id] = (acc[m.theme_id] ?? 0) + 1; return acc; }, {});
}

/** Recherche plein texte dans les mesures (barre de recherche). */
export async function rechercherMesures(q: string): Promise<(Mesure & { candidat_nom: string })[]> {
  const terme = q.trim();
  if (terme.length < 2) return [];
  if (!db) {
    const n = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const cible = n(terme);
    return demo.mesures
      .filter((m) => n(`${m.intitule} ${m.texte_source}`).includes(cible))
      .slice(0, 8)
      .map((m) => ({ ...(m as Mesure), candidat_nom: demo.candidats.find((c) => c.id === m.candidat_id)?.nom ?? '' }));
  }
  const motif = `%${terme.replace(/[%_,()]/g, ' ')}%`;
  const lignes = verifier(await db.from('pol_mesures')
    .select('id, candidat_id, programme_id, theme_id, intitule, texte_source, page, candidat:pol_candidats(nom)')
    .or(`intitule.ilike.${motif},texte_source.ilike.${motif}`).limit(8)) as unknown as (Mesure & { candidat: { nom: string } })[];
  return lignes.map(({ candidat: c, ...m }) => ({ ...m, candidat_nom: c?.nom ?? '' }));
}

export interface Chiffrage {
  id: string;
  origine: 'candidat' | 'independant';
  organisme: string;
  source_url: string;
  publie_le: string | null;
  montant_min: number | null;
  montant_max: number | null;
  sens: 'cout' | 'economie' | 'recette';
  horizon: string | null;
  methode: string | null;
}

/** Chiffrages saisis et sourcés (aucun en démonstration : rien n'est inventé). */
export async function chiffrages(mesureId: string): Promise<Chiffrage[]> {
  if (!db) return [];
  return verifier(await db.from('pol_chiffrages').select('*').eq('mesure_id', mesureId).order('origine'));
}
