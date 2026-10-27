import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { candidat } from '../lib/corpus';
import { THEMES, nomTheme } from '../lib/themes';
import { useCharge } from '../lib/useCharge';
import { Conteneur, Monogramme, Chargement, Erreur, Fil, libelleStatut } from '../components/ui';
import Introuvable from './Introuvable';

export default function CandidatPage() {
  const { id = '' } = useParams();
  const { data, erreur, charge } = useCharge(() => candidat(id), [id]);
  const [filtre, setFiltre] = useState<string | null>(null);

  const parTheme = useMemo(() => {
    const groupes = new Map<string, NonNullable<typeof data>['mesures']>();
    for (const t of THEMES) groupes.set(t.id, []);
    for (const m of data?.mesures ?? []) groupes.get(m.theme_id)?.push(m);
    return [...groupes.entries()].filter(([, ms]) => ms.length > 0);
  }, [data]);

  if (charge) return <Chargement />;
  if (erreur) return <Conteneur><div className="py-10"><Erreur message={erreur} /></div></Conteneur>;
  if (!data) return <Introuvable />;
  const { candidat: c, programmes, mesures } = data;
  const visibles = filtre ? parTheme.filter(([t]) => t === filtre) : parTheme;

  return (
    <Conteneur>
      <div className="py-8"><Fil etapes={[{ label: 'Accueil', to: '/' }, { label: c.nom }]} /></div>

      <header className="flex flex-col sm:flex-row sm:items-center gap-5 pb-8 border-b border-line">
        <Monogramme nom={c.nom} taille={72} />
        <div className="flex-1">
          <h1 className="text-4xl sm:text-[44px] font-bold tracking-tight">{c.nom}</h1>
          <p className="mt-1 text-ink-2">{c.formation ?? 'Sans étiquette'} · <span className="text-ink-3">{libelleStatut(c.statut)}</span></p>
        </div>
        <div className="text-sm space-y-1 sm:text-right">
          {programmes.map((p) => (
            <p key={p.id}>
              {p.url_officielle
                ? <a href={p.url_officielle} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">{p.titre} <ExternalLink size={13} aria-hidden /></a>
                : <span className="text-ink-2">{p.titre}</span>}
            </p>
          ))}
          <p className="text-ink-3">{mesures.length} mesures identifiées</p>
        </div>
      </header>

      <div className="py-6 flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="toolbar" aria-label="Filtrer par thème">
        <Pastille actif={!filtre} onClick={() => setFiltre(null)}>Tous les thèmes</Pastille>
        {parTheme.map(([t, ms]) => (
          <Pastille key={t} actif={filtre === t} onClick={() => setFiltre(t)}>{nomTheme(t)} <span className="text-ink-3">{ms.length}</span></Pastille>
        ))}
      </div>

      <div className="space-y-10 pb-10">
        {visibles.map(([t, ms]) => (
          <section key={t}>
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <h2 className="font-semibold text-2xl">{nomTheme(t)}</h2>
              <Link to={`/themes/${t}`} className="text-sm text-ink-3 hover:text-ink whitespace-nowrap">Comparer ce thème →</Link>
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {ms.map((m) => (
                <li key={m.id}>
                  <Link to={`/mesures/${m.id}`} className="group grid sm:grid-cols-[1fr_2fr_auto] gap-1 sm:gap-6 py-4 hover:bg-surface -mx-3 px-3 rounded-lg transition-colors">
                    <p className="font-medium">{m.intitule}</p>
                    <p className="text-ink-2 text-sm line-clamp-2 font-serif">« {m.texte_source} »</p>
                    <p className="text-xs text-ink-3 sm:text-right whitespace-nowrap">{m.page ? `p. ${m.page}` : ''} <span className="group-hover:text-ink">→</span></p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Conteneur>
  );
}

function Pastille({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={actif}
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm border transition-colors ${actif ? 'bg-pill text-pill-ink border-ink' : 'border-line text-ink-2 hover:border-ink-3'}`}>
      {children}
    </button>
  );
}
