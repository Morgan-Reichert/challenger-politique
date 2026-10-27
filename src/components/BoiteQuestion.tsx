import { useState, type FormEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface Props {
  onEnvoi: (question: string) => void;
  occupe?: boolean;
  placeholder?: string;
  grand?: boolean;
}

export default function BoiteQuestion({ onEnvoi, occupe = false, placeholder = 'Posez une question sur les programmes…', grand = false }: Props) {
  const [texte, setTexte] = useState('');
  const envoyer = (e?: FormEvent) => {
    e?.preventDefault();
    const q = texte.trim();
    if (!q || occupe) return;
    onEnvoi(q);
    setTexte('');
  };
  return (
    <form onSubmit={envoyer} className={`flex items-end gap-2 verre rounded-3xl shadow-sm focus-within:border-ink-3 transition-colors ${grand ? 'p-3' : 'p-2'}`}>
      <label htmlFor="question" className="sr-only">Votre question</label>
      <textarea id="question" value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={800} rows={grand ? 2 : 1}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
        placeholder={placeholder}
        className={`flex-1 resize-none bg-transparent outline-none placeholder:text-ink-3 px-2 py-1.5 ${grand ? 'text-lg' : 'text-base'}`} />
      <button type="submit" disabled={!texte.trim() || occupe} aria-label="Envoyer la question"
        className="pilule shrink-0 inline-flex items-center justify-center w-10 h-10 disabled:opacity-30 transition-opacity">
        <ArrowUp size={18} aria-hidden />
      </button>
    </form>
  );
}
