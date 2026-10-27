import { Link } from 'react-router-dom';
import { compteParTheme } from '../lib/corpus';
import { THEMES } from '../lib/themes';
import { useCharge } from '../lib/useCharge';
import { Conteneur, Surtitre } from '../components/ui';

export default function ThemesPage() {
  const comptes = useCharge(compteParTheme, []);
  return (
    <Conteneur>
      <header className="py-12 max-w-2xl">
        <Surtitre>Comparer</Surtitre>
        <h1 className="mt-3 text-4xl sm:text-[44px] font-bold tracking-tight">Un thème, tous les candidats.</h1>
        <p className="mt-4 text-ink-2 text-lg">Choisissez un sujet pour voir côte à côte ce que propose chaque programme, dans le texte.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pb-10">
        {THEMES.map((t, i) => {
          const n = comptes.data?.[t.id] ?? 0;
          return (
            <li key={t.id}>
              <Link to={`/themes/${t.id}`} className="flex flex-col justify-between h-32 verre rounded-3xl p-5 hover:border-ink-3 transition-colors">
                <span className="text-xs tabular-nums text-ink-3">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block font-semibold text-xl leading-snug">{t.nom}</span>
                  <span className="text-sm text-ink-3">{n} mesure{n > 1 ? 's' : ''}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Conteneur>
  );
}
