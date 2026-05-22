
import React from 'react';
import { HIGHLIGHT_COLORS, HighlightColor } from '../constants';
import { UnderlineIcon, DownloadIcon, ClearIcon, StartOverIcon, PencilIcon, SaveIcon, UploadIcon, BookOpenIcon } from './Icons';
import { Type, ArrowUpDown, Plus, Minus } from 'lucide-react';

interface ToolbarProps {
  onHighlight: (color: HighlightColor) => void;
  onUnderline: () => void;
  onMarker: (marker: string) => void;
  onBracket: (type: 'square' | 'caret', side: 'start' | 'end') => void;
  onClear: () => void;
  onExport: () => void;
  onReset: () => void;
  onAddNote: () => void;
  onLookupWord: () => void;
  onSave: (slot: number) => void;
  onLoad: (slot: number) => void;
  onDelete: (slot: number) => void;
  isWordSelected: boolean;
  canLookupWord: boolean;
  savedSlots: number[];
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineSpacing: number;
  onLineSpacingChange: (spacing: number) => void;
}

const COLOR_ORDER: HighlightColor[] = ['red', 'green', 'orange', 'blue', 'purple', 'yellow'];
const MARKERS = ['①', '②', '③', '④', '⑤'];

export const Toolbar: React.FC<ToolbarProps> = ({ 
  onHighlight, onUnderline, onMarker, onBracket, onClear, onExport, onReset, onAddNote, onLookupWord, onSave, onLoad, onDelete, isWordSelected, canLookupWord, savedSlots,
  fontSize, onFontSizeChange, lineSpacing, onLineSpacingChange
}) => {
  const [showSaveSlots, setShowSaveSlots] = React.useState(false);
  const [showLoadSlots, setShowLoadSlots] = React.useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl shadow-lg">
      <div className="flex items-center gap-1.5 border-r border-stone-200 dark:border-stone-800 pr-3">
        {COLOR_ORDER.map((colorName) => (
          <button
            key={colorName}
            onClick={() => onHighlight(colorName)}
            disabled={!isWordSelected}
            className={`w-6 h-6 rounded-full transition-all hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-stone-900 focus:ring-amber-500 disabled:opacity-20 disabled:grayscale disabled:scale-100 shadow-sm ${HIGHLIGHT_COLORS[colorName]}`}
            title={`Highlight ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} [${colorName.charAt(0).toUpperCase()}]`}
          />
        ))}
      </div>

      <div className="flex items-center gap-1 border-r border-stone-200 dark:border-stone-800 pr-3">
        {MARKERS.map((marker, index) => (
          <button
            key={marker}
            onClick={() => onMarker(marker)}
            disabled={!isWordSelected}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 font-bold text-lg text-stone-700 dark:text-stone-300"
            title={`Add Marker ${index + 1} [${index + 1}]`}
          >
            {marker}
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-1 border-r border-stone-200 dark:border-stone-800 pr-3">
        <button onClick={onUnderline} disabled={!isWordSelected} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30" title="Underline [U]"><UnderlineIcon /></button>
        <button onClick={() => onBracket('square', 'start')} disabled={!isWordSelected} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 font-bold" title="Add Left Square Bracket [[]">[</button>
        <button onClick={() => onBracket('square', 'end')} disabled={!isWordSelected} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 font-bold" title="Add Right Square Bracket []]">]</button>
        <button onClick={() => onBracket('caret', 'start')} disabled={!isWordSelected} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 font-bold" title="Add Left Caret Bracket [<]">&lt;</button>
        <button onClick={() => onBracket('caret', 'end')} disabled={!isWordSelected} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-30 font-bold" title="Add Right Caret Bracket [>]">&gt;</button>
        <button onClick={onLookupWord} disabled={!canLookupWord} className="p-2 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors text-teal-700 dark:text-teal-400 disabled:opacity-30" title="Look Up Selected Word"><BookOpenIcon /></button>
        <button onClick={onAddNote} disabled={!isWordSelected} className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors text-amber-700 dark:text-amber-500 disabled:opacity-30" title="Add Interlinear Note"><PencilIcon /></button>
        <button onClick={onClear} disabled={!isWordSelected} className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 transition-colors disabled:opacity-30" title="Reset Word Annotations [X]"><ClearIcon /></button>
      </div>

      <div className="flex items-center gap-2 border-r border-stone-200 dark:border-stone-800 pr-3">
        <div className="flex items-center gap-1 px-2 py-1 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <Type size={16} className="text-stone-400 mr-1" />
          <button onClick={() => onFontSizeChange(Math.max(12, fontSize - 2))} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors text-stone-600 dark:text-stone-400" title="Decrease Font Size"><Minus size={14} /></button>
          <span className="text-[10px] font-bold w-6 text-center text-stone-600 dark:text-stone-400">{fontSize}</span>
          <button onClick={() => onFontSizeChange(Math.min(72, fontSize + 2))} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors text-stone-600 dark:text-stone-400" title="Increase Font Size"><Plus size={14} /></button>
        </div>
        
        <div className="flex items-center gap-1 px-2 py-1 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          <ArrowUpDown size={16} className="text-stone-400 mr-1" />
          <button onClick={() => onLineSpacingChange(Math.max(8, lineSpacing - 4))} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors text-stone-600 dark:text-stone-400" title="Decrease Line Spacing"><Minus size={14} /></button>
          <span className="text-[10px] font-bold w-6 text-center text-stone-600 dark:text-stone-400">{lineSpacing}</span>
          <button onClick={() => onLineSpacingChange(Math.min(200, lineSpacing + 4))} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors text-stone-600 dark:text-stone-400" title="Increase Line Spacing"><Plus size={14} /></button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-r border-stone-200 dark:border-stone-800 pr-3 relative">
        <div className="relative">
          <button 
            onClick={() => { setShowSaveSlots(!showSaveSlots); setShowLoadSlots(false); }} 
            className={`p-2 rounded-lg transition-colors ${showSaveSlots ? 'bg-stone-200 dark:bg-stone-700' : 'hover:bg-stone-100 dark:hover:bg-stone-800'} text-stone-600 dark:text-stone-400`} 
            title="Save Session"
          >
            <SaveIcon />
          </button>
          {showSaveSlots && (
            <div className="absolute top-full mt-3 left-0 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl p-2 flex gap-1 z-[1100] animate-fadeInUp">
              {[1, 2, 3, 4, 5].map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => { onSave(slot); setShowSaveSlots(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-md bg-stone-100 dark:bg-stone-700 hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold relative group"
                >
                  {slot}
                  {localStorage.getItem(`qualis-artifex-save-${slot}`) && (
                    <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[8px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[1110] shadow-xl border border-stone-700">
                      {(() => {
                        const data = localStorage.getItem(`qualis-artifex-save-${slot}`);
                        if (!data) return '';
                        try {
                          const session = JSON.parse(data);
                          return `Last saved: ${new Date(session.timestamp).toLocaleString()}`;
                        } catch { return ''; }
                      })()}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => { setShowLoadSlots(!showLoadSlots); setShowSaveSlots(false); }} 
            className={`p-2 rounded-lg transition-colors ${showLoadSlots ? 'bg-stone-200 dark:bg-stone-700' : 'hover:bg-stone-100 dark:hover:bg-stone-800'} text-stone-600 dark:text-stone-400`} 
            title="Load Session"
          >
            <UploadIcon />
          </button>
          {showLoadSlots && (
            <div className="absolute top-full mt-3 left-0 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl p-2 flex gap-1 z-[1100] animate-fadeInUp">
              {[1, 2, 3, 4, 5].map(slot => (
                <div key={slot} className="relative group p-1 flex items-center justify-center">
                  <button
                    type="button"
                    disabled={!savedSlots.includes(slot)}
                    onClick={() => { onLoad(slot); setShowLoadSlots(false); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors text-xs font-bold ${savedSlots.includes(slot) ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-600 hover:text-white' : 'bg-stone-50 dark:bg-stone-800 text-stone-300 dark:text-stone-600 cursor-not-allowed'}`}
                  >
                    {slot}
                    {savedSlots.includes(slot) && (
                      <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[8px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[1110] shadow-xl border border-stone-700">
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
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-[1200] scale-90 hover:scale-110 active:scale-95 flex items-center justify-center pointer-events-auto border border-white/20"
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
      </div>

      <div className="flex-grow min-w-[20px]" />
      
      <div className="flex items-center gap-2">
        <button onClick={onReset} className="flex items-center gap-2 px-3 py-2 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm font-semibold">
          <StartOverIcon />
          Reset
        </button>
        <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 dark:bg-amber-600 text-white font-bold text-sm hover:opacity-90 transition-all shadow-md">
          <DownloadIcon />
          Export PDF
        </button>
      </div>
    </div>
  );
};
