/**
 * Séries de finances publiques — Eurostat (données officielles transmises par
 * l'INSEE, réutilisation libre avec mention de la source).
 *
 * RÈGLE : aucun chiffre de cette partie n'est produit par le modèle de langage.
 * Les séries viennent d'Eurostat telles quelles ; le serveur ne fait que les
 * remettre en forme. Les valeurs provisoires sont signalées comme telles.
 *
 * Jeux utilisés :
 *  - gov_10a_exp  : dépenses des administrations publiques par fonction
 *                   (nomenclature internationale CFAP / COFOG)
 *  - gov_10a_main : recettes, dépenses, solde
 *  - gov_10dd_edpt1 : dette publique au sens de Maastricht
 */
const API = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const DEPUIS = 1995;

/** Fonctions COFOG rattachées à chaque thème de la grille (3 séries maximum). */
export const SERIES_PAR_THEME = {
  social: ['GF10', 'GF1002'],
  sante: ['GF07'],
  education: ['GF09'],
  securite: ['GF03', 'GF02'],
  environnement: ['GF05'],
  territoires: ['GF06', 'GF0405'],
  culture: ['GF08'],
  economie: ['GF04'],
  institutions: ['GF01', 'GF0107'],
  europe: ['GF02', 'GF0102'],
  fiscalite: null, // → vue d'ensemble (recettes, dépenses, solde, dette)
  immigration: null, // aucune fonction COFOG dédiée
};

export const UNITES = { PC_GDP: '% du PIB', MIO_EUR: 'milliards d\'euros' };

/** Libellés Eurostat → libellés lisibles par tous. */
const LIBELLES = {
  TR: 'Recettes publiques',
  TE: 'Dépenses publiques',
  B9: 'Solde public (déficit si négatif)',
  GD: 'Dette publique',
  GF01: 'Services généraux', GF0107: 'Charge de la dette',
  GF0102: 'Aide économique extérieure', GF02: 'Défense',
  GF03: 'Ordre et sécurité publics', GF04: 'Affaires économiques',
  GF0405: 'Transports', GF05: 'Protection de l\'environnement',
  GF06: 'Logement et équipements collectifs', GF07: 'Santé',
  GF08: 'Loisirs, culture et culte', GF09: 'Enseignement',
  GF10: 'Protection sociale (total)', GF1002: 'dont retraites (vieillesse)',
};

/* ─── Cache mémoire + CDN ─────────────────────────────────────────────────── */
const CACHE = new Map();
const TTL = 12 * 3600 * 1000;

async function eurostat(jeu, params) {
  const qs = new URLSearchParams({ format: 'JSON', lang: 'FR', geo: 'FR', sinceTimePeriod: String(DEPUIS) });
  for (const [k, v] of Object.entries(params)) for (const x of [].concat(v)) qs.append(k, x);
  const url = `${API}/${jeu}?${qs}`;
  const e = CACHE.get(url);
  if (e && Date.now() - e.at < TTL) return e.data;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`eurostat_http_${r.status}`);
  const data = await r.json();
  CACHE.set(url, { at: Date.now(), data });
  return data;
}

/**
 * Déplie une réponse JSON-stat le long d'UNE dimension variable (`dim`),
 * toutes les autres étant fixées à une seule valeur par la requête.
 */
function deplier(d, dim, diviseur = 1) {
  const ids = d.id;
  const tailles = d.size;
  const pas = ids.map((_, i) => tailles.slice(i + 1).reduce((a, b) => a * b, 1));
  const iDim = ids.indexOf(dim);
  const iTemps = ids.indexOf('time');
  const annees = Object.entries(d.dimension.time.category.index).sort((a, b) => a[1] - b[1]);
  const cats = Object.entries(d.dimension[dim].category.index).sort((a, b) => a[1] - b[1]);
  return cats.map(([code, ci]) => ({
    id: code,
    label: LIBELLES[code] ?? d.dimension[dim].category.label[code],
    points: annees.map(([annee, ti]) => {
      const k = String(ci * pas[iDim] + ti * pas[iTemps]);
      const v = d.value[k];
      return v === undefined || v === null ? null : {
        annee: Number(annee),
        valeur: Math.round((v / diviseur) * 10) / 10,
        provisoire: d.status?.[k] === 'p',
      };
    }).filter(Boolean),
  }));
}

const SOURCE = (jeu) => ({
  nom: 'Eurostat, à partir des données de l\'INSEE',
  jeu,
  url: `https://ec.europa.eu/eurostat/databrowser/view/${jeu}/default/table?lang=fr`,
});

export async function seriesTheme(theme, unite = 'PC_GDP') {
  const codes = SERIES_PAR_THEME[theme];
  if (!codes) return null;
  const d = await eurostat('gov_10a_exp', { sector: 'S13', na_item: 'TE', unit: unite, cofog99: codes });
  return {
    titre: 'Dépenses publiques liées à ce thème',
    unite: UNITES[unite],
    series: deplier(d, 'cofog99', unite === 'MIO_EUR' ? 1000 : 1),
    source: SOURCE('gov_10a_exp'),
    note: 'Toutes administrations publiques (État, collectivités, sécurité sociale), selon la classification internationale des fonctions (CFAP).',
  };
}

export async function vueEnsemble(unite = 'PC_GDP') {
  const div = unite === 'MIO_EUR' ? 1000 : 1;
  const [main, dette] = await Promise.all([
    eurostat('gov_10a_main', { sector: 'S13', unit: unite, na_item: ['TR', 'TE', 'B9'] }),
    eurostat('gov_10dd_edpt1', { sector: 'S13', unit: unite, na_item: 'GD' }),
  ]);
  const agr = deplier(main, 'na_item', div);
  const par = (id) => agr.find((s) => s.id === id);
  return {
    unite: UNITES[unite],
    recettesDepenses: { series: [par('TR'), par('TE')].filter(Boolean), source: SOURCE('gov_10a_main') },
    solde: { series: [par('B9')].filter(Boolean), source: SOURCE('gov_10a_main') },
    dette: { series: deplier(dette, 'na_item', div), source: SOURCE('gov_10dd_edpt1') },
  };
}
