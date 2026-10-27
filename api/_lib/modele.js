/**
 * Fournisseur de modèle — Gemini (Google) si GEMINI_API_KEY est définie,
 * sinon Mistral. Même interface que mistral.js : { ok, texte, usage, modele }.
 *
 * ⚠️ Les embeddings doivent venir du MÊME fournisseur à l'ingestion et à la
 * recherche : changer de fournisseur impose de réingérer les programmes.
 */
import { appelerModele as appelerMistral } from './mistral.js';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';
const ATTENTES_MS = [600, 1800, 4000];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const reprisePossible = (s) => s === 429 || s >= 500;

export const fournisseur = () => (process.env.GEMINI_API_KEY ? 'gemini' : 'mistral');
export const modeleGemini = () => process.env.GEMINI_MODELE || 'gemini-3.5-flash';

async function unAppelGemini({ cle, systeme, utilisateur, temperature, json }) {
  const modele = modeleGemini();
  try {
    const r = await fetch(`${GEMINI}/${modele}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systeme }] },
        contents: [{ role: 'user', parts: [{ text: utilisateur }] }],
        generationConfig: {
          temperature: typeof temperature === 'number' ? temperature : 0.7,
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return {
        ok: false, statut: r.status === 429 ? 429 : 502, statutAmont: r.status,
        message: r.status === 429 ? 'Le modèle est momentanément saturé. Réessayez dans un instant.' : 'Le modèle a renvoyé une erreur.',
        detail: detail.slice(0, 300),
      };
    }
    const data = await r.json();
    const texte = (data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    if (!texte) return { ok: false, statut: 502, statutAmont: 200, message: 'Réponse vide du modèle (contenu bloqué ?).' };
    return {
      ok: true, texte, modele,
      usage: { jetons_entree: data?.usageMetadata?.promptTokenCount ?? null, jetons_sortie: data?.usageMetadata?.candidatesTokenCount ?? null },
    };
  } catch (e) {
    return { ok: false, statut: 502, statutAmont: 503, message: 'Le modèle est injoignable.', detail: String(e?.message ?? e) };
  }
}

/**
 * `modele` n'est utilisé que pour Mistral ; avec Gemini, le modèle vient de
 * GEMINI_MODELE afin que tout le service utilise le même.
 */
export async function appelerModele({ systeme, utilisateur, modele, temperature, json }) {
  const cle = process.env.GEMINI_API_KEY;
  if (!cle) {
    const r = await appelerMistral({ systeme, utilisateur, modele, temperature, json });
    return { ...r, modele: modele || 'mistral-small-latest' };
  }
  let dernier = null;
  for (let essai = 0; essai <= ATTENTES_MS.length; essai++) {
    if (essai > 0) await pause(ATTENTES_MS[essai - 1]);
    dernier = await unAppelGemini({ cle, systeme, utilisateur, temperature, json });
    if (dernier.ok || !reprisePossible(dernier.statutAmont)) return dernier;
  }
  return dernier;
}

/** Embeddings de dimension 1024 (schéma pol_mesures), quel que soit le fournisseur. */
export async function embeddings(textes, { requete = false } = {}) {
  const cleGemini = process.env.GEMINI_API_KEY;
  if (cleGemini) {
    const modele = 'gemini-embedding-001';
    const r = await fetch(`${GEMINI}/${modele}:batchEmbedContents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cleGemini },
      body: JSON.stringify({
        requests: textes.map((t) => ({
          model: `models/${modele}`,
          content: { parts: [{ text: t }] },
          taskType: requete ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
          outputDimensionality: 1024,
        })),
      }),
    });
    if (!r.ok) throw new Error(`gemini_embeddings_http_${r.status}`);
    const data = await r.json();
    return data.embeddings.map((e) => e.values);
  }
  const cle = process.env.MISTRAL_API_KEY;
  if (!cle) throw new Error('Aucune clé de modèle (GEMINI_API_KEY ou MISTRAL_API_KEY).');
  const r = await fetch('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
    body: JSON.stringify({ model: 'mistral-embed', input: textes }),
  });
  if (!r.ok) throw new Error(`mistral_embeddings_http_${r.status}`);
  const data = await r.json();
  return data.data.map((d) => d.embedding);
}
