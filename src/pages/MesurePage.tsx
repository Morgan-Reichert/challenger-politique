import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Scale, HelpCircle, Landmark, AlertTriangle, BookMarked, Coins } from 'lucide-react';
import { mesure, chiffrages } from '../lib/corpus';
import { analyser, analyserFaisabilite, budgetTheme, poserQuestion, type Faisabilite, type Unite } from '../lib/api';
import { nomTheme } from '../lib/themes';
import { useCharge } from '../lib/useCharge';
import type { Analyse, Controles, SourceReponse } from '../lib/types';
import { Carte, Chargement, Erreur, Fil, Surtitre, BadgeNiveau, LegendeNiveaux, BadgeSource, legendeCitation } from '../components/ui';
import { AvertissementControles, Reponse } from '../components/Reponse';
import BoiteQuestion from '../components/BoiteQuestion';
import Graphique from '../components/Graphique';
import { SelecteurUnite } from './BudgetPage';
import Introuvable from './Introuvable';

const SECTIONS = [
  { id: 'explication', titre: 'Ce que dit la mesure' },
  { id: 'definitions', titre: 'Les mots, et ce qu\'ils veulent dire' },
  { id: 'implications', titre: 'Ce que ça implique' },
  { id: 'non-precise', titre: 'Ce que le texte ne précise pas' },
  { id: 'faisabilite', titre: 'Faisabilité juridique' },
  { id: 'budget', titre: 'Contexte budgétaire' },
  { id: 'questions', titre: 'Questions à poser' },
];

const VEHICULES: Record<string, string> = {
  reglement: 'Un décret ou un arrêté suffit',
  loi_ordinaire: 'Une loi ordinaire est nécessaire',
  loi_organique: 'Une loi organique est nécessaire',
  revision_constitutionnelle: 'Une révision de la Constitution est nécessaire',
  droit_ue: 'Dépend du droit de l\'Union européenne',
  traite_international: 'Suppose de renégocier un traité international',
  inconnu: 'Indéterminé',
};
const CONFIANCES: Record<string, string> = { speculatif: 'spéculative', faible: 'faible', plausible: 'plausible', eleve: 'élevée' };
const VERDICTS: Record<Faisabilite['verdict'], { label: string; fond: string }> = {
  realisable_en_l_etat: { label: 'Réalisable dans le cadre juridique actuel', fond: 'bg-pastel-vert' },
  realisable_sous_conditions: { label: 'Réalisable sous conditions', fond: 'bg-pastel-sable' },
  obstacle_majeur: { label: 'Se heurte à un obstacle juridique majeur', fond: 'bg-pastel-rose' },
  inconcluant: { label: 'Les sources ne permettent pas de conclure', fond: 'bg-surface-2' },
};
const NIVEAUX_OBSTACLE: Record<string, string> = {
  constitution: 'Constitution', droit_ue: 'Droit de l\'Union', cedh: 'Conv. européenne des droits de l\'homme',
  traite: 'Traité', loi_organique: 'Loi organique', finances_publiques: 'Finances publiques', collectivites: 'Collectivités', autre: 'Autre',
};

