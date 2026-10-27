-- ─────────────────────────────────────────────────────────────────────────────
-- Challenger Politique — schéma du corpus
--
-- À exécuter dans le MÊME projet Supabase que Challenger IA : les crédits
-- (user_credits, check_chat_quota) sont partagés. Toutes les tables de ce
-- produit sont préfixées pol_ pour ne jamais entrer en collision.
--
-- Principe : le corpus est PUBLIC en lecture (transparence), et n'est écrit
-- que par le serveur (service role) — scripts d'ingestion et API d'analyse.
-- Aucune donnée utilisateur n'est stockée ici : les questions posées révèlent
-- des opinions politiques (RGPD art. 9) et ne sont jamais journalisées.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Élection ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pol_elections (
  id          text PRIMARY KEY,                -- ex. 'presidentielle-2027'
  nom         text NOT NULL,
  date_tour1  date,
  date_tour2  date
);

INSERT INTO pol_elections (id, nom, date_tour1)
VALUES ('presidentielle-2027', 'Élection présidentielle 2027', NULL)
ON CONFLICT (id) DO NOTHING;

-- ─── Candidats ───────────────────────────────────────────────────────────────
-- Aucune couleur de parti : l'interface présente tous les candidats à
-- l'identique. `statut` suit la vie de la candidature (déclarée → officielle
-- après validation des parrainages par le Conseil constitutionnel).
CREATE TABLE IF NOT EXISTS pol_candidats (
  id            text PRIMARY KEY,              -- slug, ex. 'nom-prenom'
  election_id   text NOT NULL REFERENCES pol_elections(id),
  nom           text NOT NULL,
  formation     text,                          -- parti / mouvement, tel que déclaré
  statut        text NOT NULL DEFAULT 'declare'
                CHECK (statut IN ('pressenti', 'declare', 'officiel', 'retire')),
  site_officiel text,
  cree_le       timestamptz NOT NULL DEFAULT now()
);

-- ─── Programmes (documents sources) ──────────────────────────────────────────
-- Le PDF n'est pas republié : on conserve l'URL officielle, une copie
-- archivée (web.archive.org) et l'empreinte SHA-256 du fichier ingéré, pour
-- prouver que l'analyse porte bien sur ce texte-là.
CREATE TABLE IF NOT EXISTS pol_programmes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidat_id   text NOT NULL REFERENCES pol_candidats(id) ON DELETE CASCADE,
  titre         text NOT NULL,
  url_officielle text,
  url_archive   text,
  sha256        text NOT NULL,
  publie_le     date,
  ingere_le     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidat_id, sha256)
);

-- ─── Thèmes (grille commune à tous les candidats) ────────────────────────────
CREATE TABLE IF NOT EXISTS pol_themes (
  id    text PRIMARY KEY,
  nom   text NOT NULL,
  ordre int  NOT NULL DEFAULT 0
);

INSERT INTO pol_themes (id, nom, ordre) VALUES
  ('economie',      'Économie & emploi',            1),
  ('fiscalite',     'Fiscalité & finances publiques', 2),
  ('social',        'Protection sociale & retraites', 3),
  ('sante',         'Santé',                          4),
  ('education',     'Éducation & recherche',          5),
  ('securite',      'Sécurité & justice',             6),
  ('immigration',   'Immigration & intégration',      7),
  ('environnement', 'Environnement & énergie',        8),
  ('europe',        'Europe & international',         9),
  ('institutions',  'Institutions & démocratie',     10),
  ('territoires',   'Territoires, logement & transports', 11),
  ('culture',       'Culture, médias & numérique',   12)
ON CONFLICT (id) DO NOTHING;

