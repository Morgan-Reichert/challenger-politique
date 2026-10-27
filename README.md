# Challenger Politique — Présidentielle 2027

Comprendre chaque mesure des programmes, à partir de leur texte exact : explication,
définitions, implications, non-dits, faisabilité juridique. Même grille pour tous les
candidats, aucune consigne de vote.

Application sœur de [Challenger IA](https://github.com/Morgan-Reichert/challenger-ia-chatbot) :
service ouvert, **sans compte** (limite par adresse IP), base Supabase propre (corpus et quotas), moteur partagé
(`api/_lib/recherche.js`, `verifier.js`, `mistral.js`, `quota.js`, `admin.js`).

## Démarrer

```bash
npm install
cp .env.example .env      # au minimum MISTRAL_API_KEY
npm run dev               # http://localhost:3100 — l'API /api/* est servie par Vite
```

Sans Supabase, l'app tourne sur un **jeu de démonstration fictif** (`src/data/demo.json`).
Sans Supabase, l'API ne limite pas les appels (développement local uniquement).

## Mise en production

1. Exécuter `supabase/schema.sql` dans le SQL Editor du projet Supabase (corpus `pol_*` + quotas), ou `npx supabase db push` après `npx supabase link`.
2. Renseigner les variables de `.env.example` dans Vercel.
3. Alimenter le corpus, en deux temps (rien n'est écrit en base avant relecture) :

```bash
# a) Extraction → fichiers JSON dans corpus/ (non versionnés)
node --env-file=.env scripts/importer-ifrap.mjs                 # comparateur iFRAP, lu sans IA
node --env-file=.env scripts/extraire-programme.mjs --candidat "Prénom Nom" \
  --pdf corpus/programme.pdf --sortie corpus/nom.json \
  --titre "Programme 2027" --nature officiel_2027 --url https://…
# b) Chargement (embeddings + Supabase ; requiert SUPABASE_SERVICE_ROLE_KEY dans .env)
node --env-file=.env scripts/charger-corpus.mjs corpus/ifrap.json corpus/nom.json
```

   Chaque document porte sa **nature**, affichée à côté de chaque mesure :
   `officiel_2027`, `anterieur` (campagne précédente), `non_officiel` (synthèse d'un tiers non mandaté),
   `synthese_tierce` (résumé par un organisme comme l'iFRAP). Une citation qui ne figure pas mot pour mot
   dans le document est rejetée à l'extraction.

4. Lancer le banc de neutralité et publier son rapport : `node --env-file=.env evals/neutralite.mjs`

## Architecture

| Élément | Rôle |
|---|---|
| `api/analyse.js` | Analyse d'une mesure selon la grille (`api/_lib/grille.js`), contrôlée puis mise en cache — tout le monde lit la même |
| `api/question.js` | Questions sur les programmes, réponses uniquement depuis le corpus, extraits équilibrés par candidat |
| `api/faisabilite.js` | Faisabilité juridique sourcée : référentiel commun (`api/_lib/referentiel-juridique.js`) + recherche limitée aux sites juridiques officiels (nécessite `TAVILY_API_KEY`) |
| `api/budget.js` | Séries de finances publiques Eurostat (dépenses par fonction, recettes, solde, dette), sans clé, cache CDN 12 h |
| `pol_chiffrages` | Chiffrages publiés (candidat / organismes indépendants), saisis à la main avec leur source — jamais générés |
| `api/_lib/neutralite.js` | Lexique évaluatif, interception des consignes de vote, équilibre des réponses |
| `scripts/extraire-programme.mjs` | PDF ou page web → JSON ; rejette toute citation non verbatim |
| `scripts/importer-ifrap.mjs` | Comparateur iFRAP → JSON, lecture déterministe du HTML |
| `scripts/charger-corpus.mjs` | JSON → Supabase, avec embeddings |
| `evals/neutralite.mjs` | Symétrie entre candidats, interception, questions orientées |

Principes : voir la page `/methode` de l'application.
