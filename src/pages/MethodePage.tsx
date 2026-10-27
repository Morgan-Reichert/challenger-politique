import { Conteneur, Surtitre, LegendeNiveaux } from '../components/ui';

const ENGAGEMENTS = [
  ['Le texte exact, toujours', 'Chaque analyse part d\'une citation mot pour mot du programme officiel, avec sa page. Lors de l\'intégration d\'un programme, toute citation qui ne figure pas à l\'identique dans le document est automatiquement rejetée.'],
  ['Une seule grille, pour tous', 'Toutes les mesures de tous les candidats sont analysées avec la même grille, dans le même ordre et avec les mêmes contraintes de volume. Si la grille change, toutes les analyses sont régénérées ensemble, jamais celles d\'un seul candidat.'],
  ['Décrire, pas juger', 'Aucun qualificatif de jugement, ni négatif ni positif. Un contrôle automatique détecte ces termes ; une analyse qui en contient est régénérée, et signalée si l\'écart persiste.'],
  ['Pas d\'intention prêtée', 'On ne devine pas ce que le candidat « veut vraiment dire ». On distingue ce qui est écrit, ce qui en découle directement (justification à l\'appui), et ce qui reste une hypothèse.'],
  ['Pas de chiffre inventé', 'Un chiffre n\'apparaît que s\'il figure dans le programme ou dans une source citée. Un contrôle automatique le vérifie.'],
  ['Des chiffres officiels, jamais générés', 'Les données budgétaires viennent telles quelles d\'Eurostat (à partir des données de l\'INSEE). Le coût d\'une mesure n\'est affiché que s\'il a été publié, par le candidat ou par un organisme indépendant, avec sa source ; les estimations divergentes sont montrées côte à côte.'],
  ['Le droit, textes à l\'appui', 'L\'analyse juridique confronte chaque mesure aux mêmes textes de référence (Constitution, Déclaration de 1789, Préambule de 1946, Convention européenne des droits de l\'homme, traités européens). Un obstacle qui ne renvoie à aucun texte est retiré.'],
  ['Aucune consigne de vote', 'Pas de note, pas de classement, pas de « meilleur candidat ». Les demandes de consigne de vote reçoivent une réponse fixe, identique pour tous, sans passer par l\'IA.'],
  ['Ordre tiré au sort', 'L\'ordre des candidats est tiré au sort à chaque visite, dans les listes, les comparaisons et les réponses.'],
  ['Même analyse pour tous', 'Une analyse est générée une fois, puis servie à l\'identique à tous les lecteurs. Elle ne dépend ni de votre profil ni de vos questions.'],
  ['Vos questions restent chez vous', 'Une question peut révéler une opinion politique. Le service fonctionne sans compte, et vos conversations sont conservées uniquement dans votre navigateur : nos serveurs ne les enregistrent pas. Vous pouvez les effacer à tout moment.'],
];

export default function MethodePage() {
  return (
    <Conteneur etroit>
      <header className="py-12">
        <Surtitre>Méthode & neutralité</Surtitre>
        <h1 className="mt-3 text-4xl sm:text-[44px] font-bold tracking-tight">Comment nous lisons les programmes.</h1>
        <p className="mt-5 text-lg text-ink-2 leading-relaxed">
          Aucun outil n'est parfaitement neutre : choisir quoi expliquer est déjà un choix. Plutôt que de promettre
          une neutralité impossible, nous rendons chaque choix <strong className="text-ink font-medium">visible et vérifiable</strong>.
        </p>
      </header>

      <ol className="space-y-8 pb-12 border-b border-line">
        {ENGAGEMENTS.map(([titre, texte], i) => (
          <li key={titre} className="grid grid-cols-[2.5rem_1fr] gap-2">
            <span className="font-semibold text-2xl text-accent tabular-nums">{i + 1}</span>
            <div>
              <h2 className="font-semibold text-xl">{titre}</h2>
              <p className="mt-1.5 text-ink-2 leading-relaxed">{texte}</p>
            </div>
          </li>
        ))}
      </ol>

      <section className="py-12 border-b border-line">
        <h2 className="font-semibold text-3xl">La grille d'analyse</h2>
        <p className="mt-3 text-ink-2">Chaque mesure est décrite en six temps : ce qu'elle dit (en bref et en détail) ; le sens réel de ses mots ; ses implications ; ce qu'elle ne précise pas ; le type de texte juridique qu'elle exigerait ; les questions qu'elle laisse ouvertes.</p>
        <p className="mt-6 mb-3 text-ink-2">Chaque implication porte l'un de ces trois niveaux :</p>
        <LegendeNiveaux />
      </section>

      <section className="py-12">
        <h2 className="font-semibold text-3xl">Limites</h2>
        <ul className="mt-4 space-y-3 text-ink-2 leading-relaxed list-disc pl-5">
          <li>Les analyses sont produites par un modèle de langage (Mistral AI) puis contrôlées automatiquement. Elles peuvent contenir des erreurs : le texte source reste la référence.</li>
          <li>L'analyse de faisabilité est documentaire. Ce n'est pas un avis juridique.</li>
          <li>Un programme absent ou incomplet produit une analyse incomplète. Nous n'intégrons que des documents officiels publiés par les candidats.</li>
          <li>Le code, les consignes données au modèle et les résultats de nos tests de neutralité seront publiés avant l'ouverture au public.</li>
        </ul>
      </section>
    </Conteneur>
  );
}
