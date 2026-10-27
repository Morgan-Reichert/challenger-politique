/**
 * GET /api/budget?vue=ensemble&unite=PC_GDP
 * GET /api/budget?theme=social&unite=MIO_EUR
 *
 * Public, gratuit, sans appel au modèle : données Eurostat remises en forme.
 * Mis en cache 12 h par le CDN.
 */
import { cors } from './_lib/cors.js';
import { seriesTheme, vueEnsemble, SERIES_PAR_THEME } from './_lib/budget.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ erreur: 'methode_non_autorisee' });

  const unite = req.query?.unite === 'MIO_EUR' ? 'MIO_EUR' : 'PC_GDP';
  const theme = req.query?.theme ? String(req.query.theme) : null;

  try {
    let corps;
    if (theme) {
      if (!(theme in SERIES_PAR_THEME)) return res.status(400).json({ erreur: 'theme_inconnu' });
      corps = await seriesTheme(theme, unite);
      if (!corps) return res.status(200).json({ indisponible: true, message: 'Aucune série de dépenses publiques ne correspond spécifiquement à ce thème.' });
    } else {
      corps = await vueEnsemble(unite);
    }
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');
    return res.status(200).json(corps);
  } catch (e) {
    console.error('[api/budget]', e?.message ?? e);
    return res.status(502).json({ erreur: 'source_indisponible', message: 'Les données Eurostat sont momentanément indisponibles.' });
  }
}
