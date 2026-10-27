import { useState } from 'react';
import { budgetEnsemble, budgetTheme, type Unite } from '../lib/api';
import { THEMES } from '../lib/themes';
import { useCharge } from '../lib/useCharge';
import Graphique from '../components/Graphique';
import { Carte, Chargement, EnTete, Erreur } from '../components/ui';

const THEMES_BUDGET = THEMES.filter((t) => !['fiscalite', 'immigration'].includes(t.id));

export function SelecteurUnite({ unite, onChange }: { unite: Unite; onChange: (u: Unite) => void }) {
  return (
    <div className="inline-flex rounded-full verre p-1 text-sm" role="group" aria-label="Unité">
      {([['PC_GDP', '% du PIB'], ['MIO_EUR', 'Milliards €']] as const).map(([u, label]) => (
        <button key={u} onClick={() => onChange(u)} aria-pressed={unite === u}
          className={`rounded-full px-4 py-1.5 transition-colors ${unite === u ? 'bg-pill text-pill-ink' : 'text-ink-2 hover:text-ink'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function BudgetPage() {
  const [unite, setUnite] = useState<Unite>('PC_GDP');
  const [theme, setTheme] = useState('social');
  const ensemble = useCharge(() => budgetEnsemble(unite), [unite]);
  const parTheme = useCharge(() => budgetTheme(theme, unite), [theme, unite]);

  return (
    <div>
      <EnTete surtitre="Budget de l'État" titre="Où en sont les finances publiques ?">
        Trente ans de données officielles, pour situer chaque proposition. Ces chiffres décrivent le passé :
        ils ne prédisent pas l'effet d'un programme.
      </EnTete>

      <div className="mb-5"><SelecteurUnite unite={unite} onChange={setUnite} /></div>

      {ensemble.charge && <Chargement texte="Chargement des données Eurostat…" />}
      {ensemble.erreur && <Erreur message={ensemble.erreur} />}
      {ensemble.data && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Carte className="p-5 sm:p-6 xl:col-span-2">
            <Graphique titre="Recettes et dépenses publiques" unite={ensemble.data.unite}
              series={ensemble.data.recettesDepenses.series} source={ensemble.data.recettesDepenses.source} />
          </Carte>
          <Carte className="p-5 sm:p-6">
            <Graphique titre="Solde public" unite={ensemble.data.unite} type="barres"
              series={ensemble.data.solde.series} source={ensemble.data.solde.source} />
            <p className="mt-3 text-sm text-ink-2">Un solde négatif est un déficit : les dépenses dépassent les recettes.</p>
          </Carte>
          <Carte className="p-5 sm:p-6">
            <Graphique titre="Dette publique" unite={ensemble.data.unite}
              series={ensemble.data.dette.series} source={ensemble.data.dette.source} />
            <p className="mt-3 text-sm text-ink-2">Dette de l'ensemble des administrations publiques, au sens du traité de Maastricht.</p>
          </Carte>
        </div>
      )}

      <section className="mt-10" aria-labelledby="titre-fonctions">
        <h2 id="titre-fonctions" className="text-2xl font-bold">Dépenses par grande fonction</h2>
        <p className="mt-1 text-ink-2">Ce que l'ensemble des administrations dépense pour chaque thème des programmes.</p>
        <div className="mt-4 flex gap-2 overflow-x-auto sans-barre pb-1" role="group" aria-label="Thème">
          {THEMES_BUDGET.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)} aria-pressed={theme === t.id}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm border transition-colors ${theme === t.id ? 'bg-pill text-pill-ink border-transparent' : 'border-line text-ink-2 hover:text-ink bg-surface-solid/60'}`}>
              {t.nom}
            </button>
          ))}
        </div>
        <Carte className="mt-4 p-5 sm:p-6">
          {parTheme.charge && <Chargement />}
          {parTheme.erreur && <Erreur message={parTheme.erreur} />}
          {parTheme.data && !parTheme.data.indisponible && (
            <>
              <Graphique titre={THEMES.find((t) => t.id === theme)?.nom ?? ''} unite={parTheme.data.unite}
                series={parTheme.data.series} source={parTheme.data.source} />
              <p className="mt-3 text-sm text-ink-2">{parTheme.data.note}</p>
            </>
          )}
          {parTheme.data?.indisponible && <p className="text-ink-2">{parTheme.data.message}</p>}
        </Carte>
      </section>
    </div>
  );
}
