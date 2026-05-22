import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import type { AnnotatedWord, ConnectionLine } from '../types';
import { HIGHLIGHT_CLASSES } from '../constants';

interface EditorProps {
  linesOfWords: AnnotatedWord[][];
  lines: ConnectionLine[];
  onConnectWords: (fromWordId: string, toWordId: string) => void;
  onWordClick: (wordId: string) => void;
  selectedWordId: string | null;
  fontSize: number;
  lineSpacing: number;
}

interface LineCoord {
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export const Editor: React.FC<EditorProps> = ({ 
  linesOfWords, 
  lines, 
  onConnectWords, 
  onWordClick, 
  selectedWordId,
  fontSize,
  lineSpacing,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Map<string, HTMLSpanElement | null>>(new Map());
  const [lineCoords, setLineCoords] = useState<LineCoord[]>([]);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);

  const calculateLines = useCallback(() => {
    if (!editorRef.current) return;
    const editorRect = editorRef.current.getBoundingClientRect();
    const newCoords: LineCoord[] = [];
    
    lines.forEach(line => {
      const fromEl = wordRefs.current.get(line.fromWordId);
      const toEl = wordRefs.current.get(line.toWordId);

      if (fromEl && toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        newCoords.push({
            id: line.id,
            x1: fromRect.left + fromRect.width / 2 - editorRect.left,
            y1: fromRect.top - editorRect.top,
            x2: toRect.left + toRect.width / 2 - editorRect.left,
            y2: toRect.top - editorRect.top,
        });
      }
    });
    setLineCoords(newCoords);
  }, [lines]);

  useLayoutEffect(() => {
    calculateLines();
    const resizeObserver = new ResizeObserver(() => calculateLines());
    if (editorRef.current) {
        resizeObserver.observe(editorRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [linesOfWords, lines, calculateLines]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, wordId: string) => {
    e.dataTransfer.setData('text/plain', wordId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetWordId: string) => {
    e.preventDefault();
    const fromWordId = e.dataTransfer.getData('text/plain');
    onConnectWords(fromWordId, targetWordId);
  };
  
  const hoveredLine = lines.find(line => line.id === hoveredLineId);
  const hoveredWordIds = hoveredLine ? new Set([hoveredLine.fromWordId, hoveredLine.toWordId]) : new Set();

  return (
    <div ref={editorRef} className="relative p-8 md:p-16 min-h-full">
      {/* 
          Main Text Display:
          Using flex flex-wrap to handle line breaks within paragraphs.
          Styles are dynamic based on user selection.
      */}
      <div className="font-serif" style={{ fontSize: `${fontSize}px` }}>
        {linesOfWords.map((wordLine, lineIndex) => (
          <div 
            className="flex flex-wrap items-center" 
            style={{ 
                rowGap: `${lineSpacing}px`, 
                marginBottom: `${lineSpacing * 1.33}px` 
            }} 
            key={lineIndex}
          >
            {wordLine.map((word) => {
              // Handle whitespace as a special non-selectable separator
              if (/\s+/.test(word.text)) {
                return (
                    <span 
                      key={word.id} 
                      className="whitespace-pre text-stone-100 dark:text-stone-700 select-none px-0.5"
                    >
                      {word.text}
                    </span>
                );
              }

              const isStructural = /^[\[\]<>]$/.test(word.text);
              const highlightClass = word.highlight ? HIGHLIGHT_CLASSES[word.highlight] : '';
              const underlineClass = word.underline ? 'underline decoration-[3px] decoration-amber-600/40 underline-offset-4' : '';
              const isSelected = word.id === selectedWordId;
              const selectionClass = isSelected ? 'ring-[2px] ring-amber-500 ring-offset-[4px] dark:ring-offset-stone-700 rounded-md bg-amber-50/80 dark:bg-amber-900/20' : '';
              const isPulsating = hoveredWordIds.has(word.id);
              const pulsatingClass = isPulsating ? 'animate-pulse-word' : '';
              
              // Special styling for bracket "words"
              const structuralClass = isStructural ? 'text-amber-700/80 dark:text-amber-500/80 font-sans font-normal text-2xl md:text-3xl' : '';

              return (
                <div 
                  key={word.id} 
                  className="inline-flex flex-col items-center relative"
                >
                  {/* 
                      Annotations Container - Stacked above the word
                  */}
                  <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none overflow-visible z-30 w-fit">
                    {word.interlinearNote && (
                      <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-amber-900 dark:text-amber-300 leading-[1.2] whitespace-nowrap bg-amber-100/95 dark:bg-amber-900/90 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 shadow-sm animate-fadeInUp mb-1 pdf-annotation opacity-100">
                        {word.interlinearNote}
                      </span>
                    )}
                    {word.marker && (
                      <span className="text-[16px] font-serif font-black text-amber-800 dark:text-amber-300 leading-none animate-fadeIn pdf-marker opacity-100">
                        {word.marker}
                      </span>
                    )}
                  </div>

                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, word.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, word.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onWordClick(word.id);
                    }}
                    /* 
                       Stable height [1.4em] and items-center ensures no vertical movement
                       when brackets (which have larger fonts) are added or selected.
                    */
                    className={`cursor-pointer transition-all duration-200 px-[2px] flex items-center justify-center h-[1.4em] hover:bg-stone-200/30 dark:hover:bg-stone-600/30 rounded ${selectionClass} ${pulsatingClass}`}
                  >
                    <span
                      ref={el => {
                        if (el) {
                          wordRefs.current.set(word.id, el);
                        } else {
                          wordRefs.current.delete(word.id);
                        }
                      }}
                      className={`relative z-10 ${highlightClass} ${underlineClass} ${structuralClass} rounded-sm whitespace-nowrap px-0.5 leading-none h-full flex items-center`}
                    >
                      {word.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Connection Lines Layer */}
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 overflow-visible">
        {lineCoords.map(coord => {
          const { id, x1, y1, x2, y2 } = coord;
          const isHovered = id === hoveredLineId;
          const cx = (x1 + x2) / 2;
          
          // Ultra-flat arc: using 0.01 factor for an almost straight but slightly elegant curve.
          const arcHeight = Math.max(8, Math.abs(x1 - x2) * 0.01);
          const cy = Math.min(y1, y2) - arcHeight;
          const pathData = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;

          return (
            <path
              key={id}
              d={pathData}
              fill="none"
              className={`animate-drawLine transition-all duration-300 pointer-events-auto cursor-pointer ${
                isHovered
                  ? 'stroke-amber-600 dark:stroke-amber-400'
                  : 'stroke-teal-600/50 dark:stroke-teal-400/40'
              }`}
              strokeWidth={isHovered ? 4 : 2.5}
              onMouseEnter={() => setHoveredLineId(id)}
              onMouseLeave={() => setHoveredLineId(null)}
            />
          );
        })}
      </svg>
    </div>
  );
};