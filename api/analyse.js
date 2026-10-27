/**
 * POST /api/analyse  { mesureId }
 *
 * Renvoie l'analyse d'une mesure selon la grille commune.
 *  - Analyse déjà en cache → servie gratuitement, sans authentification :
 *    tout le monde lit la même analyse.
 *  - Sinon → limite par adresse IP (garde.js), génération puis contrôles
 *    déterministes (chiffres, lexique), puis mise en cache.
 */
import { cors } from './_lib/cors.js';
import { garder } from './_lib/garde.js';
import { appelerModele } from './_lib/modele.js';
import { verifierChiffres } from './_lib/verifier.js';
import { detecterLexiqueCharge } from './_lib/neutralite.js';
import { lireMesure, lireAnalyse, enregistrerAnalyse } from './_lib/corpus.js';
import { VERSION_GRILLE, MODELE_ANALYSE, SYSTEME_ANALYSE, messageAnalyse } from './_lib/grille.js';

const NIVEAUX = ['explicite', 'deduit', 'hypothese'];
const VEHICULES = ['reglement', 'loi_ordinaire', 'loi_organique', 'revision_constitutionnelle', 'droit_ue', 'traite_international', 'inconnu'];
const CONFIANCES = ['speculatif', 'faible', 'plausible', 'eleve'];

function lireJson(texte) {
  const brut = texte.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  try { return JSON.parse(brut); } catch { /* suite */ }
  const m = brut.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

const chaine = (v) => (typeof v === 'string' ? v.trim() : '');
const liste = (v) => (Array.isArray(v) ? v : []);

/** Normalise la sortie du modèle : champs manquants, valeurs hors énumération. */
function normaliser(a) {
  return {
    resume: chaine(a?.resume),
    explication: { simple: chaine(a?.explication?.simple), detaillee: chaine(a?.explication?.detaillee) },
    definitions: liste(a?.definitions).slice(0, 4).map((d) => ({
      terme: chaine(d?.terme), sens_dans_le_texte: chaine(d?.sens_dans_le_texte),
      sens_technique: chaine(d?.sens_technique), ambiguite: chaine(d?.ambiguite) || null,
    })).filter((d) => d.terme),
    implications: liste(a?.implications).slice(0, 5).map((i) => ({
      public: chaine(i?.public), effet: chaine(i?.effet),
      niveau: NIVEAUX.includes(i?.niveau) ? i.niveau : 'hypothese',
      justification: chaine(i?.justification),
    })).filter((i) => i.effet),
    non_precise: liste(a?.non_precise).slice(0, 5).map((n) => ({
      element: chaine(n?.element) || 'autre', detail: chaine(n?.detail),
    })).filter((n) => n.detail),
    faisabilite: {
      vehicule: VEHICULES.includes(a?.faisabilite?.vehicule) ? a.faisabilite.vehicule : 'inconnu',
      commentaire: chaine(a?.faisabilite?.commentaire),
      confiance: CONFIANCES.includes(a?.faisabilite?.confiance) ? a.faisabilite.confiance : 'faible',
    },
    questions_a_poser: liste(a?.questions_a_poser).map(chaine).filter(Boolean).slice(0, 3),
  };
}

/** Tous les textes libres de l'analyse, pour les contrôles. */
function textes(a) {
  return [
    a.resume, a.explication.simple, a.explication.detaillee,
    ...a.definitions.flatMap((d) => [d.sens_dans_le_texte, d.sens_technique, d.ambiguite ?? '']),
    ...a.implications.flatMap((i) => [i.effet, i.justification]),
    ...a.non_precise.map((n) => n.detail),
    a.faisabilite.commentaire,
  ].join('\n');
}

function controler(analyse, mesure) {
  const tout = textes(analyse);
  // Un chiffre présent dans le texte même de la mesure n'a pas à être sourcé
  // ailleurs : la mesure EST la source.
  const source = mesure.texte_source.replace(/\s/g, '');
  const chiffres = verifierChiffres(tout, 0);
  const nonCites = chiffres.nonCites.filter((n) => n.chiffres.some((c) => !source.includes(c.replace(/\s/g, ''))));
  const lexique = detecterLexiqueCharge(tout);
  return {
    conforme: nonCites.length === 0 && lexique.conforme,
    atteintes: [
      ...(nonCites.length ? ['chiffre_non_source'] : []),
      ...(lexique.conforme ? [] : ['lexique_evaluatif']),
    ],
    chiffres_non_sources: nonCites,
    termes_evaluatifs: lexique.termes,
  };
}

async function generer(mesure, correction = null) {
  const r = await appelerModele({
    systeme: SYSTEME_ANALYSE,
    utilisateur: messageAnalyse(mesure) + (correction ? `\n\nCORRECTION DEMANDÉE : ${correction}` : ''),
    modele: MODELE_ANALYSE,
    temperature: 0.2,
    json: true,
  });
  if (!r.ok) return r;
  const brut = lireJson(r.texte);
  if (!brut) return { ok: false, statut: 502, message: 'Réponse du modèle illisible.' };
  return { ok: true, analyse: normaliser(brut), modele: r.modele };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'methode_non_autorisee' });

  const mesureId = String(req.body?.mesureId ?? '').trim();
  if (!mesureId || mesureId.length > 64) return res.status(400).json({ erreur: 'parametre_invalide', message: 'mesureId requis.' });

  try {
    const mesure = await lireMesure(mesureId);
    if (!mesure) return res.status(404).json({ erreur: 'mesure_inconnue' });

    const enCache = await lireAnalyse(mesureId, VERSION_GRILLE);
    if (enCache) {
      return res.status(200).json({ mesure, analyse: enCache.contenu, controles: enCache.controles,
                                    version_grille: VERSION_GRILLE, cache: true });
    }

    const garde = await garder(req, Number(process.env.POL_COUT_ANALYSE ?? 1));
    if (!garde.ok) return res.status(garde.statut).json(garde.corps);

    let g = await generer(mesure);
    if (!g.ok) return res.status(g.statut ?? 502).json({ erreur: 'modele', message: g.message });
    let controles = controler(g.analyse, mesure);

    // Une seule régénération, avec le constat précis. Si l'écart persiste,
    // l'analyse est servie AVEC son signalement : l'utilisateur le voit.
    if (!controles.conforme) {
      const motifs = [
        controles.termes_evaluatifs.length ? `retire ces qualificatifs évaluatifs : ${controles.termes_evaluatifs.join(', ')}` : '',
        controles.chiffres_non_sources.length ? 'retire tout chiffre absent du texte de la mesure' : '',
      ].filter(Boolean).join(' ; ');
      const g2 = await generer(mesure, motifs);
      if (g2.ok) {
        const c2 = controler(g2.analyse, mesure);
        if (c2.atteintes.length <= controles.atteintes.length) { g = g2; controles = c2; }
      }
    }

    await enregistrerAnalyse(mesureId, VERSION_GRILLE, { contenu: g.analyse, controles, modele: g.modele ?? MODELE_ANALYSE });
    return res.status(200).json({ mesure, analyse: g.analyse, controles, version_grille: VERSION_GRILLE, cache: false });
  } catch (e) {
    console.error('[api/analyse]', e?.message ?? e);
    return res.status(500).json({ erreur: 'erreur_interne', message: 'Analyse impossible.' });
  }
}
