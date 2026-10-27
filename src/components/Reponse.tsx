import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ShieldAlert } from 'lucide-react';
import type { Controles, SourceReponse } from '../lib/types';

const LIBELLES_ATTEINTES: Record<string, string> = {
  chiffre_non_source: 'un chiffre n\'est rattaché à aucune source',
  citation_fantome: 'un renvoi pointe vers une source inexistante',
  lexique_evaluatif: 'un qualificatif évaluatif a été employé',
};

export function AvertissementControles({ controles }: { controles: Controles }) {
  if (controles.conforme) return null;
  return (
    <div className="flex gap-3 rounded-lg bg-alert-soft text-alert px-4 py-3 text-sm" role="note">
      <ShieldAlert size={18} className="shrink-0 mt-0.5" aria-hidden />
      <p>
        Contrôle automatique : {controles.atteintes.map((a) => LIBELLES_ATTEINTES[a] ?? a).join(' ; ')}
        {controles.termes_evaluatifs?.length ? ` (${controles.termes_evaluatifs.join(', ')})` : ''}.
        Lisez cette réponse avec prudence et reportez-vous au texte source.
      </p>
    </div>
  );
}

/** Réponse Markdown dont les renvois [n] deviennent des pastilles cliquables. */
export function Reponse({ texte, sources, controles }: { texte: string; sources: SourceReponse[]; controles: Controles }) {
  const [active, setActive] = useState<number | null>(null);
  const avecLiens = texte.replace(/\[(\d{1,2}(?:\s*[,;]\s*\d{1,2})*)\]/g, (_, nums: string) =>
    nums.split(/[,;]/).map((n) => `[${n.trim()}](#source-${n.trim()})`).join(''));
  const source = sources.find((s) => s.n === active);

  return (
    <div className="space-y-4">
      <AvertissementControles controles={controles} />
      <div className="prose-pol">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
          a: ({ href, children }) => {
            const m = href?.match(/^#source-(\d+)$/);
            if (!m) return <a href={href} className="underline">{children}</a>;
            const n = Number(m[1]);
            return (
              <button type="button" onClick={() => setActive(active === n ? null : n)}
                aria-label={`Voir la source ${n}`} aria-expanded={active === n}
                className={`mx-0.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded text-[11px] font-semibold align-text-top transition-colors ${active === n ? 'bg-accent text-bg' : 'bg-accent-soft text-accent hover:bg-accent hover:text-bg'}`}>
                {n}
              </button>
            );
          },
        }}>{avecLiens}</ReactMarkdown>
      </div>

      {source && (
        <aside className="verre rounded-2xl p-4 space-y-2">
          <p className="text-xs text-ink-3">Source {source.n} — {source.candidat_nom}{source.page ? `, page ${source.page}` : ''}</p>
          <blockquote className="citation-source !text-base">« {source.texte_source} »</blockquote>
          <Link to={`/mesures/${source.mesure_id}`} className="inline-block text-sm font-medium text-accent hover:underline">
            Ouvrir l'analyse de cette mesure →
          </Link>
        </aside>
      )}

      {sources.length > 0 && (
        <details className="text-sm text-ink-2">
          <summary className="cursor-pointer select-none text-ink-3 hover:text-ink">{sources.length} extraits consultés</summary>
          <ol className="mt-2 space-y-1.5">
            {sources.map((s) => (
              <li key={s.n}>
                <span className="text-ink-3">[{s.n}]</span>{' '}
                <Link to={`/mesures/${s.mesure_id}`} className="hover:underline">{s.candidat_nom} — {s.intitule}</Link>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
