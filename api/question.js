/**
 * POST /api/question  { question, candidatId? }
 *
 * Répond à une question sur les programmes, UNIQUEMENT à partir des extraits
 * du corpus. Sans candidat ciblé, la recherche prend autant d'extraits pour
 * chaque candidat (voir corpus.rechercherExtraits).
 *
 * Aucune question n'est journalisée : elle peut révéler une opinion
 * politique (RGPD art. 9).
 */
import { cors } from './_lib/cors.js';
import { garder } from './_lib/garde.js';
import { appelerModele } from './_lib/modele.js';
import { verifierChiffres } from './_lib/verifier.js';
import { detecterLexiqueCharge, estDemandeDeConsigne, REPONSE_CONSIGNE } from './_lib/neutralite.js';
import { rechercherExtraits, lireCandidats } from './_lib/corpus.js';
import { SYSTEME_QUESTION, messageQuestion } from './_lib/grille.js';

const MAX_QUESTION = 800;

/** Mélange déterministe par question : l'ordre des candidats ne favorise personne. */
function melanger(liste, graine) {
  let h = 2166136261;
  for (const c of graine) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = Math.abs(h) % (i + 1);
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'methode_non_autorisee' });

  const question = String(req.body?.question ?? '').trim();
  const candidatId = req.body?.candidatId ? String(req.body.candidatId) : null;
  if (!question || question.length > MAX_QUESTION) {
    return res.status(400).json({ erreur: 'parametre_invalide', message: `Question requise (${MAX_QUESTION} caractères max).` });
  }

  // Interception avant tout appel : réponse fixe, gratuite, identique pour tous.
  if (estDemandeDeConsigne(question)) {
    return res.status(200).json({ reponse: REPONSE_CONSIGNE, sources: [], controles: { conforme: true, atteintes: [] }, interception: 'consigne_de_vote' });
  }

  const garde = await garder(req, Number(process.env.POL_COUT_QUESTION ?? 1));
  if (!garde.ok) return res.status(garde.statut).json(garde.corps);

  try {
    const candidats = await lireCandidats();
    const noms = Object.fromEntries(candidats.map((c) => [c.id, c.nom]));
    const ordre = melanger(candidats.map((c) => c.id), question);

    const bruts = await rechercherExtraits(question, { candidatId });
    const extraits = bruts
      .sort((a, b) => ordre.indexOf(a.candidat_id) - ordre.indexOf(b.candidat_id))
      .map((e, i) => ({ ...e, n: i + 1, candidat_nom: noms[e.candidat_id] ?? e.candidat_id }));

    if (extraits.length === 0) {
      return res.status(200).json({
        reponse: 'Les programmes disponibles ne contiennent pas d\'élément sur ce point. Essayez de reformuler, ou parcourez les mesures par thème.',
        sources: [], controles: { conforme: true, atteintes: [] },
      });
    }

    const r = await appelerModele({
      systeme: SYSTEME_QUESTION,
      utilisateur: messageQuestion(question, extraits),
      modele: 'mistral-large-latest',
      temperature: 0.2,
    });
    if (!r.ok) return res.status(r.statut ?? 502).json({ erreur: 'modele', message: r.message });

    const chiffres = verifierChiffres(r.texte, extraits.length);
    const lexique = detecterLexiqueCharge(r.texte);
    const controles = {
      conforme: chiffres.conforme && lexique.conforme,
      atteintes: [
        ...(chiffres.nonCites.length ? ['chiffre_non_source'] : []),
        ...(chiffres.fantomes.length ? ['citation_fantome'] : []),
        ...(lexique.conforme ? [] : ['lexique_evaluatif']),
      ],
      termes_evaluatifs: lexique.termes,
    };

    return res.status(200).json({
      reponse: r.texte,
      sources: extraits.map(({ n, id, candidat_id, candidat_nom, intitule, page, texte_source }) =>
        ({ n, mesure_id: id, candidat_id, candidat_nom, intitule, page, texte_source })),
      controles,
    });
  } catch (e) {
    console.error('[api/question]', e?.message ?? e);
    return res.status(500).json({ erreur: 'erreur_interne', message: 'Réponse impossible.' });
  }
}
