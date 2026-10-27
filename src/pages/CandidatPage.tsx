import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { candidat } from '../lib/corpus';
import { THEMES, nomTheme } from '../lib/themes';
import { useCharge } from '../lib/useCharge';
import { Carte, Monogramme, Chargement, Erreur, Fil, libelleStatut, BadgeSource } from '../components/ui';
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
  if (erreur) return <Erreur message={erreur} />;
  if (!data) return <Introuvable />;
  const { candidat: c, programmes, mesures } = data;
  const visibles = filtre ? parTheme.filter(([t]) => t === filtre) : parTheme;
  const programmeDe = new Map(programmes.map((p) => [p.id, p]));
  const plusieursSources = programmes.length > 1;

  return (
    <div>
      <div className="pb-4 px-1"><Fil etapes={[{ label: 'Accueil', to: '/' }, { label: 'Candidats', to: '/candidats' }, { label: c.nom }]} /></div>

      <Carte className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Monogramme nom={c.nom} taille={72} />
          <div className="flex-1">
            <h1 className="text-3xl sm:text-[42px] font-bold tracking-tight">{c.nom}</h1>
            <p className="mt-1 text-ink-2">{c.formation ?? 'Formation non renseignée'} · <span className="text-ink-3">{libelleStatut(c.statut)}</span></p>
          </div>
          <p className="text-sm text-ink-3 tabular-nums">{mesures.length} mesures</p>
        </div>

        <div className="mt-6 pt-5 border-t border-line">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3 mb-3">Sources analysées</p>
          <ul className="space-y-2">
            {programmes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                <BadgeSource programme={p} />
                {p.url_officielle
                  ? <a href={p.url_officielle} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline">{p.titre} <ExternalLink size={13} aria-hidden /></a>
                  : <span className="text-ink-2">{p.titre}</span>}
                <span className="text-ink-3 tabular-nums">· {mesures.filter((m) => m.programme_id === p.id).length} mesures</span>
              </li>
            ))}
          </ul>
          {programmes.every((p) => p.nature !== 'officiel_2027') && (
            <p className="mt-4 rounded-2xl bg-pastel-sable px-4 py-3 text-sm">
              Aucun programme officiel 2027 de ce candidat n'est encore intégré. Les mesures ci-dessous viennent de documents antérieurs ou de synthèses tierces : elles peuvent ne pas refléter son projet actuel.
            </p>
          )}
        </div>
      </Carte>

      <div className="py-6 flex gap-2 overflow-x-auto sans-barre sm:flex-wrap" role="toolbar" aria-label="Filtrer par thème">
        <Pastille actif={!filtre} onClick={() => setFiltre(null)}>Tous les thèmes</Pastille>
        {parTheme.map(([t, ms]) => (
          <Pastille key={t} actif={filtre === t} onClick={() => setFiltre(t)}>{nomTheme(t)} <span className="text-ink-3">{ms.length}</span></Pastille>
        ))}
      </div>

      <div className="space-y-10 pb-10">
        {visibles.map(([t, ms]) => (
          <section key={t}>
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <h2 className="font-bold text-xl sm:text-2xl">{nomTheme(t)}</h2>
              <Link to={`/themes/${t}`} className="text-sm text-ink-3 hover:text-ink whitespace-nowrap">Comparer ce thème →</Link>
            </div>
            <ul className="verre rounded-3xl divide-y divide-line px-3">
              {ms.map((m) => (
                <li key={m.id}>
                  <Link to={`/mesures/${m.id}`} className="group grid sm:grid-cols-[1fr_2fr_auto] gap-1 sm:gap-6 py-4 px-3 hover:bg-surface-solid/70 rounded-2xl transition-colors">
                    <p className="font-medium">{m.intitule}</p>
                    <p className="text-ink-2 text-sm line-clamp-2 font-serif">« {m.texte_source} »</p>
                    <p className="text-xs text-ink-3 sm:text-right whitespace-nowrap flex sm:flex-col sm:items-end gap-1.5">
                      {plusieursSources && <BadgeSource programme={programmeDe.get(m.programme_id)} />}
                      <span>{m.page ? `p. ${m.page} ` : ''}<span className="group-hover:text-ink">→</span></span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
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
