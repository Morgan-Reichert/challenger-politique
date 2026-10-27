#!/usr/bin/env node
/**
 * Ingestion d'un programme officiel (PDF) dans le corpus.
 *
 *   node --env-file=.env scripts/ingerer-programme.mjs \
 *     --candidat nom-prenom --nom "Prénom Nom" --formation "Parti" \
 *     --pdf corpus/programme.pdf --url https://site-officiel/programme.pdf \
 *     [--titre "Programme 2027"] [--archive https://web.archive.org/...] [--essai]
 *
 * Étapes :
 *  1. Lecture du PDF page par page, empreinte SHA-256 du fichier.
 *  2. Extraction des mesures par le modèle, page par page.
 *  3. CONTRÔLE DE FIDÉLITÉ : chaque « texte_source » proposé par le modèle doit
 *     figurer mot pour mot dans la page. Sinon il est rejeté. Le modèle découpe ;
 *     il n'a pas le droit de reformuler ce que le candidat a écrit.
 *  4. Embeddings (mistral-embed) puis insertion dans Supabase.
 *
 * --essai : n'écrit rien, affiche les mesures retenues et rejetées.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { appelerModele, embeddings, fournisseur } from '../api/_lib/modele.js';

const THEMES = ['economie', 'fiscalite', 'social', 'sante', 'education', 'securite', 'immigration',
  'environnement', 'europe', 'institutions', 'territoires', 'culture'];

const { values: a } = parseArgs({
  options: {
    candidat: { type: 'string' }, nom: { type: 'string' }, formation: { type: 'string' },
    pdf: { type: 'string' }, url: { type: 'string' }, titre: { type: 'string' },
    archive: { type: 'string' }, essai: { type: 'boolean', default: false },
  },
});
for (const k of ['candidat', 'nom', 'pdf']) {
  if (!a[k]) { console.error(`Paramètre manquant : --${k}`); process.exit(1); }
}

if (!process.env.GEMINI_API_KEY && !process.env.MISTRAL_API_KEY) {
  console.error('Clé de modèle manquante : GEMINI_API_KEY ou MISTRAL_API_KEY (utiliser node --env-file=.env).');
  process.exit(1);
}
console.log(`Fournisseur de modèle : ${fournisseur()}`);

/* ─── 1. PDF ─────────────────────────────────────────────────────────────── */
const octets = readFileSync(a.pdf);
const sha256 = createHash('sha256').update(octets).digest('hex');
const doc = await getDocument({ data: new Uint8Array(octets) }).promise;
const pages = [];
for (let p = 1; p <= doc.numPages; p++) {
  const contenu = await (await doc.getPage(p)).getTextContent();
  pages.push(contenu.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim());
}
console.log(`PDF : ${doc.numPages} pages — sha256 ${sha256.slice(0, 12)}…`);

/* ─── 2. Extraction ──────────────────────────────────────────────────────── */
const SYSTEME = `Tu découpes un programme électoral en MESURES. Une mesure = un engagement concret et identifiable.
Règles :
- "texte_source" est une COPIE EXACTE, caractère pour caractère, d'un passage de la page fournie. Ne reformule rien, ne corrige rien, ne fusionne pas deux passages. 1 à 3 phrases.
- "intitule" : titre court (max 8 mots), purement descriptif, sans adjectif évaluatif.
- "theme_id" : un parmi ${THEMES.join(', ')}.
- Ignore les slogans, constats et intentions générales sans engagement concret.
Réponds en JSON : {"mesures":[{"intitule":"...","texte_source":"...","theme_id":"..."}]}. Si la page n'a aucune mesure : {"mesures":[]}.`;

const norme = (t) => t.normalize('NFC').replace(/[’‘]/g, "'").replace(/[«»“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

const retenues = [];
const rejetees = [];
for (let i = 0; i < pages.length; i++) {
  if (pages[i].length < 80) continue;
  const r = await appelerModele({
    systeme: SYSTEME, utilisateur: `PAGE ${i + 1} :\n${pages[i]}`,
    modele: 'mistral-large-latest', temperature: 0, json: true,
  });
  if (!r.ok) { console.error(`\nPage ${i + 1} ignorée : ${r.message}`); continue; }
  let mesures = [];
  try { mesures = JSON.parse(r.texte).mesures ?? []; } catch { /* page ignorée */ }

  /* ─── 3. Contrôle de fidélité ─── */
  const page = norme(pages[i]);
  for (const m of mesures) {
    const fidele = typeof m.texte_source === 'string' && m.texte_source.length > 20 && page.includes(norme(m.texte_source));
    const themeOk = THEMES.includes(m.theme_id);
    if (fidele && themeOk && m.intitule) retenues.push({ ...m, page: i + 1 });
    else rejetees.push({ ...m, page: i + 1, motif: !fidele ? 'texte_non_verbatim' : 'theme_ou_intitule' });
  }
  process.stdout.write(`\rPages analysées : ${i + 1}/${pages.length} — mesures retenues : ${retenues.length}`);
}
console.log(`\nRetenues : ${retenues.length} — rejetées : ${rejetees.length}`);
for (const r of rejetees) console.log(`  ✗ p.${r.page} [${r.motif}] ${String(r.texte_source).slice(0, 90)}`);

if (a.essai) {
  for (const m of retenues) console.log(`  ✓ p.${m.page} [${m.theme_id}] ${m.intitule}`);
  console.log('\nMode essai : rien n\'a été écrit.');
  process.exit(0);
}

/* ─── 4. Embeddings + insertion ──────────────────────────────────────────── */
const url = process.env.VITE_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !cle) { console.error('Supabase non configuré (VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).'); process.exit(1); }
const db = createClient(url, cle, { auth: { persistSession: false } });

const vecteurs = [];
for (let i = 0; i < retenues.length; i += 32) {
  const lot = retenues.slice(i, i + 32).map((m) => `${m.intitule}\n${m.texte_source}`);
  vecteurs.push(...await embeddings(lot));
}

const ok = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };

ok(await db.from('pol_candidats').upsert({
  id: a.candidat, election_id: 'presidentielle-2027', nom: a.nom, formation: a.formation ?? null,
}));
const programme = ok(await db.from('pol_programmes').upsert({
  candidat_id: a.candidat, titre: a.titre ?? `Programme de ${a.nom}`,
  url_officielle: a.url ?? null, url_archive: a.archive ?? null, sha256,
}, { onConflict: 'candidat_id,sha256' }).select('id').single());

// Réingestion du même fichier : on remplace ses mesures plutôt que de doubler.
ok(await db.from('pol_mesures').delete().eq('programme_id', programme.id));
ok(await db.from('pol_mesures').insert(retenues.map((m, i) => ({
  programme_id: programme.id, candidat_id: a.candidat, theme_id: m.theme_id,
  intitule: m.intitule, texte_source: m.texte_source, page: m.page, embedding: vecteurs[i],
}))));

console.log(`✓ ${retenues.length} mesures insérées pour ${a.nom}.`);
