import React, { useState, useEffect, useMemo } from 'react';
import { QuillIcon, XIcon, CheckIcon, SunIcon, MoonIcon, ChevronDownIcon, ChevronUpIcon } from './components/Icons';
import { TextSelection } from './components/TextSelection';
import { Toolbar } from './components/Toolbar';
import { Editor } from './components/Editor';
import { DictionarySidebar } from './components/DictionarySidebar';
import type { AnnotatedWord, ConnectionLine, SavedSession, TokenResult } from './types';
import type { HighlightColor } from './constants';
import { exportToPdf } from './services/pdfService';
import { TranslationInput } from './components/TranslationInput';
import { parseLatinText } from './services/openWords';

interface LatinAnnotatorProps {
  onResetRequest: () => void;
}

const normalizeDictionaryWord = (word: string) =>
    word
        .replace(/^[^A-Za-zÀ-ÖØ-öø-ÿĀ-ſ]+|[^A-Za-zÀ-ÖØ-öø-ÿĀ-ſ]+$/g, '')
        .replace(/\d/g, '');

const LatinAnnotator: React.FC<LatinAnnotatorProps> = ({ onResetRequest }) => {
    const [view, setView] = useState<'selection' | 'annotating'>('selection');
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    // Annotation State
    const [linesOfWords, setLinesOfWords] = useState<AnnotatedWord[][]>([]);
    const [lines, setLines] = useState<ConnectionLine[]>([]);
    const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
    const [translation, setTranslation] = useState('');
    const [notes, setNotes] = useState('');
    const [isTranslationCollapsed, setIsTranslationCollapsed] = useState(false);
    const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
    const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
    const [isDictionaryCollapsed, setIsDictionaryCollapsed] = useState(false);
    const [dictionaryWord, setDictionaryWord] = useState('');
    const [dictionaryToken, setDictionaryToken] = useState<TokenResult | null>(null);
    const [dictionaryError, setDictionaryError] = useState('');
    const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);
    const [savedSlots, setSavedSlots] = useState<number[]>(() => {
        const slots: number[] = [];
        for (let i = 1; i <= 5; i++) {
            if (localStorage.getItem(`qualis-artifex-save-${i}`)) slots.push(i);
        }
        return slots;
    });

    const [saveStatus, setSaveStatus] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [slotToDelete, setSlotToDelete] = useState<number | null>(null);

    // Font and Spacing State
    const [fontSize, setFontSize] = useState(30);
    const [lineSpacing, setLineSpacing] = useState(48);

    // Overwrite Confirmation Modal state
    const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
    const [pendingSlot, setPendingSlot] = useState<number | null>(null);
    const [pendingTimestamp, setPendingTimestamp] = useState<string | null>(null);

    useEffect(() => {
        if (saveStatus) {
            const timer = setTimeout(() => setSaveStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [saveStatus]);

    // Note Modal State
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNote, setEditingNote] = useState('');

    const selectedWord = useMemo(
        () => linesOfWords.flat().find(word => word.id === selectedWordId) ?? null,
        [linesOfWords, selectedWordId]
    );
    const selectedDictionaryWord = selectedWord ? normalizeDictionaryWord(selectedWord.text) : '';

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if user is typing in an input or textarea
            const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
            if (isTyping || !selectedWordId || view !== 'annotating') return;

            const key = e.key.toLowerCase();
            const colorMap: Record<string, HighlightColor> = {
                'r': 'red',
                'g': 'green',
                'o': 'orange',
                'b': 'blue',
                'p': 'purple',
                'y': 'yellow'
            };

            if (colorMap[key]) {
                handleApplyHighlight(colorMap[key]);
            } else if (key === '1') {
                handleApplyMarker('①');
            } else if (key === '2') {
                handleApplyMarker('②');
            } else if (key === '3') {
                handleApplyMarker('③');
            } else if (key === '4') {
                handleApplyMarker('④');
            } else if (key === '5') {
                handleApplyMarker('⑤');
            } else if (key === 'u') {
                handleApplyUnderline();
            } else if (key === ',' || key === '<') {
                handleApplyBracket('caret', 'start');
            } else if (key === '.' || key === '>') {
                handleApplyBracket('caret', 'end');
            } else if (key === '[' || key === '{') {
                handleApplyBracket('square', 'start');
            } else if (key === ']' || key === '}') {
                handleApplyBracket('square', 'end');
            } else if (key === 'x') {
                handleClearAnnotations();
            } else if (e.code === 'Space' || key === ' ') {
                e.preventDefault();
                moveToNextWord();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedWordId, linesOfWords, view]);

    const toggleTheme = () => setIsDarkMode(!isDarkMode);

    const initializeAnnotationState = (text: string) => {
        const processedLines = text
            .split('\n')
            .map(line =>
                line.split(/(\s+)/)
                  .filter(w => w.length > 0)
                  .map(w => ({
                      id: crypto.randomUUID(),
                      text: w,
                  }))
            );
        setLinesOfWords(processedLines);
        setLines([]);
        setSelectedWordId(null);
        setTranslation('');
        setNotes('');
        setDictionaryWord('');
        setDictionaryToken(null);
        setDictionaryError('');
        setIsDictionaryLoading(false);
        setIsDictionaryOpen(false);
        setIsDictionaryCollapsed(false);
    };

    const handleStartAnnotating = (text: string) => {
        if (text.trim()) {
            initializeAnnotationState(text);
            setView('annotating');
        }
    };

    const handleWordClick = (wordId: string) => {
        setSelectedWordId(prevId => (prevId === wordId ? null : wordId));
    };

    const updateWordInLines = (updateFn: (word: AnnotatedWord) => AnnotatedWord) => {
        if (!selectedWordId) return;
        setLinesOfWords(prevLines => 
            prevLines.map(line =>
                line.map(word =>
                    word.id === selectedWordId ? updateFn(word) : word
                )
            )
        );
    };

    const handleApplyHighlight = (color: HighlightColor) => {
        updateWordInLines(word => ({ ...word, highlight: word.highlight === color ? undefined : color }));
        moveToNextWord();
    };

    const handleApplyUnderline = () => {
        updateWordInLines(word => ({ ...word, underline: !word.underline }));
        moveToNextWord();
    };
    
    const handleApplyMarker = (marker: string) => {
        updateWordInLines(word => ({ ...word, marker: word.marker === marker ? undefined : marker }));
        moveToNextWord();
    };

    const moveToNextWord = () => {
        if (!selectedWordId) return;
        const allWords = linesOfWords.flat();
        const currentIndex = allWords.findIndex(w => w.id === selectedWordId);
        if (currentIndex !== -1) {
            // Find the next word that isn't just whitespace
            const nextWordIndex = allWords.findIndex((w, i) => i > currentIndex && w.text.trim().length > 0);
            if (nextWordIndex !== -1) {
                setSelectedWordId(allWords[nextWordIndex].id);
            }
        }
    };

    const handleApplyBracket = (type: 'square' | 'caret', side: 'start' | 'end') => {
        if (!selectedWordId) return;
        const char = type === 'square' ? (side === 'start' ? '[' : ']') : (side === 'start' ? '<' : '>');
        
        setLinesOfWords(prevLines => 
            prevLines.map(line => {
                const index = line.findIndex(w => w.id === selectedWordId);
                if (index === -1) return line;
                
                const newBracketWord: AnnotatedWord = {
                    id: crypto.randomUUID(),
                    text: char,
                };
                
                const newLine = [...line];
                if (side === 'start') {
                    newLine.splice(index, 0, newBracketWord);
                } else {
                    newLine.splice(index + 1, 0, newBracketWord);
                }
                return newLine;
            })
        );
    };

    const handleOpenNoteModal = () => {
        if (!selectedWordId) return;
        setEditingNote(selectedWord?.interlinearNote || '');
        setIsNoteModalOpen(true);
    };

    const handleLookupSelectedWord = async () => {
        if (!selectedDictionaryWord) return;

        setIsDictionaryOpen(true);
        setIsDictionaryCollapsed(false);
        setDictionaryWord(selectedDictionaryWord);
        setDictionaryToken(null);
        setDictionaryError('');
        setIsDictionaryLoading(true);

        try {
            const parsed = await parseLatinText(selectedDictionaryWord);
            setDictionaryToken(parsed.tokens[0] ?? { word: selectedDictionaryWord, defs: [] });
        } catch (error) {
            setDictionaryError(error instanceof Error ? error.message : 'Could not look up the selected word.');
        } finally {
            setIsDictionaryLoading(false);
        }
    };

    const handleSaveNote = () => {
        updateWordInLines(w => ({ ...w, interlinearNote: editingNote.trim() || undefined }));
        setIsNoteModalOpen(false);
    };

    const handleClearAnnotations = () => {
        if (!selectedWordId) return;
        
        const word = linesOfWords.flat().find(w => w.id === selectedWordId);
        const isStructural = word && /^[\[\]<>]$/.test(word.text);

        if (isStructural) {
            setLinesOfWords(prevLines => 
                prevLines.map(line => line.filter(w => w.id !== selectedWordId))
            );
            setSelectedWordId(null);
        } else {
            updateWordInLines(word => ({
                ...word,
                highlight: undefined,
                underline: undefined,
                interlinearNote: undefined,
                marker: undefined,
            }));
        }
        
        setLines(prevLines => prevLines.filter(line => 
            line.fromWordId !== selectedWordId && line.toWordId !== selectedWordId
        ));
    };

    const handleConnectWords = (fromWordId: string, toWordId: string) => {
        if (fromWordId === toWordId) return;
        const newLine: ConnectionLine = {
            id: crypto.randomUUID(),
            fromWordId,
            toWordId,
        };
        setLines(prev => [...prev, newLine]);
    };

    const handleExport = () => {
        exportToPdf('editor-container', translation, notes);
    };

    const handleSave = (slot: number) => {
        const slotKey = `qualis-artifex-save-${slot}`;
        const existingSave = localStorage.getItem(slotKey);
        
        if (existingSave) {
            let timestampStr = "unknown time";
            try {
                const parsed = JSON.parse(existingSave);
                if (parsed.timestamp) {
                    timestampStr = new Date(parsed.timestamp).toLocaleString();
                }
            } catch (e) {
                console.error("Error parsing existing save for timestamp", e);
            }
            
            setPendingSlot(slot);
            setPendingTimestamp(timestampStr);
            setIsOverwriteModalOpen(true);
            return;
        }

        executeSave(slot);
    };

    const executeSave = (slot: number) => {
        const slotKey = `qualis-artifex-save-${slot}`;
        try {
            // captures current state values
            const sessionToSave: SavedSession = {
                linesOfWords: JSON.parse(JSON.stringify(linesOfWords)),
                lines: JSON.parse(JSON.stringify(lines)),
                translation: translation,
                notes: notes,
                timestamp: Date.now(),
                fontSize: fontSize,
                lineSpacing: lineSpacing,
            };

            const serialized = JSON.stringify(sessionToSave);
            
            // Explicitly remove then set to avoid any weirdness with browser storage limits or caching
            localStorage.removeItem(slotKey);
            localStorage.setItem(slotKey, serialized);
            
            // Verify the save actually worked by immediate retrieval
            const verifiedData = localStorage.getItem(slotKey);
            if (!verifiedData) {
                throw new Error("Verification failed: Data not found in storage after write.");
            }

            // Force update savedSlots to ensure UI reflects current localStorage state
            const newSavedSlots: number[] = [];
            for (let i = 1; i <= 5; i++) {
                if (localStorage.getItem(`qualis-artifex-save-${i}`)) {
                    newSavedSlots.push(i);
                }
            }
            setSavedSlots(newSavedSlots);
            
            setSaveStatus(`Session saved to Slot ${slot}`);
            setIsOverwriteModalOpen(false);
            setPendingSlot(null);
            setPendingTimestamp(null);
        } catch (error) {
            console.error('Failed to save session:', error);
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                alert('CRITICAL ERROR: Storage limit reached. Your text might be too large for browser storage. Try using a shorter text.');
            } else {
                alert('CRITICAL ERROR: Failed to save session. Check if your browser supports localStorage.');
            }
        }
    };

    const handleLoad = (slot: number) => {
        const slotKey = `qualis-artifex-save-${slot}`;
        const savedData = localStorage.getItem(slotKey);

        if (!savedData) {
            alert(`No data found in slot ${slot}.`);
            return;
        }

        try {
            const session: SavedSession = JSON.parse(savedData);
            
            // Defensive checks to ensure markings are restored even if session object is partial
            if (session.linesOfWords) setLinesOfWords(session.linesOfWords);
            if (session.lines) setLines(session.lines);
            
            setTranslation(session.translation || '');
            setNotes(session.notes || '');
            
            if (session.fontSize) setFontSize(session.fontSize);
            if (session.lineSpacing) setLineSpacing(session.lineSpacing);
            
            setSelectedWordId(null);
            setDictionaryWord('');
            setDictionaryToken(null);
            setDictionaryError('');
            setIsDictionaryLoading(false);
            setView('annotating');
            alert(`Session loaded from slot ${slot}!`);
        } catch (error) {
            console.error('Failed to load session:', error);
            alert('Error loading saved session. The data might be corrupted.');
        }
    };

    const onDeleteSession = (slot: number) => {
        setSlotToDelete(slot);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteSession = () => {
        if (slotToDelete === null) return;
        const slotKey = `qualis-artifex-save-${slotToDelete}`;
        localStorage.removeItem(slotKey);
        
        // Force update savedSlots to ensure UI reflects current localStorage state
        const newSavedSlots: number[] = [];
        for (let i = 1; i <= 5; i++) {
            if (localStorage.getItem(`qualis-artifex-save-${i}`)) {
                newSavedSlots.push(i);
            }
        }
        setSavedSlots(newSavedSlots);
        setSaveStatus(`Session in Slot ${slotToDelete} Deleted`);
        setIsDeleteModalOpen(false);
        setSlotToDelete(null);
    };

    return (
        <div className="flex flex-col h-screen text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-950 transition-colors duration-500">
            <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 shadow-sm bg-white dark:bg-stone-900/80 backdrop-blur-md z-30 transition-colors duration-500">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-100 dark:bg-amber-900/40 p-2.5 rounded-xl shadow-inner transition-colors duration-500">
                        <QuillIcon />
                    </div>
                    <div>
                        <h1 className="text-2xl font-serif font-bold tracking-tight text-amber-900 dark:text-amber-400">Qualis Artifex</h1>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 dark:text-stone-400 font-bold opacity-80">Digital Scriptorium</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {view === 'annotating' && (
                      <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-tighter">Activus</p>
                      </div>
                    )}
                    <button 
                        onClick={toggleTheme}
                        className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all text-stone-600 dark:text-amber-400 shadow-sm border border-stone-200 dark:border-stone-700"
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <SunIcon /> : <MoonIcon />}
                    </button>
                </div>
            </header>
            
            {saveStatus && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-bold flex flex-col items-center gap-3 animate-bounce shadow-green-500/50 border-4 border-white/30 backdrop-blur-md">
                    <div className="bg-white/20 p-2 rounded-full">
                        <CheckIcon />
                    </div>
                    <span className="text-xl tracking-tight">{saveStatus}</span>
                </div>
            )}

            {isOverwriteModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-sm bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border-2 border-amber-500/30 overflow-hidden transform animate-fadeInUp">
                        <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/30">
                            <h3 className="font-serif font-bold text-xl text-amber-950 dark:text-amber-400">Overwrite Slot {pendingSlot}?</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-stone-600 dark:text-stone-300">
                                This slot already contains a save from <span className="font-bold text-amber-700 dark:text-amber-400">{pendingTimestamp}</span>.
                            </p>
                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                Do you want to replace it with your current progress?
                            </p>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={() => pendingSlot && executeSave(pendingSlot)}
                                    className="flex-grow py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                                >
                                    Yes, Overwrite
                                </button>
                                <button 
                                    onClick={() => { setIsOverwriteModalOpen(false); setPendingSlot(null); }}
                                    className="px-6 py-3 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 rounded-xl font-bold hover:bg-stone-200 dark:hover:bg-stone-600 transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-sm bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border-2 border-red-500/30 overflow-hidden transform animate-fadeInUp">
                        <div className="p-6 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30">
                            <h3 className="font-serif font-bold text-xl text-red-950 dark:text-red-400">Delete Slot {slotToDelete}?</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-stone-600 dark:text-stone-300">
                                Are you sure you want to <span className="font-bold text-red-700 dark:text-red-400 uppercase">permanently delete</span> the save in Slot {slotToDelete}?
                            </p>
                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    onClick={confirmDeleteSession}
                                    className="flex-grow py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                                >
                                    Delete Permanently
                                </button>
                                <button 
                                    onClick={() => { setIsDeleteModalOpen(false); setSlotToDelete(null); }}
                                    className="px-6 py-3 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 rounded-xl font-bold hover:bg-stone-200 dark:hover:bg-stone-600 transition-all shadow-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
                {view === 'selection' ? (
                    <div className="flex-grow flex flex-col p-8 overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-stone-50 via-stone-100 to-stone-200 dark:from-stone-900 dark:via-stone-950 dark:to-black">
                        <div className="max-w-4xl w-full mx-auto flex-grow rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-fadeInUp">
                            <TextSelection 
                                onStartAnnotating={handleStartAnnotating} 
                                onLoad={handleLoad}
                                onDelete={onDeleteSession}
                                savedSlots={savedSlots}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-grow flex flex-col p-4 md:p-6 overflow-visible animate-fadeIn z-40">
                        <div className="animate-fadeInUp relative z-50" style={{ animationDelay: '50ms' }}>
                            <div className="mb-3 flex items-center gap-2 px-1">
                                <div className="w-1 h-1 rounded-full bg-amber-500"></div>
                                <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                                    To connect words, simply drag one word and drop it onto another.
                                </p>
                            </div>
                             <Toolbar 
                                onHighlight={handleApplyHighlight}
                                onUnderline={handleApplyUnderline}
                                onMarker={handleApplyMarker}
                                onBracket={handleApplyBracket}
                                onClear={handleClearAnnotations}
                                onExport={handleExport}
                                onReset={onResetRequest}
                                onAddNote={handleOpenNoteModal}
                                onLookupWord={handleLookupSelectedWord}
                                onSave={handleSave}
                                onLoad={handleLoad}
                                onDelete={onDeleteSession}
                                isWordSelected={!!selectedWordId}
                                canLookupWord={!!selectedDictionaryWord}
                                savedSlots={savedSlots}
                                fontSize={fontSize}
                                onFontSizeChange={setFontSize}
                                lineSpacing={lineSpacing}
                                onLineSpacingChange={setLineSpacing}
                            />
                        </div>
                        <div 
                            className="flex-grow flex flex-col mt-4 md:mt-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden animate-fadeInUp relative"
                            style={{ animationDelay: '150ms' }}
                        >
                            <div id="editor-container" className="flex-grow overflow-auto relative bg-white dark:bg-stone-700 transition-colors duration-500">
                                <Editor
                                    linesOfWords={linesOfWords}
                                    lines={lines}
                                    onConnectWords={handleConnectWords}
                                    onWordClick={handleWordClick}
                                    selectedWordId={selectedWordId}
                                    fontSize={fontSize}
                                    lineSpacing={lineSpacing}
                                />
                            </div>
                            <div className="flex-shrink-0 grid md:grid-cols-2 gap-4 p-4 md:p-6 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/80 backdrop-blur-md transition-colors duration-500">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Translation</label>
                                        <button 
                                            onClick={() => setIsTranslationCollapsed(!isTranslationCollapsed)}
                                            className="p-1 rounded-md hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 transition-colors"
                                        >
                                            {isTranslationCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                        </button>
                                    </div>
                                    {!isTranslationCollapsed && (
                                        <TranslationInput 
                                            value={translation}
                                            onChange={(e) => setTranslation(e.target.value)}
                                            placeholder="A faithful rendering of the Latin text..."
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">Scholarly Notes</label>
                                        <button 
                                            onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
                                            className="p-1 rounded-md hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 transition-colors"
                                        >
                                            {isNotesCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
                                        </button>
                                    </div>
                                    {!isNotesCollapsed && (
                                        <TranslationInput 
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Grammatical, historical, or literary commentary..."
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'annotating' && (
                    <DictionarySidebar
                        isOpen={isDictionaryOpen}
                        isCollapsed={isDictionaryCollapsed}
                        word={dictionaryWord}
                        token={dictionaryToken}
                        isLoading={isDictionaryLoading}
                        error={dictionaryError}
                        onCollapse={() => setIsDictionaryCollapsed(true)}
                        onExpand={() => setIsDictionaryCollapsed(false)}
                        onClose={() => setIsDictionaryOpen(false)}
                    />
                )}

                {/* Note Modal Overlay */}
                {isNoteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
                        <div className="w-full max-w-md bg-white dark:bg-stone-800 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/50 overflow-hidden transform animate-fadeInUp transition-colors duration-500">
                            <div className="p-6 bg-amber-50 dark:bg-amber-900/40 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between transition-colors duration-500">
                                <h3 className="font-serif font-bold text-xl text-amber-900 dark:text-amber-400">Add Interlinear Note</h3>
                                <button onClick={() => setIsNoteModalOpen(false)} className="text-stone-400 hover:text-stone-600 transition-colors">
                                    <XIcon />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-xs text-stone-500 dark:text-stone-400 italic">This note will appear directly above the selected word in the editor.</p>
                                <textarea
                                    autoFocus
                                    value={editingNote}
                                    onChange={(e) => setEditingNote(e.target.value)}
                                    placeholder="Enter your note here..."
                                    className="w-full h-24 p-4 font-serif bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all resize-none dark:text-stone-100 shadow-inner"
                                />
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={handleSaveNote}
                                        className="flex-grow flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                                    >
                                        <CheckIcon />
                                        Save Note
                                    </button>
                                    <button 
                                        onClick={() => setIsNoteModalOpen(false)}
                                        className="px-6 py-2.5 bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-200 rounded-xl font-bold hover:bg-stone-200 dark:hover:bg-stone-600 transition-all shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default LatinAnnotator;
