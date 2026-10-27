/**
 * POST /api/faisabilite  { mesureId }
 *
 * Analyse juridique SOURCÉE d'une mesure : quel texte faudrait-il adopter,
 * selon quelle procédure, et quels obstacles connus (Constitution, droit de
 * l'Union, Convention européenne des droits de l'homme) ?
 *
 * Sources, dans cet ordre :
 *  1. le référentiel commun (Constitution, DDHC, Préambule de 1946, CEDH,
 *     traités européens), identique pour toutes les mesures ;
 *  2. une recherche restreinte aux sites juridiques officiels.
 *
 * Tout obstacle doit renvoyer à une source fournie. Un obstacle sans source
 * valide est écarté de la liste et signalé : il ne peut pas être affiché
 * comme un fait.
 */
import { cors } from './_lib/cors.js';
import { garder } from './_lib/garde.js';
import { appelerModele } from './_lib/modele.js';
import { rechercher } from './_lib/recherche.js';
import { verifierChiffres } from './_lib/verifier.js';
import { detecterLexiqueCharge } from './_lib/neutralite.js';
import { lireMesure, lireAnalyse, enregistrerAnalyse } from './_lib/corpus.js';
import { REFERENTIEL, DOMAINES_JURIDIQUES } from './_lib/referentiel-juridique.js';

export const VERSION_FAISABILITE = 'faisabilite-2027.1';

const VEHICULES = ['reglement', 'loi_ordinaire', 'loi_organique', 'revision_constitutionnelle', 'droit_ue', 'traite_international', 'inconnu'];
const VERDICTS = ['realisable_en_l_etat', 'realisable_sous_conditions', 'obstacle_majeur', 'inconcluant'];
const NIVEAUX = ['constitution', 'droit_ue', 'cedh', 'traite', 'loi_organique', 'finances_publiques', 'collectivites', 'autre'];
const GRAVITES = ['faible', 'moyenne', 'forte'];
const CONFIANCES = ['speculatif', 'faible', 'plausible', 'eleve'];

const SYSTEME = `Tu es l'analyste juridique documentaire de Challenger Politique. Tu évalues la FAISABILITÉ JURIDIQUE d'une mesure de programme présidentiel français, à partir des SOURCES numérotées fournies.

RÈGLES :
- Tu décris l'état du droit ; tu ne juges pas l'opportunité politique de la mesure. Aucun qualificatif évaluatif.
- Chaque obstacle et chaque précédent cite au moins une source par son numéro. Tu n'inventes ni article, ni décision, ni jurisprudence : si tu ne peux pas sourcer, tu le mets dans « limites ».
- DEUX FAUTES SYMÉTRIQUES : présenter comme bloquant un obstacle incertain ; et présenter comme simple une mesure qui heurte un texte clair. En cas de doute réel, verdict « inconcluant ».
- Une mesure peut être juridiquement réalisable mais exiger une procédure lourde (révision constitutionnelle, renégociation d'un traité) : c'est « realisable_sous_conditions », et les conditions sont décrites dans « etapes ».
- Langage clair, compréhensible sans formation juridique.

Réponds UNIQUEMENT par un objet JSON :
{
  "verdict": "${VERDICTS.join('|')}",
  "vehicule": "${VEHICULES.join('|')}",
  "resume": "2 phrases maximum",
  "etapes": [ { "etape": "ex. Projet de loi", "acteur": "qui agit", "detail": "ce qui se passe, majorité requise, délais" } ],
  "obstacles": [ { "niveau": "${NIVEAUX.join('|')}", "description": "...", "gravite": "${GRAVITES.join('|')}", "sources": [1] } ],
  "precedents": [ { "description": "décision, loi ou situation comparable", "sources": [2] } ],
  "confiance": "${CONFIANCES.join('|')}",
  "limites": "ce que l'analyse ne permet pas de conclure"
}
2 à 5 étapes ; 0 à 4 obstacles ; 0 à 3 précédents.`;

function lireJson(texte) {
  const brut = texte.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try { return JSON.parse(brut); } catch { /* suite */ }
  const m = brut.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}
const chaine = (v) => (typeof v === 'string' ? v.trim() : '');
const liste = (v) => (Array.isArray(v) ? v : []);
const choix = (v, valeurs, defaut) => (valeurs.includes(v) ? v : defaut);

