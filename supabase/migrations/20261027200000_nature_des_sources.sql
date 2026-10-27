-- ─────────────────────────────────────────────────────────────────────────────
-- Nature des documents sources
--
-- Toutes les mesures n'ont pas la même origine. Le lecteur doit savoir, pour
-- chacune, s'il lit un programme officiel 2027, un document d'une campagne
-- antérieure, une synthèse non officielle ou le résumé d'un organisme tiers.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE pol_programmes
  ADD COLUMN IF NOT EXISTS nature text NOT NULL DEFAULT 'officiel_2027'
    CHECK (nature IN ('officiel_2027', 'anterieur', 'non_officiel', 'synthese_tierce')),
  ADD COLUMN IF NOT EXISTS contexte text,   -- ex. « Présidentielle 2022 », « Législatives 2024 (NFP) »
  ADD COLUMN IF NOT EXISTS editeur  text;   -- qui publie le document (candidat, parti, organisme tiers)

-- Dates officielles du scrutin.
UPDATE pol_elections SET date_tour1 = '2027-04-18', date_tour2 = '2027-05-02'
 WHERE id = 'presidentielle-2027';

-- La défense rejoint le thème international (grille commune à toutes les sources).
UPDATE pol_themes SET nom = 'Europe, international & défense' WHERE id = 'europe';

-- La recherche renvoie aussi la nature du document, pour que les réponses
-- puissent dire d'où vient chaque extrait.
DROP FUNCTION IF EXISTS pol_rechercher_mesures(vector, text, int);
CREATE FUNCTION pol_rechercher_mesures(
  p_embedding   vector(1024),
  p_candidat_id text DEFAULT NULL,
  p_limite      int  DEFAULT 8
)
RETURNS TABLE (
  id uuid, candidat_id text, theme_id text, intitule text, texte_source text, page int,
  nature text, contexte text, editeur text, similarite float
)
LANGUAGE sql STABLE AS $$
  SELECT m.id, m.candidat_id, m.theme_id, m.intitule, m.texte_source, m.page,
         p.nature, p.contexte, p.editeur,
         1 - (m.embedding <=> p_embedding) AS similarite
  FROM pol_mesures m
  JOIN pol_programmes p ON p.id = m.programme_id
  WHERE m.embedding IS NOT NULL
    AND (p_candidat_id IS NULL OR m.candidat_id = p_candidat_id)
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_limite;
$$;
