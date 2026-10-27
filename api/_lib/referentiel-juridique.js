/**
 * Référentiel juridique de base — fourni au modèle à CHAQUE analyse de
 * faisabilité, en plus des sources trouvées par la recherche.
 *
 * Il garantit un socle commun : toutes les mesures, de tous les candidats,
 * sont confrontées aux mêmes textes de référence. Les résumés sont
 * volontairement descriptifs et courts ; la référence reste le texte officiel,
 * dont l'URL est donnée (versions publiées par le Conseil constitutionnel).
 */
const CONSTITUTION = 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/texte-integral-de-la-constitution-du-4-octobre-1958-en-vigueur';
const DDHC = 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/declaration-des-droits-de-l-homme-et-du-citoyen-de-1789';
const PREAMBULE_1946 = 'https://www.conseil-constitutionnel.fr/le-bloc-de-constitutionnalite/preambule-de-la-constitution-du-27-octobre-1946';
const CEDH = 'https://www.echr.coe.int/documents/d/echr/convention_fra';
const TRAITES_UE = 'https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:12016ME/TXT';

export const REFERENTIEL = [
  { titre: 'Constitution, art. 34 — domaine de la loi', url: CONSTITUTION,
    extrait: 'La loi fixe notamment les règles concernant les droits civiques et les garanties fondamentales des libertés publiques, la nationalité, la détermination des crimes et délits et des peines, la procédure pénale, l\'assiette, le taux et les modalités de recouvrement des impositions de toutes natures, le régime électoral. Elle détermine les principes fondamentaux de l\'enseignement, du droit du travail, du droit syndical et de la sécurité sociale.' },
  { titre: 'Constitution, art. 37 — domaine réglementaire', url: CONSTITUTION,
    extrait: 'Les matières autres que celles qui sont du domaine de la loi ont un caractère réglementaire : elles relèvent de décrets du Gouvernement.' },
  { titre: 'Constitution, art. 38 — ordonnances', url: CONSTITUTION,
    extrait: 'Le Gouvernement peut, pour l\'exécution de son programme, demander au Parlement l\'autorisation de prendre par ordonnances, pendant un délai limité, des mesures qui sont normalement du domaine de la loi.' },
  { titre: 'Constitution, art. 11 — référendum', url: CONSTITUTION,
    extrait: 'Le Président de la République peut soumettre au référendum un projet de loi portant sur l\'organisation des pouvoirs publics, sur des réformes relatives à la politique économique, sociale ou environnementale et aux services publics, ou tendant à autoriser la ratification d\'un traité. Un référendum peut aussi être organisé à l\'initiative d\'un cinquième des parlementaires, soutenue par un dixième des électeurs inscrits.' },
  { titre: 'Constitution, art. 89 — révision de la Constitution', url: CONSTITUTION,
    extrait: 'L\'initiative de la révision appartient au Président de la République sur proposition du Premier ministre et aux parlementaires. Le texte doit être voté en termes identiques par les deux assemblées, puis approuvé par référendum ; un projet présidentiel peut à la place être approuvé par le Parlement réuni en Congrès à la majorité des trois cinquièmes. La forme républicaine du Gouvernement ne peut faire l\'objet d\'une révision.' },
  { titre: 'Constitution, art. 40 — recevabilité financière', url: CONSTITUTION,
    extrait: 'Les propositions et amendements formulés par les membres du Parlement ne sont pas recevables lorsque leur adoption aurait pour conséquence soit une diminution des ressources publiques, soit la création ou l\'aggravation d\'une charge publique.' },
  { titre: 'Constitution, art. 47 et 47-1 — lois de finances et de financement de la sécurité sociale', url: CONSTITUTION,
    extrait: 'Le Parlement vote les projets de loi de finances et les projets de loi de financement de la sécurité sociale dans les conditions prévues par une loi organique, avec des délais d\'examen encadrés.' },
  { titre: 'Constitution, art. 55 — autorité des traités', url: CONSTITUTION,
    extrait: 'Les traités ou accords régulièrement ratifiés ou approuvés ont, dès leur publication, une autorité supérieure à celle des lois, sous réserve, pour chaque accord ou traité, de son application par l\'autre partie.' },
  { titre: 'Constitution, art. 61 et 61-1 — contrôle de constitutionnalité', url: CONSTITUTION,
    extrait: 'Une loi peut être déférée au Conseil constitutionnel avant sa promulgation, notamment par soixante députés ou soixante sénateurs. Après son entrée en vigueur, une disposition législative peut être contestée par une question prioritaire de constitutionnalité.' },
  { titre: 'Constitution, art. 72 — libre administration des collectivités', url: CONSTITUTION,
    extrait: 'Les collectivités territoriales s\'administrent librement par des conseils élus, dans les conditions prévues par la loi.' },
  { titre: 'Constitution, art. 88-1 — Union européenne', url: CONSTITUTION,
    extrait: 'La République participe à l\'Union européenne, constituée d\'États qui ont choisi librement d\'exercer en commun certaines de leurs compétences en vertu des traités européens.' },
  { titre: 'Déclaration des droits de l\'homme et du citoyen (1789), art. 13 et 17', url: DDHC,
    extrait: 'Art. 13 : la contribution commune doit être également répartie entre tous les citoyens, en raison de leurs facultés. Art. 17 : la propriété étant un droit inviolable et sacré, nul ne peut en être privé, si ce n\'est lorsque la nécessité publique l\'exige évidemment, et sous la condition d\'une juste et préalable indemnité.' },
  { titre: 'Préambule de la Constitution de 1946', url: PREAMBULE_1946,
    extrait: 'Il garantit notamment le droit d\'obtenir un emploi, le droit de grève dans le cadre des lois, la protection de la santé et la sécurité matérielle, l\'égal accès à l\'instruction, et le droit d\'asile pour toute personne persécutée en raison de son action en faveur de la liberté.' },
  { titre: 'Convention européenne des droits de l\'homme', url: CEDH,
    extrait: 'La France est partie à la Convention. Ses juridictions en appliquent les stipulations et les arrêts définitifs de la Cour européenne des droits de l\'homme s\'imposent aux États parties dans les litiges auxquels ils sont parties (art. 46).' },
  { titre: 'Traités de l\'Union européenne (TUE, TFUE)', url: TRAITES_UE,
    extrait: 'Les traités répartissent les compétences entre l\'Union et les États membres (compétences exclusives, partagées, d\'appui), garantissent les libertés de circulation et encadrent les aides d\'État. Le droit de l\'Union prime sur le droit national selon la jurisprudence de la Cour de justice.' },
];

/** Sites interrogés pour les recherches juridiques ciblées. */
export const DOMAINES_JURIDIQUES = [
  'legifrance.gouv.fr', 'conseil-constitutionnel.fr', 'conseil-etat.fr',
  'eur-lex.europa.eu', 'echr.coe.int', 'vie-publique.fr', 'assemblee-nationale.fr', 'senat.fr',
];
