#!/usr/bin/env node
/**
 * Extraction des mesures d'un document (PDF ou page web) → fichier JSON.
 *
 *   node --env-file=.env scripts/extraire-programme.mjs \
 *     --candidat "Prénom Nom" [--formation "Parti"] \
 *     (--pdf chemin.pdf | --html https://…) --sortie corpus/xxx.json \
 *     --titre "…" --nature officiel_2027|anterieur|non_officiel|synthese_tierce \
 *     [--contexte "Présidentielle 2022"] [--editeur "…"] [--url https://…] [--publie-le 2022-03-25]
 *
 * Étapes :
 *  1. Lecture du document (pages du PDF, ou texte de la page découpé en blocs).
 *  2. Découpage en mesures par le modèle, bloc par bloc.
 *  3. CONTRÔLE DE FIDÉLITÉ : chaque « texte_source » doit figurer mot pour mot
 *     dans le bloc lu. Sinon il est rejeté : le modèle découpe, il ne
 *     reformule jamais ce que le document dit.
 *
 * Rien n'est écrit en base : le chargement se fait ensuite avec
 * scripts/charger-corpus.mjs, après relecture du fichier produit.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { appelerModele, fournisseur } from '../api/_lib/modele.js';

const THEMES = ['economie', 'fiscalite', 'social', 'sante', 'education', 'securite', 'immigration',
  'environnement', 'europe', 'institutions', 'territoires', 'culture'];
const NATURES = ['officiel_2027', 'anterieur', 'non_officiel', 'synthese_tierce'];

const { values: a } = parseArgs({
  options: {
    candidat: { type: 'string' }, formation: { type: 'string' },
    pdf: { type: 'string' }, html: { type: 'string' }, sortie: { type: 'string' },
    titre: { type: 'string' }, nature: { type: 'string' }, contexte: { type: 'string' },
    editeur: { type: 'string' }, url: { type: 'string' }, 'publie-le': { type: 'string' },
    'debut-page': { type: 'string' },
  },
});
for (const k of ['candidat', 'sortie', 'titre', 'nature']) {
  if (!a[k]) { console.error(`Paramètre manquant : --${k}`); process.exit(1); }
}
if (!NATURES.includes(a.nature)) { console.error(`--nature doit valoir : ${NATURES.join(', ')}`); process.exit(1); }
if (!a.pdf && !a.html) { console.error('Indiquer --pdf ou --html'); process.exit(1); }
console.log(`Fournisseur de modèle : ${fournisseur()}`);

export const slug = (nom) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

/* ─── 1. Lecture ─────────────────────────────────────────────────────────── */
let blocs = []; // { page, texte }
let empreinte;
if (a.pdf) {
  const octets = readFileSync(a.pdf);
  empreinte = createHash('sha256').update(octets).digest('hex');
  const doc = await getDocument({ data: new Uint8Array(octets) }).promise;
  for (let p = 1; p <= doc.numPages; p++) {
    const c = await (await doc.getPage(p)).getTextContent();
    blocs.push({ page: p, texte: c.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim() });
  }
} else {
  const r = await fetch(a.html, { headers: { 'User-Agent': 'Mozilla/5.0 ChallengerPolitique/1.0' } });
  const brut = await r.text();
  empreinte = createHash('sha256').update(brut).digest('hex');
  const texte = brut
    .replace(/<(script|style|noscript|svg|header|footer|nav)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;/g, '’').replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  // Blocs d'environ 5 000 caractères, coupés sur un retour à la ligne.
  let reste = texte;
  while (reste.length) {
    let fin = reste.length <= 5000 ? reste.length : reste.lastIndexOf('\n', 5000);
    if (fin < 1000) fin = Math.min(5000, reste.length);
    blocs.push({ page: null, texte: reste.slice(0, fin).replace(/\s+/g, ' ').trim() });
    reste = reste.slice(fin);
  }
}
const debut = Number(a['debut-page'] ?? 1);
blocs = blocs.filter((b) => b.texte.length >= 80 && (b.page === null || b.page >= debut));
console.log(`${a.pdf ?? a.html} : ${blocs.length} blocs à analyser`);

