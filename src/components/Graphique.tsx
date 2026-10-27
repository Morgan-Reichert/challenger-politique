import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Table2, ChartLine } from 'lucide-react';
import type { Serie, SourceDonnees } from '../lib/api';

/**
 * Graphique de série temporelle — 3 séries maximum (palette validée pour
 * 3 couleurs distinguables, y compris en cas de daltonisme).
 *  - courbes : réticule vertical + infobulle listant toutes les séries ;
 *  - barres  : pour une série unique pouvant être négative (solde public).
 * Toujours : légende dès 2 séries, étiquette en bout de courbe, vue tableau.
 * Les textes restent dans les couleurs d'encre ; seules les marques portent
 * la couleur de série.
 */
const COULEURS = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)'];
const H = 280;
const M = { haut: 16, droite: 16, bas: 28, gauche: 46 };

const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

function graduations(min: number, max: number, n = 5) {
  const brut = (max - min) / n || 1;
  const p = 10 ** Math.floor(Math.log10(brut));
  const pas = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => brut <= k) ?? 10 * p;
  const debut = Math.floor(min / pas) * pas;
  const fin = Math.ceil(max / pas) * pas;
  const t: number[] = [];
  for (let v = debut; v <= fin + pas / 2; v += pas) t.push(Math.round(v * 100) / 100);
  return t;
}

interface Props {
  titre: string;
  unite: string;
  series: Serie[];
  source: SourceDonnees;
  type?: 'ligne' | 'barres';
}

