/**
 * Historique des conversations — stocké UNIQUEMENT dans ce navigateur
 * (localStorage). Rien n'est envoyé ni conservé côté serveur : une question
 * peut révéler une opinion politique, elle reste donc sur l'appareil de la
 * personne qui l'a posée.
 *
 * Le stockage peut être indisponible (navigation privée, données bloquées) :
 * toutes les lectures et écritures sont protégées, et l'application continue
 * de fonctionner, simplement sans mémoire d'une visite à l'autre.
 */
import type { Controles, SourceReponse } from './types';

export interface Echange {
  q: string;
  reponse?: string;
  sources?: SourceReponse[];
  controles?: Controles;
  erreur?: string;
}

export interface Conversation {
  id: string;
  titre: string;
  majLe: number;
  echanges: Echange[];
}

const CLE = 'pol-conversations';
const MAX_CONVERSATIONS = 30;

export function lireConversations(): Conversation[] {
  try {
    const brut = localStorage.getItem(CLE);
    const liste = brut ? (JSON.parse(brut) as Conversation[]) : [];
    return Array.isArray(liste) ? liste.sort((a, b) => b.majLe - a.majLe) : [];
  } catch {
    return [];
  }
}

function ecrire(liste: Conversation[]) {
  try {
    localStorage.setItem(CLE, JSON.stringify(liste.slice(0, MAX_CONVERSATIONS)));
  } catch { /* stockage plein ou indisponible : on continue sans mémoire */ }
}

export function enregistrerConversation(c: Conversation) {
  // Une réponse encore en cours n'est pas sauvegardée dans cet état.
  const echanges = c.echanges.filter((e) => e.reponse || e.erreur);
  if (echanges.length === 0) return;
  const autres = lireConversations().filter((x) => x.id !== c.id);
  ecrire([{ ...c, echanges, majLe: Date.now() }, ...autres]);
}

export function supprimerConversation(id: string) {
  ecrire(lireConversations().filter((c) => c.id !== id));
}

export function effacerHistorique() {
  try { localStorage.removeItem(CLE); } catch { /* ignoré */ }
}

export function nouvelId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function titreDe(q: string) {
  const t = q.replace(/\s+/g, ' ').trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}