/* ─── 2. Extraction ──────────────────────────────────────────────────────── */
const SYSTEME = `Tu découpes un document politique en MESURES. Une mesure = un engagement concret et identifiable.
Règles :
- "texte_source" est une COPIE EXACTE, caractère pour caractère, d'un passage du texte fourni. Ne reformule rien, ne corrige rien, ne fusionne pas deux passages. 1 à 3 phrases.
- "intitule" : titre court (6 mots maximum), purement descriptif, sans adjectif évaluatif.
- "theme_id" : un parmi ${THEMES.join(', ')} (la défense relève de "europe").
- Ignore les slogans, constats, critiques d'adversaires et intentions générales sans engagement concret, ainsi que les menus et mentions légales d'une page web.
Réponds en JSON : {"mesures":[{"intitule":"...","texte_source":"...","theme_id":"..."}]}. S'il n'y a aucune mesure : {"mesures":[]}.`;

// Normalisation pour la comparaison uniquement : guillemets, espaces insécables
// et coupures de mots en fin de ligne des PDF (« confron - tés » = « confrontés »).
const norme = (t) => t.normalize('NFC').replace(/[’‘]/g, "'").replace(/[«»“”]/g, '"').replace(/[  ]/g, ' ')
  .replace(/(\p{L})\s?-\s(\p{L})/gu, '$1$2').replace(/\s+/g, ' ').trim().toLowerCase();

async function appelAvecPatience(utilisateur) {
  for (let essai = 0; essai < 6; essai++) {
    const r = await appelerModele({ systeme: SYSTEME, utilisateur, temperature: 0, json: true, modele: 'mistral-large-latest' });
    if (r.ok || r.statut !== 429) return r;
    const attente = 15000 * (essai + 1);
    process.stdout.write(` [quota atteint, pause ${attente / 1000} s]`);
    await pause(attente);
  }
  return { ok: false, message: 'quota épuisé' };
}

const retenues = [];
const rejetees = [];
for (const [i, b] of blocs.entries()) {
  const r = await appelAvecPatience(`${b.page ? `PAGE ${b.page}` : `BLOC ${i + 1}`} :\n${b.texte}`);
  if (!r.ok) { console.error(`\nBloc ${i + 1} ignoré : ${r.message}`); continue; }
  let mesures = [];
  try { mesures = JSON.parse(r.texte).mesures ?? []; } catch { /* bloc ignoré */ }

  /* ─── 3. Contrôle de fidélité ─── */
  const source = norme(b.texte);
  for (const m of mesures) {
    const fidele = typeof m.texte_source === 'string' && m.texte_source.length > 20 && source.includes(norme(m.texte_source));
    if (fidele && THEMES.includes(m.theme_id) && m.intitule) {
      if (!retenues.some((x) => norme(x.texte_source) === norme(m.texte_source))) {
        retenues.push({ intitule: m.intitule.trim(), texte_source: m.texte_source.trim(), theme_id: m.theme_id, page: b.page });
      }
    } else {
      rejetees.push({ page: b.page, motif: !fidele ? 'texte_non_verbatim' : 'theme_ou_intitule', extrait: String(m.texte_source).slice(0, 90) });
    }
  }
  process.stdout.write(`\rBlocs : ${i + 1}/${blocs.length} — mesures retenues : ${retenues.length}   `);
  await pause(4000); // quota gratuit du modèle
}
console.log(`\nRetenues : ${retenues.length} — rejetées : ${rejetees.length}`);

const document = {
  candidat: { id: slug(a.candidat), nom: a.candidat, formation: a.formation ?? null, statut: 'declare' },
  programme: {
    titre: a.titre, nature: a.nature, contexte: a.contexte ?? null, editeur: a.editeur ?? null,
    url_officielle: a.url ?? a.html ?? null, publie_le: a['publie-le'] ?? null, sha256: empreinte,
  },
  mesures: retenues,
  rejetees,
};
writeFileSync(a.sortie, JSON.stringify([document], null, 1));
console.log(`→ ${a.sortie}`);
