import { useEffect, useState, type DependencyList } from 'react';

/** Charge une donnée asynchrone ; ignore les réponses arrivées après un changement de dépendances. */
export function useCharge<T>(charger: () => Promise<T>, deps: DependencyList) {
  const [etat, setEtat] = useState<{ data: T | null; erreur: string | null; charge: boolean }>({ data: null, erreur: null, charge: true });
  useEffect(() => {
    let actif = true;
    setEtat({ data: null, erreur: null, charge: true });
    charger()
      .then((data) => { if (actif) setEtat({ data, erreur: null, charge: false }); })
      .catch((e) => { if (actif) setEtat({ data: null, erreur: e?.message ?? 'Erreur de chargement.', charge: false }); });
    return () => { actif = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return etat;
}
