export interface Candidat {
  id: string;
  nom: string;
  formation: string | null;
  statut: 'pressenti' | 'declare' | 'officiel' | 'retire';
  site_officiel?: string | null;
}

export interface Programme {
  id: string;
  candidat_id: string;
  titre: string;
  url_officielle: string | null;
  url_archive?: string | null;
}

export interface Mesure {
  id: string;
  candidat_id: string;
  programme_id: string;
  theme_id: string;
  intitule: string;
  texte_source: string;
  page: number | null;
}

export type Niveau = 'explicite' | 'deduit' | 'hypothese';

export interface Analyse {
  resume: string;
  explication: { simple: string; detaillee: string };
  definitions: { terme: string; sens_dans_le_texte: string; sens_technique: string; ambiguite: string | null }[];
  implications: { public: string; effet: string; niveau: Niveau; justification: string }[];
  non_precise: { element: string; detail: string }[];
  faisabilite: { vehicule: string; commentaire: string; confiance: string };
  questions_a_poser: string[];
}

export interface Controles {
  conforme: boolean;
  atteintes: string[];
  termes_evaluatifs?: string[];
}

export interface SourceReponse {
  n: number;
  mesure_id: string;
  candidat_id: string;
  candidat_nom: string;
  intitule: string;
  page: number | null;
  texte_source: string;
}
