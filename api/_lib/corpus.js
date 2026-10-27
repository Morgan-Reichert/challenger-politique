/**
 * Accès au corpus (programmes, mesures, analyses).
 *
 * Deux sources interchangeables :
 *  - Supabase (production) : tables pol_*, recherche vectorielle pgvector ;
 *  - le jeu de démonstration FICTIF (src/data/demo.json), utilisé tant que
 *    Supabase n'est pas configuré côté serveur. Il permet de faire tourner
 *    l'application de bout en bout avec la seule clé Mistral.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { embeddings } from './modele.js';

let _client = null;
let _demo = null;

function supabase() {
  if (_client) return _client;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

function demo() {
  if (!_demo) {
    _demo = JSON.parse(readFileSync(join(process.cwd(), 'src/data/demo.json'), 'utf8'));
  }
  return _demo;
}

export function modeDemo() {
  return !supabase();
}

/* ─── Lecture ─────────────────────────────────────────────────────────────── */

export async function lireMesure(id) {
  const db = supabase();
  if (!db) {
    const d = demo();
    const m = d.mesures.find((x) => x.id === id);
    if (!m) return null;
    return { ...m, candidat: d.candidats.find((c) => c.id === m.candidat_id),
             programme: d.programmes.find((p) => p.id === m.programme_id) };
  }
  const { data, error } = await db
    .from('pol_mesures')
    .select('id, candidat_id, programme_id, theme_id, intitule, texte_source, page, '
          + 'candidat:pol_candidats(id, nom, formation), '
          + 'programme:pol_programmes(id, titre, url_officielle, url_archive)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function lireCandidats() {
  const db = supabase();
  if (!db) return demo().candidats;
  const { data, error } = await db.from('pol_candidats').select('id, nom, formation, statut')
    .neq('statut', 'retire');
  if (error) throw new Error(error.message);
  return data;
}

/* ─── Cache d'analyses ────────────────────────────────────────────────────── */

export async function lireAnalyse(mesureId, versionGrille) {
  const db = supabase();
  if (!db) {
    // Le jeu de démonstration ne contient que des analyses de la grille
    // générale ; les autres types (faisabilité…) sont toujours générés.
    if (versionGrille.startsWith('faisabilite')) return null;
    const a = demo().analyses[mesureId];
    return a ? { contenu: a, controles: { conforme: true, atteintes: [] }, modele: 'demo' } : null;
  }
  const { data, error } = await db.from('pol_analyses')
    .select('contenu, controles, modele, genere_le')
    .eq('mesure_id', mesureId).eq('version_grille', versionGrille)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function enregistrerAnalyse(mesureId, versionGrille, { contenu, controles, modele }) {
  const db = supabase();
  if (!db) return; // en démo, rien n'est persisté
  const { error } = await db.from('pol_analyses').upsert({
    mesure_id: mesureId, version_grille: versionGrille, contenu, controles, modele,
  });
  if (error) console.error('[corpus] enregistrement analyse :', error.message);
}

/* ─── Recherche ───────────────────────────────────────────────────────────── */

export async function embedding(textes) {
  return embeddings(textes, { requete: true });
}

/** Score lexical rudimentaire, pour le mode démo uniquement. */
function scoreLexical(question, mesure) {
  const norme = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mots = new Set(norme(question).split(/\W+/).filter((m) => m.length > 3));
  const cible = norme(`${mesure.intitule} ${mesure.texte_source} ${mesure.theme_id}`);
  let s = 0;
  for (const m of mots) if (cible.includes(m.slice(0, 6))) s += 1;
  return s;
}

/**
 * Recherche les extraits pertinents.
 *
 * SYMÉTRIE : sans candidat ciblé, on prend le même nombre d'extraits pour
 * CHAQUE candidat, plutôt que les N meilleurs toutes candidatures confondues.
 * Sinon, un programme plus long ou plus verbeux serait mécaniquement
 * surreprésenté dans les réponses comparatives.
 */
export async function rechercherExtraits(question, { candidatId = null, parCandidat = 3 } = {}) {
  const candidats = candidatId ? [{ id: candidatId }] : await lireCandidats();
  const limite = candidatId ? 8 : parCandidat;
  const db = supabase();

  if (!db) {
    const d = demo();
    return candidats.flatMap((c) => d.mesures
      .filter((m) => m.candidat_id === c.id)
      .map((m) => ({ ...m, score: scoreLexical(question, m) }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limite));
  }

  const [vecteur] = await embedding([question]);
  const resultats = await Promise.all(candidats.map(async (c) => {
    const { data, error } = await db.rpc('pol_rechercher_mesures', {
      p_embedding: vecteur, p_candidat_id: c.id, p_limite: limite,
    });
    if (error) throw new Error(error.message);
    // Seuil de pertinence : mieux vaut « rien trouvé » qu'un extrait hors sujet.
    return (data ?? []).filter((m) => m.similarite > 0.72);
  }));
  return resultats.flat();
}
