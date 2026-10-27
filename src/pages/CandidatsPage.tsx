import { Link } from 'react-router-dom';
import { ArrowRight, Shuffle } from 'lucide-react';
import { candidats } from '../lib/corpus';
import { ordonner } from '../lib/ordre';
import { useCharge } from '../lib/useCharge';
import { Chargement, EnTete, Erreur, Monogramme, libelleStatut } from '../components/ui';

export default function CandidatsPage() {
  const liste = useCharge(candidats, []);
  return (
    <div>
      <EnTete surtitre="Candidats" titre="Les programmes, un par un.">
        Chaque candidat dont le programme officiel a été publié. Tous sont présentés de la même façon.
      </EnTete>
      <p className="flex items-center gap-1.5 text-xs text-ink-3 mb-3"><Shuffle size={13} aria-hidden /> Ordre tiré au sort à chaque visite</p>
      {liste.charge && <Chargement />}
      {liste.erreur && <Erreur message={liste.erreur} />}
      {liste.data?.length === 0 && <p className="text-ink-2">Aucun programme n'a encore été intégré.</p>}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {liste.data && ordonner(liste.data).map((c) => (
          <li key={c.id}>
            <Link to={`/candidats/${c.id}`} className="group verre rounded-3xl flex items-center gap-4 p-5 hover:-translate-y-0.5 transition-transform">
              <Monogramme nom={c.nom} taille={56} />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-tight">{c.nom}</p>
                <p className="text-sm text-ink-2 truncate">{c.formation ?? 'Formation non renseignée'}</p>
                <p className="text-xs text-ink-3 mt-1">{libelleStatut(c.statut)}</p>
              </div>
              <ArrowRight size={18} className="text-ink-3 group-hover:text-ink transition-colors" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
