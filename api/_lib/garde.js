/**
 * Garde commune aux points d'entrée qui appellent le modèle.
 *
 * Le service est ouvert, sans compte. Pour qu'il ne puisse pas être utilisé
 * pour épuiser le budget du modèle, chaque visiteur est limité par adresse IP
 * (débit par minute + plafond journalier), via la fonction check_chat_quota.
 *
 * Confidentialité : l'adresse IP n'est jamais stockée en clair. Seule une
 * empreinte salée (SHA-256) sert de clé de comptage ; elle ne permet pas de
 * retrouver l'adresse et n'est rattachée à aucune question posée.
 *
 * Retourne `{ ok: true }` ou `{ ok: false, statut, corps }`.
 */
import { createHash } from 'node:crypto';
import { checkAndConsumeQuota } from './quota.js';

const MESSAGES = {
  rate_limited: 'Trop de requêtes. Réessayez dans une minute.',
  no_credits: 'Limite quotidienne atteinte. Réessayez demain.',
  quota_error: 'Service momentanément indisponible.',
};

function adresse(req) {
  const transmise = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
  return transmise || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'inconnue';
}

function empreinte(ip) {
  const sel = process.env.POL_SEL_IP || 'challenger-politique';
  return 'ip:' + createHash('sha256').update(`${sel}:${ip}`).digest('hex').slice(0, 32);
}

export async function garder(req, cout) {
  const quota = await checkAndConsumeQuota(empreinte(adresse(req)), cout);
  if (quota.skipped) {
    // Supabase non configuré : toléré en local uniquement.
    if (process.env.VERCEL) return { ok: false, statut: 503, corps: { erreur: 'quota_non_configure', message: MESSAGES.quota_error } };
    return { ok: true };
  }
  if (!quota.allowed) {
    const statut = quota.reason === 'quota_error' ? 503 : 429;
    return { ok: false, statut, corps: { erreur: quota.reason, message: MESSAGES[quota.reason] ?? MESSAGES.quota_error } };
  }
  return { ok: true };
}
