/**
 * Ordre d'affichage des candidats : aléatoire, tiré une fois par session de
 * navigation. Aucun candidat n'est systématiquement en tête de liste ; et
 * l'ordre reste stable pendant la visite, pour ne pas désorienter.
 */
const CLE = 'pol-ordre-graine';

function graine(): number {
  try {
    const existante = sessionStorage.getItem(CLE);
    if (existante) return Number(existante);
    const g = Math.floor(Math.random() * 2 ** 31);
    sessionStorage.setItem(CLE, String(g));
    return g;
  } catch {
    return Math.floor(Math.random() * 2 ** 31);
  }
}

const G = graine();

function rang(id: string): number {
  let h = G ^ 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function ordonner<T extends { id: string }>(liste: T[]): T[] {
  return [...liste].sort((a, b) => rang(a.id) - rang(b.id));
}
