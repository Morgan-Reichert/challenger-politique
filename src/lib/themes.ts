/** Grille thématique commune — miroir de pol_themes (supabase/schema.sql). */
export const THEMES = [
  { id: 'economie', nom: 'Économie & emploi' },
  { id: 'fiscalite', nom: 'Fiscalité & finances publiques' },
  { id: 'social', nom: 'Protection sociale & retraites' },
  { id: 'sante', nom: 'Santé' },
  { id: 'education', nom: 'Éducation & recherche' },
  { id: 'securite', nom: 'Sécurité & justice' },
  { id: 'immigration', nom: 'Immigration & intégration' },
  { id: 'environnement', nom: 'Environnement & énergie' },
  { id: 'europe', nom: 'Europe & international' },
  { id: 'institutions', nom: 'Institutions & démocratie' },
  { id: 'territoires', nom: 'Territoires, logement & transports' },
  { id: 'culture', nom: 'Culture, médias & numérique' },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

export const nomTheme = (id: string) => THEMES.find((t) => t.id === id)?.nom ?? id;
