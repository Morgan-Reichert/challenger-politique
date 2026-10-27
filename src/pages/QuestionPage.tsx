import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { poserQuestion } from '../lib/api';
import { useSession } from '../lib/auth';
import { candidats } from '../lib/corpus';
import { ordonner } from '../lib/ordre';
import { useCharge } from '../lib/useCharge';
import type { Controles, SourceReponse } from '../lib/types';
import BoiteQuestion from '../components/BoiteQuestion';
import { Reponse } from '../components/Reponse';
import { Conteneur, Erreur, Surtitre } from '../components/ui';

interface Echange { q: string; reponse?: string; sources?: SourceReponse[]; controles?: Controles; erreur?: string }

export default function QuestionPage() {
  const [params, setParams] = useSearchParams();
  const { utilisateur, pret, actif } = useSession();
  const liste = useCharge(candidats, []);
  const [cible, setCible] = useState<string>('');
  const [echanges, setEchanges] = useState<Echange[]>([]);
  const [occupe, setOccupe] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const peutPoser = !actif || !!utilisateur;

  const envoyer = async (q: string) => {
    setOccupe(true);
    setEchanges((e) => [...e, { q }]);
    try {
      const r = await poserQuestion(q, cible || undefined);
      setEchanges((e) => e.map((x, i) => (i === e.length - 1 ? { ...x, ...r } : x)));
    } catch (err) {
      setEchanges((e) => e.map((x, i) => (i === e.length - 1 ? { ...x, erreur: (err as Error).message } : x)));
    } finally { setOccupe(false); }
  };

  // Question transmise depuis l'accueil.
  useEffect(() => {
    const q = params.get('q');
    if (q && pret && peutPoser) { setParams({}, { replace: true }); envoyer(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pret, peutPoser]);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [echanges]);

  return (
    <Conteneur etroit>
      <header className="pt-12 pb-6">
        <Surtitre>Poser une question</Surtitre>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Interrogez les programmes.</h1>
        <p className="mt-3 text-ink-2">
          Les réponses s'appuient uniquement sur le texte des programmes, avec un renvoi vers chaque extrait.
          Vos questions ne sont pas enregistrées.
        </p>
      </header>

      <div className="space-y-10 pb-8 min-h-[30vh]">
        {echanges.map((e, i) => (
          <article key={i} className="space-y-4">
            <p className="font-semibold text-xl border-l-2 border-line pl-4">{e.q}</p>
            {e.erreur && <Erreur message={e.erreur} />}
            {!e.reponse && !e.erreur && <p className="respire text-ink-3">Recherche dans les programmes…</p>}
            {e.reponse && <Reponse texte={e.reponse} sources={e.sources ?? []} controles={e.controles ?? { conforme: true, atteintes: [] }} />}
          </article>
        ))}
        <div ref={fin} />
      </div>

      <div className="sticky bottom-3 z-10">
        <div className="verre rounded-3xl p-3">
          {peutPoser ? (
            <>
              <div className="mb-2 px-1 flex items-center gap-2 text-sm">
                <label htmlFor="cible" className="text-ink-3">Programme :</label>
                <select id="cible" value={cible} onChange={(e) => setCible(e.target.value)}
                  className="bg-surface-solid border border-line rounded-full px-3 py-1 text-ink">
                  <option value="">Tous les candidats</option>
                  {liste.data && ordonner(liste.data).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <BoiteQuestion onEnvoi={envoyer} occupe={occupe} />
            </>
          ) : (
            <div className="p-2 text-center">
              <Link to="/connexion?retour=/question" className="font-medium text-accent hover:underline">
                Connectez-vous avec votre compte Challenger pour poser une question →
              </Link>
            </div>
          )}
        </div>
      </div>
    </Conteneur>
  );
}
