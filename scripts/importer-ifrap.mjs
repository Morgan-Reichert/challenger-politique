#!/usr/bin/env node
/**
 * Import du comparateur « Présidentielles 2027 » de la Fondation iFRAP.
 *
 *   node --env-file=.env scripts/importer-ifrap.mjs [--html corpus/ifrap.html]
 *
 * Lecture DÉTERMINISTE du HTML : chaque proposition est reprise mot pour mot,
 * sans passer par le modèle. Seuls les intitulés courts sont rédigés par le
 * modèle (si une clé est disponible), le texte source restant intact.
 *
 * Nature : « synthese_tierce ». Chaque mesure est la formulation de l'iFRAP,
 * pas celle du candidat : l'interface le signale et renvoie vers la page.
 * Sortie : corpus/ifrap.json (non versionné — contenu de l'iFRAP).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { appelerModele } from '../api/_lib/modele.js';

const URL_IFRAP = 'https://www.ifrap.org/comparateurs/presidentielles-2027';
const { values: a } = parseArgs({ options: { html: { type: 'string' }, 'sans-titres': { type: 'boolean', default: false } } });

// Rubriques iFRAP → grille commune de Challenger Politique.
const THEMES = {
  c641: 'fiscalite', c637: 'fiscalite', c581: 'fiscalite', c603: 'economie',
  c584: 'immigration', c657: 'securite', c715: 'securite', c669: 'securite',
  c595: 'territoires', c624: 'social', c602: 'sante', c569: 'culture',
  c519: 'territoires', c550: 'territoires', c578: 'economie', c1130: 'social',
  c653: 'economie', c1139: 'economie', c579: 'environnement', c573: 'environnement',
  c482: 'economie', c480: 'europe', c556: 'europe', c716: 'institutions',
  c576: 'institutions', c1134: 'culture', c1146: 'education', c554: 'institutions',
  c1135: 'institutions', c1131: 'education', c528: 'education', c1136: 'education',
  c635: 'europe',
};

// Formations, telles que déclarées publiquement (null si non vérifiée).
const FORMATIONS = {
  'Nathalie Arthaud': 'Lutte ouvrière', 'Gabriel Attal': 'Renaissance',
  'Nicolas Dupont-Aignan': 'Debout la France', 'Raphaël Glucksmann': 'Place publique',
  'Marine Le Pen': 'Rassemblement national', 'David Lisnard': 'Nouvelle Énergie',
  'Jean-Luc Mélenchon': 'La France insoumise', 'Edouard Philippe': 'Horizons',
  'Natacha Polony': null, 'Bruno Retailleau': 'Les Républicains', 'Fabien Roussel': 'Parti communiste français',
  'François Ruffin': null, 'Marine Tondelier': 'Les Écologistes', 'Éric Zemmour': 'Reconquête',
};

const entites = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#039;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>', '&rsquo;': '’', '&laquo;': '«', '&raquo;': '»' };
const texte = (h) => h.replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, (e) => entites[e] ?? (e.startsWith('&#') ? String.fromCodePoint(parseInt(e.slice(2, -1), 10)) : e))
  .replace(/\s+/g, ' ').trim();
export const slug = (nom) => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const html = a.html && existsSync(a.html) ? readFileSync(a.html, 'utf8')
  : await (await fetch(URL_IFRAP, { headers: { 'User-Agent': 'Mozilla/5.0 ChallengerPolitique/1.0' } })).text();

const parCandidat = new Map();
const sections = html.split(/<details id="(c\d+)"/).slice(1);
for (let i = 0; i < sections.length; i += 2) {
  const id = sections[i];
  const corps = sections[i + 1];
  const rubrique = texte((corps.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) ?? [])[1] ?? '');
  const theme = THEMES[id];
  if (!theme) { console.warn(`Rubrique ignorée (non mappée) : ${id} ${rubrique}`); continue; }

  for (const bloc of corps.split('<li class="flex flex-col gap-4 p-4').slice(1)) {
    const n = bloc.match(/<figcaption[^>]*><span class="truncate">([^<]+)<\/span>\s*<span class="truncate font-semibold uppercase">([^<]+)<\/span>/);
    if (!n) continue;
    const prenom = texte(n[1]);
    const nomFamille = texte(n[2]).toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
    const nom = `${prenom} ${nomFamille}`;
    const props = [...bloc.matchAll(/<li class="flex items-start gap-2 counter-increment[^>]*>\s*<div class="flex-1">\s*<div>([\s\S]*?)<\/div>\s*<!---->/g)]
      .map((m) => texte(m[1])).filter((t) => t.length > 15);
    if (!parCandidat.has(nom)) parCandidat.set(nom, []);
    for (const t of props) parCandidat.get(nom).push({ texte_source: t, theme_id: theme, rubrique_source: rubrique });
  }
}

const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Intitulé tiré du texte lui-même, sans modèle : la proposition commence par
 * un verbe à l'infinitif, on garde sa première proposition principale (avant
 * « pour », « afin de », une virgule…), plafonnée à 9 mots. Ce sont donc les
 * mots de la source, raccourcis, jamais une reformulation.
 */