-- ─── Mesures ─────────────────────────────────────────────────────────────────
-- Une mesure = un engagement identifiable, avec son texte EXACT et sa page.
-- `texte_source` n'est jamais reformulé : la reformulation vit dans l'analyse.
CREATE TABLE IF NOT EXISTS pol_mesures (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id  uuid NOT NULL REFERENCES pol_programmes(id) ON DELETE CASCADE,
  candidat_id   text NOT NULL REFERENCES pol_candidats(id) ON DELETE CASCADE,
  theme_id      text NOT NULL REFERENCES pol_themes(id),
  intitule      text NOT NULL,                 -- titre court, neutre
  texte_source  text NOT NULL,                 -- citation exacte du programme
  page          int,
  embedding     vector(1024),                  -- mistral-embed
  cree_le       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pol_mesures_candidat_idx ON pol_mesures (candidat_id);
CREATE INDEX IF NOT EXISTS pol_mesures_theme_idx    ON pol_mesures (theme_id);
CREATE INDEX IF NOT EXISTS pol_mesures_embedding_idx
  ON pol_mesures USING hnsw (embedding vector_cosine_ops);

-- ─── Analyses (cache) ────────────────────────────────────────────────────────
-- Une analyse par mesure et par version de la grille. Elle est générée une
-- fois, puis servie à tous : tout le monde lit la même analyse, ce qui la
-- rend auditable — et empêche qu'elle varie selon l'utilisateur.
CREATE TABLE IF NOT EXISTS pol_analyses (
  mesure_id     uuid NOT NULL REFERENCES pol_mesures(id) ON DELETE CASCADE,
  version_grille text NOT NULL,
  contenu       jsonb NOT NULL,
  controles     jsonb NOT NULL,                -- résultat de verifier.js
  modele        text NOT NULL,
  genere_le     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mesure_id, version_grille)
);

-- ─── Recherche sémantique ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pol_rechercher_mesures(
  p_embedding   vector(1024),
  p_candidat_id text DEFAULT NULL,
  p_limite      int  DEFAULT 8
)
RETURNS TABLE (
  id uuid, candidat_id text, theme_id text, intitule text,
  texte_source text, page int, similarite float
)
LANGUAGE sql STABLE AS $$
  SELECT m.id, m.candidat_id, m.theme_id, m.intitule, m.texte_source, m.page,
         1 - (m.embedding <=> p_embedding) AS similarite
  FROM pol_mesures m
  WHERE m.embedding IS NOT NULL
    AND (p_candidat_id IS NULL OR m.candidat_id = p_candidat_id)
  ORDER BY m.embedding <=> p_embedding
  LIMIT p_limite;
$$;

-- ─── Sécurité : lecture publique, écriture serveur uniquement ────────────────
ALTER TABLE pol_elections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pol_candidats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pol_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pol_themes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pol_mesures    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pol_analyses   ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pol_elections','pol_candidats','pol_programmes','pol_themes','pol_mesures','pol_analyses']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS lecture_publique ON %I', t);
    EXECUTE format('CREATE POLICY lecture_publique ON %I FOR SELECT USING (true)', t);
  END LOOP;
END $$;
-- Aucune policy INSERT/UPDATE/DELETE : seul le service role (qui contourne
-- RLS) écrit dans le corpus.

-- ─── Chiffrages ──────────────────────────────────────────────────────────────
-- Coût ou rendement d'une mesure, tel qu'ANNONCÉ par le candidat ou ESTIMÉ par
-- un organisme indépendant (IPP, OFCE, Institut Montaigne, Cour des comptes,
-- Fipeco…). Saisie manuelle et sourcée uniquement : aucun chiffrage n'est
-- produit par le modèle. Les estimations divergentes sont toutes conservées et
-- affichées côte à côte.
CREATE TABLE IF NOT EXISTS pol_chiffrages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesure_id     uuid NOT NULL REFERENCES pol_mesures(id) ON DELETE CASCADE,
  origine       text NOT NULL CHECK (origine IN ('candidat', 'independant')),
  organisme     text NOT NULL,
  source_url    text NOT NULL,
  publie_le     date,
  montant_min   numeric,                       -- milliards d'euros
  montant_max   numeric,                       -- = min si estimation ponctuelle
  sens          text NOT NULL CHECK (sens IN ('cout', 'economie', 'recette')),
  horizon       text,                          -- ex. 'par an à terme', 'sur 5 ans'
  methode       text,                          -- hypothèses principales, en une ou deux phrases
  cree_le       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pol_chiffrages_mesure_idx ON pol_chiffrages (mesure_id);
ALTER TABLE pol_chiffrages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lecture_publique ON pol_chiffrages;
CREATE POLICY lecture_publique ON pol_chiffrages FOR SELECT USING (true);
