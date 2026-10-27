import { Link } from 'react-router-dom';
import { Conteneur } from '../components/ui';

export default function Introuvable() {
  return (
    <Conteneur etroit>
      <div className="py-24 text-center">
        <p className="font-semibold text-5xl">Introuvable</p>
        <p className="mt-4 text-ink-2">Cette page n'existe pas, ou la mesure a été retirée du corpus.</p>
        <Link to="/" className="mt-6 inline-block text-accent hover:underline">Retour à l'accueil</Link>
      </div>
    </Conteneur>
  );
}