function intituleDeterministe(t) {
  let c = t.split(/\s(?:pour|afin d['eu]|afin que|en vue d['eu]|grâce à|notamment|dont|via|y compris)\s|[,:;(–—]|\.\s/i)[0].trim();
  // Trop court (simple mise en contexte) : on repart du texte complet.
  if (c.split(/\s+/).length < 4) c = t;
  let mots = c.replace(/[.\s]+$/, '').split(/\s+/);
  if (mots.length <= 9) return mots.join(' ');
  mots = mots.slice(0, 9);
  // Ne pas finir sur un mot de liaison (« garantir à… »).
  while (mots.length > 4 && /^(à|a|de|des|du|d'|d’|la|le|les|l'|l’|et|ou|en|un|une|par|sur|aux|au|dans|avec|son|sa|ses|leur|leurs|que|qui|dès|pour|afin|mais|sans|entre|vers|chez)$/i.test(mots.at(-1))) mots.pop();
  mots[mots.length - 1] = mots.at(-1).replace(/[,;:]+$/, '');
  return `${mots.join(' ')}…`;
}

/* Intitulés courts : rédigés par le modèle, par lots, sans toucher au texte. */
async function intitules(textes) {
  const repli = textes.map(intituleDeterministe);
  if (a['sans-titres']) return repli;
  let r;
  for (let essai = 0; essai < 6; essai++) {
    r = await appelerModele({
      systeme: 'Tu rédiges des intitulés courts (6 mots maximum), purement descriptifs, sans adjectif évaluatif, en français. Réponds en JSON : {"intitules":["..."]}, un par proposition, dans le même ordre.',
      utilisateur: textes.map((t, i) => `${i + 1}. ${t}`).join('\n'), temperature: 0, json: true,
    });
    if (r.ok || r.statut !== 429) break;
    console.log(`  quota atteint, pause ${15 * (essai + 1)} s`);
    await pause(15000 * (essai + 1));
  }
  try {
    const l = JSON.parse(r.texte).intitules;
    if (r.ok && Array.isArray(l) && l.length === textes.length) return l.map((x, i) => String(x).trim() || repli[i]);
  } catch { /* repli */ }
  console.warn('  intitulés : repli sur une troncature');
  return repli;
}
const documents = [];
for (const [nom, mesures] of parCandidat) {
  if (mesures.length === 0) { console.log(`- ${nom} : aucune proposition publiée`); continue; }
  for (let i = 0; i < mesures.length; i += 25) {
    const lot = mesures.slice(i, i + 25);
    const t = await intitules(lot.map((m) => m.texte_source));
    lot.forEach((m, k) => { m.intitule = t[k]; m.page = null; });
    if (!a['sans-titres']) await pause(4000); // quota gratuit du modèle
  }
  documents.push({
    candidat: { id: slug(nom), nom, formation: FORMATIONS[nom] ?? null, statut: 'declare' },
    programme: {
      titre: 'Propositions recensées par la Fondation iFRAP', nature: 'synthese_tierce',
      contexte: 'Comparateur « Présidentielles 2027 »', editeur: 'Fondation iFRAP',
      url_officielle: URL_IFRAP, sha256: `ifrap-${slug(nom)}-${new Date().toISOString().slice(0, 10)}`,
    },
    mesures,
  });
  console.log(`✓ ${nom} : ${mesures.length} propositions`);
}

writeFileSync('corpus/ifrap.json', JSON.stringify(documents, null, 1));
console.log(`\n${documents.length} candidats, ${documents.reduce((s, d) => s + d.mesures.length, 0)} propositions → corpus/ifrap.json`);