export default function MesurePage() {
  const { id = '' } = useParams();
  const fiche = useCharge(() => mesure(id), [id]);
  const [analyse, setAnalyse] = useState<{ analyse: Analyse; controles: Controles } | null>(null);
  const [etat, setEtat] = useState<'attente' | 'charge' | 'erreur' | 'ok'>('attente');
  const [erreur, setErreur] = useState('');
  const [niveau, setNiveau] = useState<'simple' | 'detaillee'>('simple');

  useEffect(() => {
    let actif = true;
    setEtat('charge');
    setAnalyse(null);
    analyser(id)
      .then((r) => { if (actif) { setAnalyse(r); setEtat('ok'); } })
      .catch((e) => {
        if (!actif) return;
        setErreur(e.message); setEtat('erreur');
      });
    return () => { actif = false; };
  }, [id]);

  if (fiche.charge) return <Chargement />;
  if (!fiche.data) return fiche.erreur ? <Erreur message={fiche.erreur} /> : <Introuvable />;
  const { mesure: m, candidat: c, programme } = fiche.data;
  const a = analyse?.analyse;

  return (
    <div>
      <div className="pb-4 px-1"><Fil etapes={[{ label: 'Accueil', to: '/' }, { label: c.nom, to: `/candidats/${c.id}` }, { label: nomTheme(m.theme_id) }]} /></div>

      <Carte className="p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <Surtitre>{nomTheme(m.theme_id)} · {c.nom}</Surtitre>
          <BadgeSource programme={programme} taille="normal" />
        </div>
        <h1 className="mt-3 text-3xl sm:text-[42px] font-bold tracking-tight leading-tight max-w-4xl">{m.intitule}</h1>
        <figure className="mt-8 max-w-4xl">
          <blockquote className="citation-source">« {m.texte_source} »</blockquote>
          <figcaption className="mt-3 pl-[1.2rem] text-sm text-ink-3 flex flex-wrap gap-x-3 gap-y-1">
            <span>{legendeCitation(programme)}{m.page ? `, page ${m.page}` : ''}</span>
            {programme?.url_officielle && (
              <a href={programme.url_officielle} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                {programme.nature === 'officiel_2027' ? 'Document officiel' : 'Voir la source'} <ExternalLink size={12} aria-hidden />
              </a>
            )}
            {programme?.url_archive && <a href={programme.url_archive} target="_blank" rel="noopener noreferrer" className="hover:text-ink">Copie archivée</a>}
          </figcaption>
        </figure>
      </Carte>

      <div className="mt-6 grid xl:grid-cols-[230px_1fr] gap-6 items-start">
        <nav aria-label="Sections de l'analyse" className="hidden xl:block sticky top-5">
          <Carte className="p-2">
            <ol className="space-y-0.5 text-sm">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2.5 rounded-xl px-3 py-2 text-ink-2 hover:bg-surface-solid hover:text-ink">
                    <span className="tabular-nums text-ink-3">{i + 1}</span>{s.titre}
                  </a>
                </li>
              ))}
            </ol>
          </Carte>
        </nav>

        <div className="min-w-0 space-y-5">
          {etat === 'charge' && <Carte className="p-6"><Chargement texte="Analyse de la mesure en cours… (jusqu'à 30 secondes la première fois)" /></Carte>}
          {etat === 'erreur' && <Erreur message={erreur} />}

          {a && analyse && (
            <>
              <AvertissementControles controles={analyse.controles} />

              <Section n={1} id="explication" titre={SECTIONS[0].titre}>
                <p className="text-xl font-medium leading-relaxed">{a.resume}</p>
                <div className="mt-6 inline-flex rounded-full border border-line p-1 text-sm" role="tablist" aria-label="Niveau d'explication">
                  {(['simple', 'detaillee'] as const).map((v) => (
                    <button key={v} role="tab" aria-selected={niveau === v} onClick={() => setNiveau(v)}
                      className={`px-4 py-1.5 rounded-full transition-colors ${niveau === v ? 'bg-pill text-pill-ink' : 'text-ink-2 hover:text-ink'}`}>
                      {v === 'simple' ? 'En bref' : 'En détail'}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-ink-2 leading-relaxed text-[17px]">{a.explication[niveau]}</p>
              </Section>

              <Section n={2} id="definitions" titre={SECTIONS[1].titre}>
                <dl className="grid gap-3">
                  {a.definitions.map((d) => (
                    <div key={d.terme} className="rounded-2xl bg-surface-solid border border-line p-5">
                      <dt className="text-lg font-semibold">« {d.terme} »</dt>
                      <dd className="mt-3 grid sm:grid-cols-2 gap-4 text-sm">
                        <div><p className="text-ink-3 text-[11px] font-semibold uppercase tracking-wider mb-1">Dans le texte</p><p className="text-ink-2">{d.sens_dans_le_texte}</p></div>
                        <div><p className="text-ink-3 text-[11px] font-semibold uppercase tracking-wider mb-1">Sens juridique ou technique</p><p>{d.sens_technique}</p></div>
                      </dd>
                      {d.ambiguite && <p className="mt-4 text-sm flex gap-2 rounded-xl bg-pastel-lilas px-3 py-2"><HelpCircle size={16} className="shrink-0 mt-0.5" aria-hidden />{d.ambiguite}</p>}
                    </div>
                  ))}
                </dl>
              </Section>

              <Section n={3} id="implications" titre={SECTIONS[2].titre}>
                <div className="mb-6 rounded-2xl bg-surface-2 p-4"><LegendeNiveaux /></div>
                <ul className="space-y-5">
                  {a.implications.map((i, k) => (
                    <li key={k} className="grid sm:grid-cols-[170px_1fr] gap-2 sm:gap-6 pb-5 border-b border-line last:border-0 last:pb-0">
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">{i.public}</p>
                        <BadgeNiveau niveau={i.niveau} />
                      </div>
                      <div>
                        <p className="leading-relaxed">{i.effet}</p>
                        <p className="mt-1.5 text-sm text-ink-3">{i.justification}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section n={4} id="non-precise" titre={SECTIONS[3].titre}>
                <p className="text-sm text-ink-3 mb-4">Ce qui n'est pas écrit n'est ni une faute ni une qualité : ce sont les points sur lesquels le programme ne permet pas encore de se faire une idée.</p>
                <ul className="space-y-2.5">
                  {a.non_precise.map((n, k) => (
                    <li key={k} className="flex flex-col sm:flex-row gap-1 sm:gap-4 rounded-2xl border border-dashed border-ink-3/40 p-4">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 pt-0.5 sm:w-28 shrink-0">{n.element.replace(/_/g, ' ')}</span>
                      <p>{n.detail}</p>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section n={5} id="faisabilite" titre={SECTIONS[4].titre}>
                <div className="rounded-2xl bg-surface-solid border border-line p-5">
                  <p className="flex items-center gap-2 text-lg font-semibold"><Scale size={20} className="text-accent" aria-hidden />{VEHICULES[a.faisabilite.vehicule]}</p>
                  <p className="mt-3 leading-relaxed text-ink-2">{a.faisabilite.commentaire}</p>
                  <p className="mt-4 text-xs text-ink-3">
                    Première lecture, sans sources · confiance <strong className="text-ink-2">{CONFIANCES[a.faisabilite.confiance]}</strong> · analyse documentaire, pas un avis juridique.
                  </p>
                </div>
                <FaisabiliteSourcee mesureId={id} />
              </Section>
            </>
          )}

          <Section n={6} id="budget" titre={SECTIONS[5].titre}>
            <ContexteBudgetaire mesureId={id} theme={m.theme_id} />
          </Section>

          {a && (
            <Section n={7} id="questions" titre={SECTIONS[6].titre}>
              <ol className="space-y-3">
                {a.questions_a_poser.map((q, k) => (
                  <li key={k} className="flex gap-4 items-start">
                    <span className="w-8 h-8 rounded-full bg-pastel-lilas grid place-items-center text-sm font-bold shrink-0">{k + 1}</span>
                    <p className="leading-relaxed pt-1">{q}</p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          <QuestionLocale candidatId={c.id} candidatNom={c.nom} intitule={m.intitule} />

          <Link to={`/themes/${m.theme_id}`} className="verre rounded-full inline-flex items-center gap-1.5 px-5 py-3 text-sm font-medium hover:-translate-y-0.5 transition-transform">
            Comparer avec les autres candidats sur « {nomTheme(m.theme_id)} » →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ n, id, titre, children }: { n: number; id: string; titre: string; children: ReactNode }) {
  return (
    <Carte as="section" className="p-6 sm:p-8 scroll-mt-6">
      <h2 id={id} className="flex items-center gap-3 text-xl sm:text-2xl font-bold mb-5 scroll-mt-6">
        <span className="w-8 h-8 rounded-full bg-pill text-pill-ink grid place-items-center text-sm tabular-nums shrink-0">{n}</span>{titre}
      </h2>
      {children}
    </Carte>
  );
}

/* ─── Phase 2 : faisabilité juridique sourcée ─────────────────────────────── */
function FaisabiliteSourcee({ mesureId }: { mesureId: string }) {
  const [etat, setEtat] = useState<'repos' | 'charge' | 'ok' | 'erreur'>('repos');
  const [f, setF] = useState<Faisabilite | null>(null);
  const [erreur, setErreur] = useState('');

  const lancer = async () => {
    setEtat('charge'); setErreur('');
    try { setF(await analyserFaisabilite(mesureId)); setEtat('ok'); } catch (e) { setErreur((e as Error).message); setEtat('erreur'); }
  };

  if (etat !== 'ok' || !f) {
    return (
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-pastel-bleu to-pastel-lilas p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <Landmark size={28} className="shrink-0" aria-hidden />
        <div className="flex-1">
          <p className="font-semibold">Analyse juridique sourcée</p>
          <p className="text-sm text-ink-2">Procédure à suivre et obstacles éventuels, confrontés à la Constitution, au droit européen et à la Convention européenne des droits de l'homme. Chaque obstacle renvoie à un texte officiel.</p>
          {etat === 'erreur' && <p className="mt-2 text-sm text-alert">{erreur}</p>}
        </div>
        <button onClick={lancer} disabled={etat === 'charge'} className="pilule px-5 py-2.5 text-sm font-medium shrink-0 disabled:opacity-60">
          {etat === 'charge' ? <span className="respire">Recherche des textes…</span> : 'Lancer l\'analyse'}
        </button>
      </div>
    );
  }

  const v = VERDICTS[f.verdict];
  const lien = (ns: number[]) => ns.map((n) => {
    const s = f.sources.find((x) => x.n === n);
    return s ? <a key={n} href={s.url} target="_blank" rel="noopener noreferrer" title={s.titre}
      className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded bg-accent-soft text-accent text-[11px] font-semibold align-text-top hover:bg-accent hover:text-surface-solid">{n}</a> : null;
  });

  return (
    <div className="mt-4 space-y-4">
      <AvertissementControles controles={f.controles} />
      <div className={`rounded-2xl ${v.fond} p-5`}>
        <p className="text-xs uppercase tracking-wider font-semibold text-ink-2">Analyse sourcée · {VEHICULES[f.vehicule]}</p>
        <p className="mt-1 text-lg font-bold">{v.label}</p>
        <p className="mt-2 text-ink-2">{f.resume}</p>
      </div>

      {f.etapes.length > 0 && (
        <div>
          <p className="font-semibold mb-3">Procédure</p>
          <ol className="relative border-l-2 border-line ml-3 space-y-4">
            {f.etapes.map((e, i) => (
              <li key={i} className="pl-6 relative">
                <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-pill border-4 border-surface-solid" aria-hidden />
                <p className="font-medium">{e.etape} <span className="text-ink-3 font-normal">— {e.acteur}</span></p>
                <p className="text-sm text-ink-2">{e.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {f.obstacles.length > 0 && (
        <div>
          <p className="font-semibold mb-3">Obstacles identifiés</p>
          <ul className="space-y-2.5">
            {f.obstacles.map((o, i) => (
              <li key={i} className="rounded-2xl border border-line bg-surface-solid p-4">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <AlertTriangle size={14} aria-hidden />
                  <span className="font-semibold">{NIVEAUX_OBSTACLE[o.niveau]}</span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-ink-2">gravité {o.gravite}</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed">{o.description}{lien(o.sources)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {f.precedents.length > 0 && (
        <div>
          <p className="font-semibold mb-2">Précédents</p>
          <ul className="space-y-1.5 text-sm text-ink-2 list-disc pl-5">
            {f.precedents.map((p, i) => <li key={i}>{p.description}{lien(p.sources)}</li>)}
          </ul>
        </div>
      )}

      {f.limites && <p className="text-sm text-ink-2"><strong className="text-ink">Limites :</strong> {f.limites}</p>}

      {f.sources.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-ink-3 hover:text-ink">{f.sources.length} textes cités</summary>
          <ol className="mt-2 space-y-1">
            {f.sources.map((s) => (
              <li key={s.n} className="flex gap-2">
                <span className="text-ink-3 tabular-nums">[{s.n}]</span>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.titre}</a>
                {s.type === 'referentiel' && <BookMarked size={13} className="text-ink-3 mt-0.5" aria-label="Texte de référence" />}
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className="text-xs text-ink-3">Analyse documentaire produite par IA à partir des textes cités, contrôlée automatiquement. Ce n'est pas un avis juridique.</p>
    </div>
  );
}

/* ─── Phase 3 : contexte budgétaire et chiffrages ─────────────────────────── */
const fmtMd = (n: number | null) => (n === null ? '?' : n.toLocaleString('fr-FR', { maximumFractionDigits: 1 }));
const SENS: Record<string, string> = { cout: 'Coût', economie: 'Économie', recette: 'Recette' };

function ContexteBudgetaire({ mesureId, theme }: { mesureId: string; theme: string }) {
  const [unite, setUnite] = useState<Unite>('MIO_EUR');
  const series = useCharge(() => budgetTheme(theme, unite), [theme, unite]);
  const liste = useCharge(() => chiffrages(mesureId), [mesureId]);
  const candidat = liste.data?.filter((x) => x.origine === 'candidat') ?? [];
  const independants = liste.data?.filter((x) => x.origine === 'independant') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-semibold flex items-center gap-2"><Coins size={18} aria-hidden /> Chiffrage de la mesure</p>
        <p className="text-sm text-ink-3 mt-1">Aucun chiffre n'est produit par l'IA. Seuls les chiffrages publiés (par le candidat ou par un organisme indépendant) sont repris, avec leur source.</p>
        {liste.data && liste.data.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-ink-3/40 p-4 text-sm text-ink-2">
            Aucun chiffrage publié n'est encore référencé pour cette mesure.
          </p>
        ) : (
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {[{ titre: 'Annoncé par le candidat', items: candidat }, { titre: 'Estimations indépendantes', items: independants }].map(({ titre, items }) => (
              <div key={titre} className="rounded-2xl bg-surface-solid border border-line p-4">
                <p className="text-xs uppercase tracking-wider font-semibold text-ink-3">{titre}</p>
                {items.length === 0 ? <p className="mt-2 text-sm text-ink-3">Aucun.</p> : items.map((x) => (
                  <div key={x.id} className="mt-3">
                    <p className="text-2xl font-bold tabular-nums">
                      {x.montant_max !== null && x.montant_max !== x.montant_min ? `${fmtMd(x.montant_min)} à ${fmtMd(x.montant_max)}` : fmtMd(x.montant_min)} Md€
                    </p>
                    <p className="text-sm text-ink-2">{SENS[x.sens]}{x.horizon ? `, ${x.horizon}` : ''} · <a href={x.source_url} target="_blank" rel="noopener noreferrer" className="underline">{x.organisme}</a></p>
                    {x.methode && <p className="text-xs text-ink-3 mt-1">{x.methode}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="font-semibold">Ce que la France dépense déjà sur ce thème</p>
          <SelecteurUnite unite={unite} onChange={setUnite} />
        </div>
        {series.charge && <Chargement texte="Chargement des données Eurostat…" />}
        {series.erreur && <Erreur message={series.erreur} />}
        {series.data?.indisponible && <p className="text-sm text-ink-2">{series.data.message}</p>}
        {series.data && !series.data.indisponible && (
          <>
            <Graphique titre={series.data.titre} unite={series.data.unite} series={series.data.series} source={series.data.source} />
            <p className="mt-2 text-xs text-ink-3">{series.data.note}</p>
          </>
        )}
      </div>
    </div>
  );
}

function QuestionLocale({ candidatId, candidatNom, intitule }: { candidatId: string; candidatNom: string; intitule: string }) {
  const [occupe, setOccupe] = useState(false);
  const [resultat, setResultat] = useState<{ q: string; reponse: string; sources: SourceReponse[]; controles: Controles } | null>(null);
  const [erreur, setErreur] = useState('');

  const envoyer = async (q: string) => {
    setOccupe(true); setErreur('');
    try {
      const r = await poserQuestion(`À propos de la mesure « ${intitule} » : ${q}`, candidatId);
      setResultat({ q, ...r });
    } catch (e) {
      setErreur((e as Error).message);
    } finally { setOccupe(false); }
  };

  return (
    <section className="rounded-3xl bg-gradient-to-br from-pastel-bleu via-pastel-lilas to-pastel-rose p-6 sm:p-8">
      <h2 className="text-2xl font-bold">Une question sur cette mesure ?</h2>
      <p className="mt-1 text-sm text-ink-2">La réponse s'appuie uniquement sur le programme de {candidatNom}.</p>
      <div className="mt-4">
        <BoiteQuestion onEnvoi={envoyer} occupe={occupe} placeholder="Ex. : qui serait concerné en premier ?" />
      </div>
      {occupe && <p className="respire mt-4 text-sm text-ink-2">Recherche dans le programme…</p>}
      {erreur && <div className="mt-4"><Erreur message={erreur} /></div>}
      {resultat && (
        <div className="mt-6 space-y-3 rounded-2xl bg-surface-solid p-5">
          <p className="text-sm text-ink-3">« {resultat.q} »</p>
          <Reponse texte={resultat.reponse} sources={resultat.sources} controles={resultat.controles} />
        </div>
      )}
    </section>
  );
}
