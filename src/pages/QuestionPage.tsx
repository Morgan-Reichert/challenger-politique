import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, Plus, Trash2, X } from 'lucide-react';
import { poserQuestion } from '../lib/api';
import { candidats } from '../lib/corpus';
import { ordonner } from '../lib/ordre';
import { useCharge } from '../lib/useCharge';
import {
  type Conversation, type Echange, lireConversations, enregistrerConversation,
  supprimerConversation, effacerHistorique, nouvelId, titreDe,
} from '../lib/historique';
import BoiteQuestion from '../components/BoiteQuestion';
import { Reponse } from '../components/Reponse';
import { Conteneur, Erreur, Surtitre } from '../components/ui';

const vide = (): Conversation => ({ id: nouvelId(), titre: '', majLe: Date.now(), echanges: [] });

export default function QuestionPage() {
  const [params, setParams] = useSearchParams();
  const liste = useCharge(candidats, []);
  const [cible, setCible] = useState<string>('');
  const [conversation, setConversation] = useState<Conversation>(vide);
  const [historique, setHistorique] = useState<Conversation[]>(lireConversations);
  const [voirHistorique, setVoirHistorique] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const echanges = conversation.echanges;

  // Sauvegarde locale dès qu'une réponse arrive.
  useEffect(() => {
    if (echanges.some((e) => e.reponse || e.erreur)) {
      enregistrerConversation(conversation);
      setHistorique(lireConversations());
    }
  }, [conversation, echanges]);

  const majDernier = (patch: Partial<Echange>) =>
    setConversation((c) => ({ ...c, echanges: c.echanges.map((x, i) => (i === c.echanges.length - 1 ? { ...x, ...patch } : x)) }));

  const envoyer = async (q: string) => {
    setOccupe(true);
    setConversation((c) => ({ ...c, titre: c.titre || titreDe(q), echanges: [...c.echanges, { q }] }));
    try {
      majDernier(await poserQuestion(q, cible || undefined));
    } catch (err) {
      majDernier({ erreur: (err as Error).message });
    } finally { setOccupe(false); }
  };

  // Question transmise depuis l'accueil (une seule fois, même en StrictMode).
  const transmise = useRef(false);
  useEffect(() => {
    const q = params.get('q');
    if (q && !transmise.current) { transmise.current = true; setParams({}, { replace: true }); envoyer(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [echanges.length]);

  const ouvrir = (c: Conversation) => { setConversation(c); setVoirHistorique(false); };
  const supprimer = (id: string) => {
    supprimerConversation(id);
    setHistorique(lireConversations());
    if (conversation.id === id) setConversation(vide());
  };
  const toutEffacer = () => {
    if (!window.confirm('Effacer toutes les conversations enregistrées sur cet appareil ?')) return;
    effacerHistorique();
    setHistorique([]);
    setConversation(vide());
  };

  return (
    <Conteneur etroit>
      <header className="pt-12 pb-6">
        <Surtitre>Poser une question</Surtitre>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Interrogez les programmes.</h1>
        <p className="mt-3 text-ink-2">
          Les réponses s'appuient uniquement sur le texte des programmes, avec un renvoi vers chaque extrait.
          Vos conversations restent sur cet appareil : elles ne sont jamais envoyées ni conservées par nos serveurs.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => setConversation(vide())} disabled={echanges.length === 0}
            className="verre rounded-full inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium disabled:opacity-40">
            <Plus size={15} aria-hidden /> Nouvelle conversation
          </button>
          <button onClick={() => setVoirHistorique(!voirHistorique)} aria-expanded={voirHistorique}
            className="verre rounded-full inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium">
            <History size={15} aria-hidden /> Historique <span className="text-ink-3 tabular-nums">{historique.length}</span>
          </button>
        </div>

        {voirHistorique && (
          <div className="mt-3 verre rounded-3xl p-2">
            {historique.length === 0 ? (
              <p className="px-4 py-3 text-sm text-ink-3">Aucune conversation enregistrée sur cet appareil.</p>
            ) : (
              <>
                <ul className="max-h-72 overflow-y-auto">
                  {historique.map((c) => (
                    <li key={c.id} className="flex items-center gap-1">
                      <button onClick={() => ouvrir(c)}
                        className={`flex-1 min-w-0 text-left rounded-2xl px-4 py-2.5 hover:bg-surface-solid ${c.id === conversation.id ? 'bg-surface-solid' : ''}`}>
                        <span className="block text-sm font-medium truncate">{c.titre || 'Sans titre'}</span>
                        <span className="block text-xs text-ink-3">
                          {new Date(c.majLe).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })} · {c.echanges.length} question{c.echanges.length > 1 ? 's' : ''}
                        </span>
                      </button>
                      <button onClick={() => supprimer(c.id)} aria-label={`Supprimer « ${c.titre} »`}
                        className="shrink-0 w-9 h-9 grid place-items-center rounded-full text-ink-3 hover:text-ink hover:bg-surface-solid">
                        <X size={15} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <button onClick={toutEffacer} className="mt-1 w-full inline-flex items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm text-alert hover:bg-alert-soft">
                  <Trash2 size={14} aria-hidden /> Tout effacer de cet appareil
                </button>
              </>
            )}
          </div>
        )}
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
          <div className="mb-2 px-1 flex items-center gap-2 text-sm">
            <label htmlFor="cible" className="text-ink-3">Programme :</label>
            <select id="cible" value={cible} onChange={(e) => setCible(e.target.value)}
              className="bg-surface-solid border border-line rounded-full px-3 py-1 text-ink">
              <option value="">Tous les candidats</option>
              {liste.data && ordonner(liste.data).map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <BoiteQuestion onEnvoi={envoyer} occupe={occupe} />
        </div>
      </div>
    </Conteneur>
  );
}
