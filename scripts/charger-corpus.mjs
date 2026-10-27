#!/usr/bin/env node
/**
 * Chargement des fichiers produits par extraire-programme.mjs et
 * importer-ifrap.mjs dans Supabase (embeddings compris).
 *
 *   node --env-file=.env scripts/charger-corpus.mjs corpus/ifrap.json corpus/le-pen-2022.json …
 *
 * Requiert SUPABASE_SERVICE_ROLE_KEY (clé secrète) dans .env : seul le
 * serveur écrit dans le corpus. Recharger un même document remplace ses
 * mesures au lieu de les dupliquer.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { embeddings, fournisseur } from '../api/_lib/modele.js';

const fichiers = process.argv.slice(2);
if (fichiers.length === 0) { console.error('Indiquer au moins un fichier JSON.'); process.exit(1); }
const url = process.env.VITE_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !cle) { console.error('VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définies dans .env'); process.exit(1); }
const db = createClient(url, cle, { auth: { persistSession: false } });
console.log(`Embeddings : ${fournisseur()}`);

const ok = (r, quoi) => { if (r.error) throw new Error(`${quoi} : ${r.error.message}`); return r.data; };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function vecteurs(textes) {
  const sortie = [];
  for (let i = 0; i < textes.length; i += 50) {
    for (let essai = 0; ; essai++) {
      try { sortie.push(...await embeddings(textes.slice(i, i + 50))); break; } catch (e) {
        if (essai >= 5) throw e;
        await pause(15000 * (essai + 1));
      }
    }
    process.stdout.write(`\r  embeddings ${Math.min(i + 50, textes.length)}/${textes.length}`);
  }
  process.stdout.write('\n');
  return sortie;
}

for (const f of fichiers) {
  const documents = JSON.parse(readFileSync(f, 'utf8'));
  for (const { candidat, programme, mesures } of documents) {
    if (!mesures?.length) continue;
    console.log(`${candidat.nom} — ${programme.titre} (${mesures.length} mesures)`);

    // Ne pas écraser une formation connue par une valeur vide.
    const existant = ok(await db.from('pol_candidats').select('formation').eq('id', candidat.id).maybeSingle(), 'lecture candidat');
    ok(await db.from('pol_candidats').upsert({
      id: candidat.id, election_id: 'presidentielle-2027', nom: candidat.nom,
      formation: candidat.formation ?? existant?.formation ?? null, statut: candidat.statut ?? 'declare',
    }), 'candidat');

    const prog = ok(await db.from('pol_programmes').upsert({
      candidat_id: candidat.id, titre: programme.titre, nature: programme.nature,
      contexte: programme.contexte ?? null, editeur: programme.editeur ?? null,
      url_officielle: programme.url_officielle ?? null, publie_le: programme.publie_le ?? null,
      sha256: programme.sha256,
    }, { onConflict: 'candidat_id,sha256' }).select('id').single(), 'programme');

    const v = await vecteurs(mesures.map((m) => `${m.intitule}\n${m.texte_source}`));
    ok(await db.from('pol_mesures').delete().eq('programme_id', prog.id), 'purge');
    for (let i = 0; i < mesures.length; i += 200) {
      ok(await db.from('pol_mesures').insert(mesures.slice(i, i + 200).map((m, k) => ({
        programme_id: prog.id, candidat_id: candidat.id, theme_id: m.theme_id,
        intitule: m.intitule, texte_source: m.texte_source, page: m.page ?? null, embedding: v[i + k],
      }))), 'mesures');
    }
    console.log('  ✓ chargé');
  }
}
console.log('Terminé.');
