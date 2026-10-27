/**
 * Garde commune aux points d'entrée payants : authentification Firebase
 * (comptes Challenger IA) puis quota et crédits partagés (Supabase).
 *
 * Retourne `{ ok: true, uid }` ou `{ ok: false, statut, corps }`.
 */
import { verifyIdToken } from './admin.js';
import { checkAndConsumeQuota } from './quota.js';
import { estEmailIllimite } from './illimite.js';

const MESSAGES = {
  rate_limited: 'Trop de requêtes. Réessayez dans une minute.',
  no_credits: 'Quota atteint. Vos crédits Challenger sont épuisés pour aujourd\'hui.',
  quota_error: 'Vérification du quota impossible.',
};

export async function garder(req, cout) {
  const auth = await verifyIdToken(req);

  // Admin SDK non configuré : toléré en développement local uniquement. Sur
  // Vercel, l'absence de vérification ouvrirait le modèle à tout le monde.
  if (auth.skipped) {
    if (process.env.VERCEL) {
      return { ok: false, statut: 503, corps: { erreur: 'auth_non_configuree', message: 'Authentification serveur non configurée (FIREBASE_ADMIN_*).' } };
    }
    return { ok: true, uid: null, local: true };
  }

  if (!auth.uid) {
    return { ok: false, statut: 401, corps: { erreur: 'non_authentifie', message: 'Connectez-vous avec votre compte Challenger.' } };
  }
  if (auth.fournisseur === 'anonymous') {
    return { ok: false, statut: 403, corps: { erreur: 'compte_requis', message: 'Un compte Challenger est nécessaire pour lancer une analyse.' } };
  }
  if (estEmailIllimite(auth.email)) return { ok: true, uid: auth.uid };

  const quota = await checkAndConsumeQuota(auth.uid, cout);
  if (!quota.allowed) {
    const statut = quota.reason === 'quota_error' ? 503 : 429;
    return { ok: false, statut, corps: { erreur: quota.reason, message: MESSAGES[quota.reason] ?? MESSAGES.quota_error } };
  }
  return { ok: true, uid: auth.uid };
}
