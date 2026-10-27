#!/usr/bin/env bash
# Extraction des documents fournis le 27/10/2026, avec leur nature exacte.
# À lancer depuis la racine du projet : bash scripts/extraire-documents-utilisateur.sh
set -u
E="node --env-file=.env scripts/extraire-programme.mjs"

$E --candidat "Marine Le Pen" --formation "Rassemblement national" \
   --pdf corpus/Candidat-06-Marine-Le-Pen-Declaration-accessible.pdf --sortie corpus/le-pen-2022-declaration.json \
   --titre "Déclaration de candidature (présidentielle 2022)" --nature anterieur \
   --contexte "Présidentielle 2022" --editeur "Marine Le Pen" --publie-le 2022-03-25

$E --candidat "Marine Le Pen" --formation "Rassemblement national" \
   --html https://rassemblementnational.fr/22-mesures --sortie corpus/le-pen-2022-22-mesures.json \
   --titre "Les 22 mesures (présidentielle 2022)" --nature anterieur \
   --contexte "Présidentielle 2022" --editeur "Rassemblement national"

$E --candidat "Jean-Luc Mélenchon" --formation "La France insoumise" \
   --pdf corpus/PROGRAMME-FRONT-POPULAIRE.pdf --sortie corpus/nfp-2024.json \
   --titre "Contrat de législature du Nouveau Front populaire" --nature anterieur \
   --contexte "Législatives 2024, programme de coalition publié sur melenchon2027.fr" \
   --editeur "Nouveau Front populaire" --publie-le 2024-06-14 \
   --url https://melenchon2027.fr/wp-content/uploads/2026/04/PROGRAMME-FRONT-POPULAIRE.pdf

$E --candidat "Raphaël Glucksmann" --formation "Place publique" \
   --pdf corpus/programme-raphael-glucksmann-2027.pdf --sortie corpus/glucksmann-wikiglucksmann.json \
   --titre "Le programme de Raphaël Glucksmann pour 2027 (synthèse non officielle)" --nature non_officiel \
   --editeur "WikiGlucksmann" --publie-le 2026-10-22 --url https://www.wikiglucksmann.fr/programme.html \
   --debut-page 3
