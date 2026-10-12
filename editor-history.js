// Snapshots hold immutable React state references. A new document starts a new
// history; saved sessions keep their existing format and never include history.
const keys = ['words', 'lines', 'translation', 'notes', 'fontSize', 'lineSpacing'];
const same = (a, b) => a && b && keys.every(key => a[key] === b[key]);
export class EditorHistory {
  constructor(limit = 100) { this.limit = limit; this.reset(null); }
  reset(snapshot) {
    this.present = snapshot;
    this.past = [];
    this.future = [];
    this.typingField = null;
    this.lastTyped = 0;
  }
  record(snapshot, now = Date.now()) {
    if (!this.present) { this.present = snapshot; return false; }
    if (same(this.present, snapshot)) return false;
    const changed = keys.filter(key => this.present[key] !== snapshot[key]);
    const field = changed.length === 1 && ['translation', 'notes'].includes(changed[0]) ? changed[0] : null;
    if (!(field && this.typingField === field && now-this.lastTyped < 750)) {
      this.past.push(this.present);
      if (this.past.length > this.limit) this.past.shift();
    }
    this.present = snapshot;
    this.future = [];
    this.typingField = field;
    this.lastTyped = now;
    return true;
  }
  undo() {
    if (!this.past.length) return null;
    this.future.push(this.present);
    this.present = this.past.pop();
    this.typingField = null;
    return this.present;
  }
  redo() {
    if (!this.future.length) return null;
    this.past.push(this.present);
    this.present = this.future.pop();
    this.typingField = null;
    return this.present;
  }
}
export function useEditorHistory(React, snapshot, apply, enabled, blocked) {
  const history = React.useRef(null);
  if (!history.current) history.current = new EditorHistory();
  const [, refresh] = React.useState(0);
  const [reading, setReading] = React.useState(false);
  React.useLayoutEffect(() => {
    if (history.current.record(snapshot)) refresh(n => n+1);
  }, [snapshot.words, snapshot.lines, snapshot.translation, snapshot.notes, snapshot.fontSize, snapshot.lineSpacing]);
  const restore = direction => {
    const value = history.current[direction]();
    if (value) { apply(value); refresh(n => n+1); }
  };
  React.useEffect(() => {
    if (!enabled) return;
    const keydown = event => {
      if (blocked || event.defaultPrevented || event.isComposing || event.target.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"]')) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && !event.altKey && (key === 'z' || (key === 'y' && event.ctrlKey && !event.metaKey))) {
        event.preventDefault();
        restore(key === 'y' || event.shiftKey ? 'redo' : 'undo');
      } else if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && (key === 'r' || event.code === 'KeyR')) {
        event.preventDefault();
        setReading(value => !value);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });
  return {
    canUndo: !!history.current.past.length, canRedo: !!history.current.future.length,
    undo: () => restore('undo'), redo: () => restore('redo'),
    reading, toggleReading: () => setReading(value => !value),
    reset: () => { history.current.reset(null); setReading(false); }
  };
}
export function EditorActions({React, history, compact=false}) {
  const button = (label, action, disabled, title, extra = {}) => React.createElement('button', {
    type: 'button', onClick: action, disabled, title,
    className: 'px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed', ...extra
  }, label);
  return React.createElement('div', {className:'flex flex-wrap items-center gap-2 mb-3', role:'group', 'aria-label':'History and reading view'},
    button('↶ Undo',history.undo,!history.canUndo,'Undo (Ctrl/Cmd+Z)',{'aria-label':'Undo', 'aria-keyshortcuts':'Control+z Meta+z'}),
    button('↷ Redo',history.redo,!history.canRedo,'Redo (Ctrl/Cmd+Shift+Z; Ctrl+Y)',{'aria-label':'Redo', 'aria-keyshortcuts':'Control+Shift+z Meta+Shift+z Control+y'}),
    button(history.reading?'Return to Annotating':'Reading View',history.toggleReading,false,'Toggle Reading View (Alt/Option+Shift+R)',{'aria-pressed':history.reading,'aria-keyshortcuts':'Alt+Shift+r'}),
    !compact && history.reading && React.createElement('span',{className:'text-sm text-stone-500 dark:text-stone-400',role:'status'},'Annotations are hidden, not deleted.')
  );
}
export function ReadingText({React, words, fontSize, lineSpacing}) {
  return React.createElement('div', {className:'p-8 md:p-16 min-h-full font-serif', 'data-reading-view':true,style:{fontSize:`${fontSize}px`,lineHeight:1.6}},
    words.map((line,index)=>React.createElement('div',{key:index,style:{marginBottom:`${lineSpacing}px`,whiteSpace:'pre-wrap'}},
      line.filter(word=>!word.annotationBracket).map(word=>word.text).join('')))
  );
}
