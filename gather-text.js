export const MAX_GATHER_TEXT_LENGTH = 2_000_000;
export function cleanGatheredText(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Copy some Latin first, or choose Paste instead.');
  if (value.length > MAX_GATHER_TEXT_LENGTH) throw new Error('This selection is too long. Copy a shorter passage.');
  return value.replace(/\r\n?/g, '\n').trim();
}

export function GatherText({React, onImport}) {
  const h = React.createElement;
  const popup = React.useRef(null);
  const token = React.useRef('');
  const callback = React.useRef(onImport);
  callback.current = onImport;
  const [status, setStatus] = React.useState('');
  React.useEffect(() => {
    const receive = event => {
      const data = event.data;
      if (event.origin !== location.origin || event.source !== popup.current || !token.current ||
          data?.type !== 'latinnotes:gather-text' || data.token !== token.current || typeof data.requestId !== 'string') return;
      try {
        const text = cleanGatheredText(data.text);
        callback.current(text);
        setStatus('Text added below. Choose Start Annotating when you’re ready.');
        event.source.postMessage({type: 'latinnotes:gather-text:added', token: token.current, requestId: data.requestId}, event.origin);
        requestAnimationFrame(() => document.querySelector('textarea[placeholder="Or paste your Latin text here..."]')?.focus());
      } catch (error) {
        event.source.postMessage({type: 'latinnotes:gather-text:error', token: token.current, requestId: data.requestId, message: error.message}, event.origin);
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  const open = () => {
    if (popup.current && !popup.current.closed) { popup.current.focus(); return; }
    token.current = crypto.randomUUID();
    const url = new URL('./gather-text.html', import.meta.url);
    url.hash = token.current;
    const width = Math.min(960, screen.availWidth), height = Math.min(760, screen.availHeight);
    popup.current = window.open(url.href, 'latinnotes-gather-text', `popup=yes,width=${width},height=${height},resizable=yes,scrollbars=yes`);
    if (!popup.current) setStatus('The text window was blocked. Allow pop-ups for LatinNotes and try again, or paste Latin into the box below.');
    else { popup.current.focus(); setStatus('Browse, select and copy Latin in the text window, then choose Add copied text.'); }
  };
  return h('div', {className: 'gather-text-control'},
    h('button', {type: 'button', onClick: open, className: 'gather-text-button'}, 'Gather Text'),
    h('span', {className: 'gather-text-hint'}, 'Browse The Latin Library and bring back a passage.'),
    h('p', {role: 'status'}, status));
}
