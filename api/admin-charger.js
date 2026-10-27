/**
 * POST /api/admin-charger   (réservé à l'administration du corpus)
 *
 * En-tête  Authorization: Bearer <POL_ADMIN_TOKEN>
 * Corps    { document: { candidat, programme, mesures } }  — même format que
 *          les fichiers produits par scripts/extraire-programme.mjs et
 *          scripts/importer-ifrap.mjs.
 *
 * Permet d'alimenter le corpus depuis n'importe quel poste sans y copier la
 * clé Supabase : seul ce point d'entrée, côté serveur, l'utilise. Sans jeton
 * configuré, il est désactivé.
 *
 * Recharger un même document remplace ses mesures au lieu de les dupliquer.
 */
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { embeddings } from './_lib/modele.js';

const THEMES = ['economie', 'fiscalite', 'social', 'sante', 'education', 'securite', 'immigration',
  'environnement', 'europe', 'institutions', 'territoires', 'culture'];
const NATURES = ['officiel_2027', 'anterieur', 'non_officiel', 'synthese_tierce'];
const MAX_MESURES = 400;

function autorise(req) {
  const attendu = process.env.POL_ADMIN_TOKEN;
  if (!attendu || attendu.length < 32) return false;
  const recu = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
}

function valider(doc) {
  const { candidat, programme, mesures } = doc ?? {};
  if (!candidat?.id || !/^[a-z0-9-]{2,60}$/.test(candidat.id) || !candidat.nom) return 'candidat invalide';
  if (!programme?.titre || !NATURES.includes(programme.nature) || !programme.sha256) return 'programme invalide';
  if (!Array.isArray(mesures) || mesures.length === 0 || mesures.length > MAX_MESURES) return `entre 1 et ${MAX_MESURES} mesures`;
  for (const m of mesures) {
    if (!m.intitule || !m.texte_source || !THEMES.includes(m.theme_id)) return 'mesure invalide';
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erreur: 'methode_non_autorisee' });
  if (!autorise(req)) return res.status(401).json({ erreur: 'non_autorise' });

  const doc = req.body?.document;
  const invalide = valider(doc);
  if (invalide) return res.status(400).json({ erreur: 'document_invalide', message: invalide });

  const url = process.env.VITE_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) return res.status(503).json({ erreur: 'supabase_non_configure' });
  const db = createClient(url, cle, { auth: { persistSession: false } });
  const ok = (r, quoi) => { if (r.error) throw new Error(`${quoi} : ${r.error.message}`); return r.data; };

  try {
    const { candidat, programme, mesures } = doc;
    const vecteurs = [];
    for (let i = 0; i < mesures.length; i += 50) {
      const lot = mesures.slice(i, i + 50).map((m) => `${m.intitule}\n${m.texte_source}`);
      for (let essai = 0; ; essai++) {
        try { vecteurs.push(...await embeddings(lot)); break; } catch (e) {
          if (essai >= 3) throw e; // quota du fournisseur : on réessaie, puis on abandonne proprement
          await new Promise((r) => setTimeout(r, 10000 * (essai + 1)));
        }
      }
    }

    const existant = ok(await db.from('pol_candidats').select('formation').eq('id', candidat.id).maybeSingle(), 'lecture candidat');
    ok(await db.from('pol_candidats').upsert({
      id: candidat.id, election_id: 'presidentielle-2027', nom: candidat.nom,
      formation: candidat.formation ?? existant?.formation ?? null, statut: candidat.statut ?? 'declare',
    }), 'candidat');

    const prog = ok(await db.from('pol_programmes').upsert({
      candidat_id: candidat.id, titre: programme.titre, nature: programme.nature,
      contexte: programme.contexte ?? null, editeur: programme.editeur ?? null,
      url_officielle: programme.url_officielle ?? null, publie_le: programme.publie_le ?? null,
      sha256: programme.sha256,
    }, { onConflict: 'candidat_id,sha256' }).select('id').single(), 'programme');

    ok(await db.from('pol_mesures').delete().eq('programme_id', prog.id), 'purge');
    ok(await db.from('pol_mesures').insert(mesures.map((m, k) => ({
      programme_id: prog.id, candidat_id: candidat.id, theme_id: m.theme_id,
      intitule: String(m.intitule).slice(0, 200), texte_source: m.texte_source,
      page: Number.isInteger(m.page) ? m.page : null, embedding: vecteurs[k],
    }))), 'mesures');

    return res.status(200).json({ ok: true, candidat: candidat.id, programme: prog.id, mesures: mesures.length });
  } catch (e) {
    console.error('[api/admin-charger]', e?.message ?? e);
    return res.status(500).json({ erreur: 'echec_chargement', message: String(e?.message ?? e).slice(0, 300) });
  }
}
