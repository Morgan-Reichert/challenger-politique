import { Link, useParams } from 'react-router-dom';
import { Shuffle } from 'lucide-react';
import { candidats, mesuresDuTheme } from '../lib/corpus';
import { ordonner } from '../lib/ordre';
import { THEMES, nomTheme } from '../lib/themes';
import { useCharge } from '../lib/useCharge';
import { Conteneur, Chargement, Erreur, Fil, Monogramme, Surtitre } from '../components/ui';
import Introuvable from './Introuvable';

export default function ThemePage() {
  const { id = '' } = useParams();
  const donnees = useCharge(async () => {
    const [cs, ms] = await Promise.all([candidats(), mesuresDuTheme(id)]);
    return { candidats: ordonner(cs), mesures: ms };
  }, [id]);

  if (!THEMES.some((t) => t.id === id)) return <Introuvable />;

  return (
    <Conteneur>
      <div className="py-8"><Fil etapes={[{ label: 'Accueil', to: '/' }, { label: 'Comparer', to: '/themes' }, { label: nomTheme(id) }]} /></div>
      <header className="pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Surtitre>Comparaison</Surtitre>
          <h1 className="mt-3 text-4xl sm:text-[44px] font-bold tracking-tight">{nomTheme(id)}</h1>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-3"><Shuffle size={14} aria-hidden /> Colonnes dans un ordre tiré au sort</p>
      </header>

      {donnees.charge && <Chargement />}
      {donnees.erreur && <Erreur message={donnees.erreur} />}
      {donnees.data && (
        <div className="grid gap-4 pb-10" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 280px), 1fr))` }}>
          {donnees.data.candidats.map((c) => {
            const ms = donnees.data!.mesures.filter((m) => m.candidat_id === c.id);
            return (
              <section key={c.id} className="verre rounded-3xl flex flex-col">
                <Link to={`/candidats/${c.id}`} className="flex items-center gap-3 p-5 border-b border-line hover:bg-surface-2 rounded-t-2xl">
                  <Monogramme nom={c.nom} taille={36} />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-lg leading-tight">{c.nom}</h2>
                    <p className="text-xs text-ink-3 truncate">{c.formation}</p>
                  </div>
                </Link>
                {ms.length === 0 ? (
                  <p className="p-5 text-sm text-ink-3 italic">Aucune mesure identifiée sur ce thème dans le programme disponible.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {ms.map((m) => (
                      <li key={m.id}>
                        <Link to={`/mesures/${m.id}`} className="block p-5 hover:bg-surface-2 transition-colors">
                          <p className="font-medium">{m.intitule}</p>
                          <p className="mt-2 font-serif text-ink-2 leading-relaxed">« {m.texte_source} »</p>
                          <p className="mt-3 text-xs text-ink-3">{m.page ? `Page ${m.page} · ` : ''}<span className="text-accent">Analyser →</span></p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </Conteneur>
  );
}