export default function Graphique({ titre, unite, series: brutes, source, type = 'ligne' }: Props) {
  const series = brutes.slice(0, 3);
  const cadre = useRef<HTMLDivElement>(null);
  const [l, setL] = useState(640);
  const [vue, setVue] = useState<'graphique' | 'tableau'>('graphique');
  const [survol, setSurvol] = useState<number | null>(null);

  useEffect(() => {
    if (!cadre.current) return;
    const o = new ResizeObserver(([e]) => setL(Math.max(280, e.contentRect.width)));
    o.observe(cadre.current);
    return () => o.disconnect();
  }, []);

  const annees = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.annee)))].sort((a, b) => a - b), [series]);
  const valeurs = series.flatMap((s) => s.points.map((p) => p.valeur));
  if (annees.length === 0) return <p className="text-sm text-ink-3">Aucune donnée disponible.</p>;

  const ticks = graduations(Math.min(type === 'barres' ? 0 : Infinity, ...valeurs), Math.max(type === 'barres' ? 0 : -Infinity, ...valeurs));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const largeurUtile = l - M.gauche - M.droite;
  const x = (a: number) => M.gauche + ((a - annees[0]) / Math.max(1, annees.at(-1)! - annees[0])) * largeurUtile;
  const y = (v: number) => M.haut + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - M.haut - M.bas);
  const pasAnnees = l < 520 ? 10 : 5;
  const anneeActive = survol !== null ? annees[survol] : null;

  const choisir = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * l;
    let meilleur = 0;
    annees.forEach((a, i) => { if (Math.abs(x(a) - px) < Math.abs(x(annees[meilleur]) - px)) meilleur = i; });
    setSurvol(meilleur);
  };
  const clavier = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setSurvol((s) => Math.min(annees.length - 1, (s ?? -1) + 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); setSurvol((s) => Math.max(0, (s ?? annees.length) - 1)); }
    if (e.key === 'Escape') setSurvol(null);
  };

  const largeurBarre = Math.max(3, Math.min(18, largeurUtile / annees.length - 2));
  const zero = y(0);

  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <figcaption>
          <p className="font-semibold">{titre}</p>
          <p className="text-xs text-ink-3">En {unite}</p>
        </figcaption>
        <div className="inline-flex rounded-full border border-line p-0.5 text-xs" role="group" aria-label="Affichage">
          <button onClick={() => setVue('graphique')} aria-pressed={vue === 'graphique'}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${vue === 'graphique' ? 'bg-pill text-pill-ink' : 'text-ink-2'}`}>
            <ChartLine size={13} aria-hidden /> Graphique
          </button>
          <button onClick={() => setVue('tableau')} aria-pressed={vue === 'tableau'}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${vue === 'tableau' ? 'bg-pill text-pill-ink' : 'text-ink-2'}`}>
            <Table2 size={13} aria-hidden /> Tableau
          </button>
        </div>
      </div>

      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Légende">
          {series.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span className="w-3 h-[3px] rounded-full" style={{ background: COULEURS[i] }} aria-hidden />{s.label}
            </li>
          ))}
        </ul>
      )}

      <div ref={cadre} className="relative">
        {vue === 'graphique' ? (
          <>
            <svg width={l} height={H} viewBox={`0 0 ${l} ${H}`} role="img" tabIndex={0}
              aria-label={`${titre}, ${annees[0]}–${annees.at(-1)}. Flèches gauche et droite pour parcourir les années.`}
              onPointerMove={choisir} onPointerLeave={() => setSurvol(null)} onKeyDown={clavier} onBlur={() => setSurvol(null)}
              className="block overflow-visible touch-pan-y">
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={M.gauche} x2={l - M.droite} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : '2 4'} />
                  <text x={M.gauche - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--ink-3)">{fmt(t)}</text>
                </g>
              ))}
              {annees.filter((a) => a % pasAnnees === 0).map((a) => (
                <text key={a} x={x(a)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--ink-3)">{a}</text>
              ))}

              {type === 'barres' ? series[0].points.map((p, i) => {
                const haut = y(Math.max(0, p.valeur));
                const bas = y(Math.min(0, p.valeur));
                const h = Math.max(1, bas - haut);
                const r = Math.min(4, h, largeurBarre / 2);
                const x0 = x(p.annee) - largeurBarre / 2;
                // Extrémité arrondie côté donnée, base droite côté zéro.
                const d = p.valeur >= 0
                  ? `M${x0},${zero} V${haut + r} Q${x0},${haut} ${x0 + r},${haut} H${x0 + largeurBarre - r} Q${x0 + largeurBarre},${haut} ${x0 + largeurBarre},${haut + r} V${zero} Z`
                  : `M${x0},${zero} V${bas - r} Q${x0},${bas} ${x0 + r},${bas} H${x0 + largeurBarre - r} Q${x0 + largeurBarre},${bas} ${x0 + largeurBarre},${bas - r} V${zero} Z`;
                const actif = anneeActive === p.annee;
                return <path key={p.annee} d={d} fill={COULEURS[0]} opacity={anneeActive === null || actif ? 1 : 0.45}
                  strokeDasharray={p.provisoire ? '3 2' : undefined} data-i={i} />;
              }) : series.map((s, i) => (
                <g key={s.id}>
                  <path fill="none" stroke={COULEURS[i]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                    d={s.points.map((p, k) => `${k ? 'L' : 'M'}${x(p.annee)},${y(p.valeur)}`).join(' ')} />
                  {s.points.length > 0 && (() => {
                    const fin = s.points.at(-1)!;
                    return <circle cx={x(fin.annee)} cy={y(fin.valeur)} r={4} fill={COULEURS[i]} stroke="var(--surface-solid)" strokeWidth={2} />;
                  })()}
                </g>
              ))}

              {anneeActive !== null && (
                <g pointerEvents="none">
                  {type === 'ligne' && <line x1={x(anneeActive)} x2={x(anneeActive)} y1={M.haut} y2={H - M.bas} stroke="var(--ink-3)" strokeWidth={1} />}
                  {type === 'ligne' && series.map((s, i) => {
                    const p = s.points.find((q) => q.annee === anneeActive);
                    return p ? <circle key={s.id} cx={x(p.annee)} cy={y(p.valeur)} r={5} fill={COULEURS[i]} stroke="var(--surface-solid)" strokeWidth={2} /> : null;
                  })}
                </g>
              )}
            </svg>

            {anneeActive !== null && (
              <div role="status" className="pointer-events-none absolute top-1 z-10 min-w-[170px] rounded-2xl bg-surface-solid border border-line shadow-lg px-3.5 py-2.5 text-xs"
                style={x(anneeActive) > l / 2 ? { right: l - x(anneeActive) + 12 } : { left: x(anneeActive) + 12 }}>
                <p className="font-semibold text-ink mb-1">{anneeActive}</p>
                {series.map((s, i) => {
                  const p = s.points.find((q) => q.annee === anneeActive);
                  return (
                    <p key={s.id} className="flex items-center gap-2 text-ink-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COULEURS[i] }} aria-hidden />
                      <strong className="text-ink tabular-nums">{p ? fmt(p.valeur) : '—'}</strong>
                      <span className="truncate">{s.label}{p?.provisoire ? ' (provisoire)' : ''}</span>
                    </p>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="max-h-[320px] overflow-auto rounded-2xl border border-line">
            <table className="w-full text-sm tabular-nums">
              <caption className="sr-only">{titre}, en {unite}</caption>
              <thead className="sticky top-0 bg-surface-solid text-ink-2 text-xs">
                <tr>
                  <th scope="col" className="text-left font-medium px-3 py-2">Année</th>
                  {series.map((s) => <th key={s.id} scope="col" className="text-right font-medium px-3 py-2">{s.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...annees].reverse().map((a) => (
                  <tr key={a} className="border-t border-line">
                    <th scope="row" className="text-left font-medium px-3 py-1.5">{a}</th>
                    {series.map((s) => {
                      const p = s.points.find((q) => q.annee === a);
                      return <td key={s.id} className="text-right px-3 py-1.5">{p ? `${fmt(p.valeur)}${p.provisoire ? ' (p)' : ''}` : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {type === 'ligne' && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Dernières valeurs">
          {series.map((s, i) => {
            const fin = s.points.at(-1);
            return fin ? (
              <li key={s.id} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: COULEURS[i] }} aria-hidden />
                {s.label} en {fin.annee} : <strong className="text-ink tabular-nums">{fmt(fin.valeur)}</strong>{fin.provisoire ? ' (provisoire)' : ''}
              </li>
            ) : null;
          })}
        </ul>
      )}

      <p className="text-[11px] text-ink-3">
        Source : <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{source.nom}</a> (jeu {source.jeu}).
        {' '}« (p) » : valeur provisoire.
      </p>
    </figure>
  );
}
