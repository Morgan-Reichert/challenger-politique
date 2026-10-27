/**
 * Contrôles de neutralité — déterministes, sans appel au modèle.
 *
 * Même logique que verifier.js : une consigne dans le prompt n'est pas une
 * garantie. Ce module CONSTATE ; l'appelant décide quoi faire du constat.
 * Les motifs sont volontairement simples et lisibles : n'importe qui doit
 * pouvoir auditer ce qui est considéré comme un écart.
 */

function sansAccents(t) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/* ─── 1. Lexique évaluatif ────────────────────────────────────────────────── */
// Qualificatifs qui jugent une mesure ou un candidat au lieu de la décrire.
// Valable dans les deux sens : « courageux » est aussi interdit que
// « démagogique ». Une analyse peut dire « non chiffré », pas « irréaliste ».
const LEXIQUE_CHARGE = [
  // dépréciatif
  'demagogique', 'populiste', 'irrealiste', 'irresponsable', 'dangereu',
  'extremiste', 'absurde', 'naif', 'utopique', 'liberticide',
  'catastrophique', 'scandaleu', 'inacceptable', 'archaique', 'fantaisiste',
  // laudatif
  'courageu', 'ambitieu', 'audacieu', 'visionnaire',
  'genial', 'brillant', 'salutaire', 'indispensable', 'bon sens', 'pragmatique',
];

export function detecterLexiqueCharge(texte) {
  const t = sansAccents(texte);
  const trouves = LEXIQUE_CHARGE.filter((m) => new RegExp(`\\b${m}`, 'i').test(t));
  return { conforme: trouves.length === 0, termes: trouves };
}

/* ─── 2. Consigne de vote ─────────────────────────────────────────────────── */
// Le service n'indique jamais pour qui voter, ni qui « a raison ». Ces
// demandes sont interceptées AVANT l'appel au modèle : la réponse est fixe,
// identique pour tous, et ne consomme pas de crédit.
const DEMANDE_CONSIGNE = new RegExp([
  'pour qui (?:je )?(?:dois|devrais|faut|voter|vote)',
  'qui (?:dois|devrais)[- ]je (?:voter|choisir|elire)',
  'quel(?:le)? (?:est le |est la )?(?:meilleur|meilleure) (?:candidat|candidate|programme)',
  'qui (?:va|vas) gagner', 'qui gagnera', 'qui a raison',
  'conseille[- ]moi (?:un|une) candidat',
].join('|'), 'i');

export function estDemandeDeConsigne(question) {
  return DEMANDE_CONSIGNE.test(sansAccents(question));
}

export const REPONSE_CONSIGNE = [
  "Challenger Politique ne donne pas de consigne de vote et ne désigne pas de « meilleur » candidat : ce choix vous appartient.",
  '',
  "En revanche, je peux vous aider à décider par vous-même :",
  '- **comparer** ce que proposent les candidats sur un thème qui compte pour vous ;',
  '- **expliquer** une mesure précise et ce qu\'elle implique concrètement ;',
  '- **lister** ce qu\'un programme ne précise pas (financement, calendrier…).',
  '',
  'Sur quel sujet voulez-vous commencer ?',
].join('\n');

/* ─── 3. Équilibre d'une réponse comparative ──────────────────────────────── */
// Quand plusieurs candidats sont traités, chacun doit recevoir une place
// comparable. On mesure la longueur consacrée à chacun ; un écart supérieur
// à `tolerance` est signalé (pas corrigé : un programme peut réellement être
// muet sur un sujet, et la réponse doit alors le dire, brièvement).
export function mesurerEquilibre(sections, tolerance = 2.5) {
  const longueurs = Object.fromEntries(
    Object.entries(sections).map(([k, v]) => [k, (v ?? '').length]),
  );
  const valeurs = Object.values(longueurs).filter((n) => n > 0);
  if (valeurs.length < 2) return { conforme: true, longueurs, ratio: 1 };
  const ratio = Math.max(...valeurs) / Math.min(...valeurs);
  return { conforme: ratio <= tolerance, longueurs, ratio: Math.round(ratio * 100) / 100 };
}
