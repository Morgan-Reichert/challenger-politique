#!/usr/bin/env node
/**
 * Envoie des fichiers de corpus au point d'entrée /api/admin-charger du site.
 *
 *   POL_ADMIN_TOKEN=… node scripts/envoyer-corpus.mjs https://challenger-politique.vercel.app corpus/ifrap.json …
 *
 * Alternative à charger-corpus.mjs qui ne demande pas la clé Supabase en local.
 */
import { readFileSync } from 'node:fs';

const [base, ...fichiers] = process.argv.slice(2);
const jeton = process.env.POL_ADMIN_TOKEN;
if (!base || fichiers.length === 0 || !jeton) {
  console.error('Usage : POL_ADMIN_TOKEN=… node scripts/envoyer-corpus.mjs <url du site> <fichier.json>…');
  process.exit(1);
}

let echecs = 0;
for (const f of fichiers) {
  for (const document of JSON.parse(readFileSync(f, 'utf8'))) {
    if (!document.mesures?.length) continue;
    const { rejetees, ...propre } = document; // le journal de rejets reste local
    const doc = { ...propre, mesures: propre.mesures.map(({ rubrique_source, ...m }) => m) };
    process.stdout.write(`${doc.candidat.nom} — ${doc.programme.titre} (${doc.mesures.length}) … `);
    const r = await fetch(`${base}/api/admin-charger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({ document: doc }),
    });
    const corps = await r.json().catch(() => ({}));
    if (r.ok) console.log('✓');
    else { echecs++; console.log(`✗ ${r.status} ${corps.erreur ?? ''} ${corps.message ?? ''}`); }
  }
}
process.exit(echecs ? 1 : 0);