function normaliser(a, nbSources) {
  const valides = (ns) => liste(ns).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= nbSources);
  const ecartes = [];
  const obstacles = liste(a?.obstacles).slice(0, 4).map((o) => ({
    niveau: choix(o?.niveau, NIVEAUX, 'autre'), description: chaine(o?.description),
    gravite: choix(o?.gravite, GRAVITES, 'moyenne'), sources: valides(o?.sources),
  })).filter((o) => {
    if (!o.description) return false;
    if (o.sources.length === 0) { ecartes.push(o.description); return false; }
    return true;
  });
  const precedents = liste(a?.precedents).slice(0, 3).map((p) => ({
    description: chaine(p?.description), sources: valides(p?.sources),
  })).filter((p) => p.description && p.sources.length > 0);
  return {
    analyse: {
      verdict: choix(a?.verdict, VERDICTS, 'inconcluant'),
      vehicule: choix(a?.vehicule, VEHICULES, 'inconnu'),
      resume: chaine(a?.resume),
      etapes: liste(a?.etapes).slice(0, 5).map((e) => ({
        etape: chaine(e?.etape), acteur: chaine(e?.acteur), detail: chaine(e?.detail),
      })).filter((e) => e.etape),
      obstacles, precedents,
      confiance: choix(a?.confiance, CONFIANCES, 'faible'),
      limites: chaine(a?.limites),
    },
    ecartes,
  };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'methode_non_autorisee' });

  const mesureId = String(req.body?.mesureId ?? '').trim();
  if (!mesureId || mesureId.length > 64) return res.status(400).json({ erreur: 'parametre_invalide', message: 'mesureId requis.' });

  try {
    const mesure = await lireMesure(mesureId);
    if (!mesure) return res.status(404).json({ erreur: 'mesure_inconnue' });

    const enCache = await lireAnalyse(mesureId, VERSION_FAISABILITE);
    if (enCache) return res.status(200).json({ ...enCache.contenu, controles: enCache.controles, cache: true });

    const garde = await garder(req, Number(process.env.POL_COUT_FAISABILITE ?? 2));
    if (!garde.ok) return res.status(garde.statut).json(garde.corps);

    // Deux recherches ciblées : droit interne, puis droit européen.
    const [interne, europe] = await Promise.all([
      rechercher(`${mesure.intitule} constitutionnalité loi`, { domaines: DOMAINES_JURIDIQUES }),
      rechercher(`${mesure.intitule} droit de l'Union européenne`, { domaines: DOMAINES_JURIDIQUES }),
    ]);
    const vues = new Set();
    const trouvees = [...interne.sources, ...europe.sources]
      .filter((s) => (vues.has(s.url) ? false : vues.add(s.url)))
      .slice(0, 6);

    const sources = [
      ...REFERENTIEL.map((r) => ({ ...r, type: 'referentiel' })),
      ...trouvees.map((s) => ({ titre: s.titre, url: s.url, extrait: s.extrait, type: 'recherche' })),
    ].map((s, i) => ({ ...s, n: i + 1 }));

    const contexte = sources.map((s) => `[${s.n}] ${s.titre} — ${s.url}\n${s.extrait}`).join('\n\n');
    const r = await appelerModele({
      systeme: SYSTEME,
      utilisateur: `MESURE (${mesure.candidat?.nom ?? mesure.candidat_id}) : « ${mesure.texte_source} »\n\nSOURCES :\n\n${contexte}`,
      modele: 'mistral-large-latest', temperature: 0.1, json: true,
    });
    if (!r.ok) return res.status(r.statut ?? 502).json({ erreur: 'modele', message: r.message });

    const brut = lireJson(r.texte);
    if (!brut) return res.status(502).json({ erreur: 'modele', message: 'Réponse du modèle illisible.' });
    const { analyse, ecartes } = normaliser(brut, sources.length);

    const texte = [analyse.resume, analyse.limites, ...analyse.etapes.map((e) => e.detail),
      ...analyse.obstacles.map((o) => o.description), ...analyse.precedents.map((p) => p.description)].join('\n');
    const lexique = detecterLexiqueCharge(texte);
    const chiffres = verifierChiffres(texte, sources.length);
    const controles = {
      conforme: lexique.conforme && ecartes.length === 0 && chiffres.fantomes.length === 0,
      atteintes: [
        ...(lexique.conforme ? [] : ['lexique_evaluatif']),
        ...(ecartes.length ? ['obstacle_non_source'] : []),
        ...(chiffres.fantomes.length ? ['citation_fantome'] : []),
      ],
      termes_evaluatifs: lexique.termes,
      obstacles_ecartes: ecartes,
      recherche: interne.panne ?? europe.panne ?? null,
    };

    // Seules les sources effectivement citées sont renvoyées au lecteur.
    const citees = new Set([...analyse.obstacles, ...analyse.precedents].flatMap((x) => x.sources));
    const contenu = { ...analyse, sources: sources.filter((s) => citees.has(s.n)).map(({ n, titre, url, type }) => ({ n, titre, url, type })) };

    await enregistrerAnalyse(mesureId, VERSION_FAISABILITE, { contenu, controles, modele: r.modele ?? 'mistral-large-latest' });
    return res.status(200).json({ ...contenu, controles, cache: false });
  } catch (e) {
    console.error('[api/faisabilite]', e?.message ?? e);
    return res.status(500).json({ erreur: 'erreur_interne', message: 'Analyse juridique impossible.' });
  }
}
