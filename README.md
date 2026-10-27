# Challenger Politique — Présidentielle 2027

Comprendre chaque mesure des programmes, à partir de leur texte exact : explication,
définitions, implications, non-dits, faisabilité juridique. Même grille pour tous les
candidats, aucune consigne de vote.

Application sœur de [Challenger IA](https://github.com/Morgan-Reichert/challenger-ia-chatbot) :
**même authentification Firebase** (comptes Challenger), base Supabase propre (corpus et quotas), moteur partagé
(`api/_lib/recherche.js`, `verifier.js`, `mistral.js`, `quota.js`, `admin.js`).

## Démarrer

```bash
npm install
cp .env.example .env      # au minimum MISTRAL_API_KEY
npm run dev               # http://localhost:3100 — l'API /api/* est servie par Vite
```

Sans Supabase, l'app tourne sur un **jeu de démonstration fictif** (`src/data/demo.json`).
Sans Firebase Admin, l'API ne vérifie pas les jetons (développement local uniquement).

## Mise en production

1. Exécuter `supabase/schema.sql` dans le SQL Editor du projet Supabase (corpus `pol_*` + quotas), ou `npx supabase db push` après `npx supabase link`.
2. Renseigner les variables de `.env.example` dans Vercel (mêmes valeurs Firebase que Challenger).
3. Ajouter le domaine dans Firebase › Authentication › Authorized domains.
4. Ingérer les programmes officiels :

```bash
node --env-file=.env scripts/ingerer-programme.mjs --candidat nom-prenom --nom "Prénom Nom" \
  --formation "Parti" --pdf corpus/programme.pdf --url https://… --essai   # vérifier, puis sans --essai
```

5. Lancer le banc de neutralité et publier son rapport : `node --env-file=.env evals/neutralite.mjs`

## Architecture

| Élément | Rôle |
|---|---|
| `api/analyse.js` | Analyse d'une mesure selon la grille (`api/_lib/grille.js`), contrôlée puis mise en cache — tout le monde lit la même |
| `api/question.js` | Questions sur les programmes, réponses uniquement depuis le corpus, extraits équilibrés par candidat |
| `api/faisabilite.js` | Faisabilité juridique sourcée : référentiel commun (`api/_lib/referentiel-juridique.js`) + recherche limitée aux sites juridiques officiels (nécessite `TAVILY_API_KEY`) |
| `api/budget.js` | Séries de finances publiques Eurostat (dépenses par fonction, recettes, solde, dette), sans clé, cache CDN 12 h |
| `pol_chiffrages` | Chiffrages publiés (candidat / organismes indépendants), saisis à la main avec leur source — jamais générés |
| `api/_lib/neutralite.js` | Lexique évaluatif, interception des consignes de vote, équilibre des réponses |
| `scripts/ingerer-programme.mjs` | PDF → mesures ; rejette toute citation non verbatim |
| `evals/neutralite.mjs` | Symétrie entre candidats, interception, questions orientées |

Principes : voir la page `/methode` de l'application.
