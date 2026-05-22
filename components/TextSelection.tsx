import React, { useState } from 'react';
import { PRELOADED_TEXTS } from '../data/texts';
import { ClearIcon } from './Icons';

interface TextSelectionProps {
  onStartAnnotating: (text: string) => void;
  onLoad: (slot: number) => void;
  onDelete: (slot: number) => void;
  savedSlots: number[];
}

export const TextSelection: React.FC<TextSelectionProps> = ({ onStartAnnotating, onLoad, onDelete, savedSlots }) => {
  const [text, setText] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [showLoadSlots, setShowLoadSlots] = useState(false);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedPreset(value);
    if (value) {
      const [author, title] = value.split('||');
      setText(PRELOADED_TEXTS[author][title]);
    } else {
      setText('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartAnnotating(text);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center justify-center p-6 text-center text-stone-500 dark:text-stone-400">
        <h1 className="font-serif text-5xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 dark:from-amber-300 dark:to-amber-500 text-transparent bg-clip-text mb-2">
            Qualis Artifex
        </h1>
        <h2 className="text-2xl font-semibold text-stone-700 dark:text-stone-300">Digital Scriptorium</h2>
        <p className="mt-2 text-stone-500 dark:text-stone-400">
          Choose a pre-loaded text or paste your own to begin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col p-4 pt-0">
        <div className="mb-4">
          <select 
            value={selectedPreset}
            onChange={handlePresetChange}
            className="w-full p-2 border border-stone-300 dark:border-stone-600 rounded-md bg-stone-50 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">-- Select a Pre-loaded Text --</option>
            {Object.keys(PRELOADED_TEXTS).map(author => (
              <optgroup label={author} key={author}>
                {Object.keys(PRELOADED_TEXTS[author]).map(title => (
                  <option key={`${author}||${title}`} value={`${author}||${title}`}>
                    {title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="mt-1 flex justify-start">
            <a 
              href="https://www.thelatinlibrary.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline font-medium"
            >
              Gather Text
            </a>
          </div>
        </div>

        <textarea
          className="flex-grow w-full p-3 border border-stone-300 dark:border-stone-600 rounded-md bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-serif"
          placeholder="Or paste your Latin text here..."
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSelectedPreset(''); // Deselect preset if user types
          }}
        />

        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-4">
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-6 py-2 bg-amber-600 text-white font-semibold rounded-lg shadow-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900 disabled:bg-stone-400 disabled:cursor-not-allowed"
            >
              Start Annotating
            </button>
            
            {savedSlots.length > 0 && (
              <button
                type="button"
                onClick={() => setShowLoadSlots(!showLoadSlots)}
                className={`px-6 py-2 font-semibold rounded-lg shadow-sm border transition-all ${showLoadSlots ? 'bg-stone-200 dark:bg-stone-700 border-stone-300 dark:border-stone-600' : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-700'}`}
              >
                Load Previous Session
              </button>
            )}
          </div>

          {showLoadSlots && (
            <div className="flex gap-2 p-2 bg-stone-100 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700 animate-fadeInUp">
              {[1, 2, 3, 4, 5].map(slot => (
                <div key={slot} className="relative group">
                  <button
                    disabled={!savedSlots.includes(slot)}
                    onClick={() => { onLoad(slot); setShowLoadSlots(false); }}
                    className={`w-10 h-10 flex flex-col items-center justify-center rounded-md transition-all font-bold ${savedSlots.includes(slot) ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-500/30 hover:bg-green-600 hover:text-white' : 'bg-stone-50 dark:bg-stone-900 text-stone-300 dark:text-stone-700 cursor-not-allowed'}`}
                  >
                    {slot}
                    {savedSlots.includes(slot) && (
                      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[8px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[9999] shadow-xl border border-stone-700">
                        {(() => {
                          const data = localStorage.getItem(`qualis-artifex-save-${slot}`);
                          if (!data) return '';
                          try {
                            const session = JSON.parse(data);
                            return new Date(session.timestamp).toLocaleString();
                          } catch { return ''; }
                        })()}
                      </span>
                    )}
                  </button>
                  {savedSlots.includes(slot) && (
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        onDelete(slot); 
                      }}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-[100] scale-95 hover:scale-110 active:scale-90 flex items-center justify-center pointer-events-auto border border-white/20"
                      title="Delete Save"
                    >
                      <ClearIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
