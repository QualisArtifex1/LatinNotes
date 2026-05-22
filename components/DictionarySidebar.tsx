import React from 'react';
import type { Definition, Inflection, TokenResult } from '../types';
import { BookOpenIcon, ChevronDownIcon, LoaderIcon, XIcon } from './Icons';

interface DictionarySidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  word: string;
  token: TokenResult | null;
  isLoading: boolean;
  error: string;
  onCollapse: () => void;
  onExpand: () => void;
  onClose: () => void;
}

function compactList(values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

function formatMorph(infl: Inflection) {
  const form = infl.form ?? {};
  if (typeof form.form === 'string') {
    return form.form;
  }
  if (Array.isArray(form.form)) {
    return form.form.join(' ');
  }

  const chunks = [
    form.declension as string | undefined,
    form.tense as string | undefined,
    form.voice as string | undefined,
    form.mood as string | undefined,
    form.person ? `${form.person}p` : undefined,
    form.number as string | undefined,
    form.gender as string | undefined,
  ];

  return compactList(chunks) || 'unclassified';
}

function lemmaFor(definition: Definition) {
  return definition.orth.filter(Boolean).join(', ') || 'unknown';
}

function uniqueForms(definition: Definition) {
  const seen = new Set<string>();
  return definition.infls.filter((infl) => {
    const label = `${infl.pos}:${formatMorph(infl)}:${infl.ending}`;
    if (seen.has(label)) return false;
    seen.add(label);
    return true;
  });
}

function MorphPill({ infl }: { infl: Inflection }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800 dark:border-teal-800/70 dark:bg-teal-950/50 dark:text-teal-200">
      <span className="uppercase tracking-wide text-teal-600 dark:text-teal-400">{infl.pos}</span>
      <span>{formatMorph(infl)}</span>
      {infl.ending ? <em className="not-italic text-teal-500 dark:text-teal-300">-{infl.ending}</em> : null}
    </span>
  );
}

function DefinitionCard({ definition }: { definition: Definition }) {
  const forms = uniqueForms(definition).slice(0, 8);

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">{lemmaFor(definition)}</h3>
      <div className="mt-2 space-y-1">
        {definition.senses.slice(0, 4).map((sense) => (
          <p key={sense} className="text-sm leading-snug text-stone-600 dark:text-stone-300">
            {sense}
          </p>
        ))}
      </div>
      {forms.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {forms.map((infl) => (
            <MorphPill key={`${infl.pos}-${formatMorph(infl)}-${infl.ending}`} infl={infl} />
          ))}
        </div>
      )}
    </article>
  );
}

export const DictionarySidebar: React.FC<DictionarySidebarProps> = ({
  isOpen,
  isCollapsed,
  word,
  token,
  isLoading,
  error,
  onCollapse,
  onExpand,
  onClose,
}) => {
  if (!isOpen) return null;

  if (isCollapsed) {
    return (
      <aside className="flex h-14 w-full flex-shrink-0 items-center justify-center border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 md:h-auto md:w-14 md:border-l md:border-t-0">
        <button
          type="button"
          onClick={onExpand}
          className="rounded-lg p-2 text-teal-700 transition-colors hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/50"
          title="Expand Dictionary"
          aria-label="Expand Dictionary"
        >
          <BookOpenIcon />
        </button>
      </aside>
    );
  }

  const definitions = token?.defs ?? [];

  return (
    <aside className="flex h-[44vh] w-full flex-shrink-0 flex-col border-t border-stone-200 bg-stone-50 shadow-xl dark:border-stone-800 dark:bg-stone-950 md:h-auto md:w-96 md:border-l md:border-t-0">
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            <BookOpenIcon />
            Dictionary
          </div>
          <h2 className="mt-2 font-serif text-3xl font-bold text-stone-900 dark:text-stone-100">{word || 'No word'}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {isLoading ? 'Loading Open Words data' : `${definitions.length} definitions`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            title="Collapse Dictionary"
            aria-label="Collapse Dictionary"
          >
            <ChevronDownIcon />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
            title="Close Dictionary"
            aria-label="Close Dictionary"
          >
            <XIcon />
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-auto p-4">
        {isLoading && (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-teal-700 dark:text-teal-300">
            <LoaderIcon />
            <p className="text-sm font-semibold">Looking up selected word...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !error && definitions.length > 0 && (
          <div className="space-y-3">
            {definitions.map((definition, index) => (
              <DefinitionCard key={`${lemmaFor(definition)}-${index}`} definition={definition} />
            ))}
          </div>
        )}

        {!isLoading && !error && token && definitions.length === 0 && (
          <div className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
            No Open Words definitions found for this form.
          </div>
        )}
      </div>
    </aside>
  );
};
