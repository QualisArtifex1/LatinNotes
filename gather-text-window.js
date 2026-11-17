import {cleanGatheredText} from './gather-text.js?v=20261117-gather-1';

const token = location.hash.slice(1);
const status = document.getElementById('status');
const pasteStatus = document.getElementById('paste-status');
const dialog = document.getElementById('paste-dialog');
const input = document.getElementById('latin-text');
const addButton = document.getElementById('add-copied');
const submitButton = document.querySelector('#paste-form [type=submit]');
let pending = '', timer, clipboardAttempt = 0;
const openerAvailable = () => window.opener && !window.opener.closed && token;
const busy = value => { addButton.disabled = value; submitButton.disabled = value; };
const showPaste = message => {
  clipboardAttempt += 1;
  busy(false);
  document.getElementById('paste-help').textContent = message || 'Paste your copied passage below, then choose Add text.';
  pasteStatus.textContent = '';
  if (!dialog.open) dialog.showModal();
  input.focus();
};
const add = value => {
  let text;
  try { text = cleanGatheredText(value); }
  catch (error) { (dialog.open ? pasteStatus : status).textContent = error.message; return; }
  if (!openerAvailable()) {
    status.textContent = 'Open LatinNotes and choose Gather Text there to connect this window. Your passage is still here.';
    return;
  }
  pending = crypto.randomUUID();
  busy(true);
  status.textContent = 'Adding text to LatinNotes…';
  window.opener.postMessage({type: 'latinnotes:gather-text', token, requestId: pending, text}, location.origin);
  clearTimeout(timer);
  timer = setTimeout(() => {
    pending = ''; busy(false);
    status.textContent = 'LatinNotes did not respond. Return to its opening page and try again. Your copied text has been kept below.';
    input.value = text;
    showPaste('Your passage is kept here. Return to the opening page in LatinNotes, then try Add text again.');
  }, 5000);
};
window.addEventListener('message', event => {
  const data = event.data;
  if (event.origin !== location.origin || event.source !== window.opener || !pending || data?.token !== token || data.requestId !== pending) return;
  if (!['latinnotes:gather-text:added', 'latinnotes:gather-text:error'].includes(data.type)) return;
  clearTimeout(timer); pending = ''; busy(false);
  if (data.type === 'latinnotes:gather-text:error') { status.textContent = data.message; pasteStatus.textContent = data.message; return; }
  status.textContent = 'Text added. Returning to LatinNotes…';
  window.opener.focus();
  window.close();
});
addButton.addEventListener('click', async () => {
  if (!navigator.clipboard?.readText) { showPaste(); return; }
  const attempt = ++clipboardAttempt;
  busy(true);
  status.textContent = 'Allow clipboard access if asked, or choose Paste instead.';
  try {
    const text = await navigator.clipboard.readText();
    if (attempt !== clipboardAttempt) return;
    busy(false);
    if (!text.trim()) { showPaste('The clipboard is empty. Copy your Latin, then paste it here.'); return; }
    add(text);
  } catch {
    if (attempt !== clipboardAttempt) return;
    busy(false);
    showPaste('Paste your copied Latin here, then choose Add text.');
  }
});
document.getElementById('paste-instead').addEventListener('click', () => showPaste());
document.getElementById('paste-form').addEventListener('submit', event => { event.preventDefault(); add(input.value); });
document.getElementById('cancel-paste').addEventListener('click', () => dialog.close());
document.getElementById('library-home').addEventListener('click', () => { document.getElementById('library').src = 'https://www.thelatinlibrary.com/'; });
document.getElementById('return-to-app').addEventListener('click', () => {
  if (window.opener && !window.opener.closed) { window.opener.focus(); window.close(); }
  else location.href = new URL('./', location.href).href;
});
if (/Mac|iPhone|iPad/.test(navigator.platform)) document.getElementById('copy-shortcut').textContent = '⌘C';
if (!openerAvailable()) status.textContent = 'Open LatinNotes first and choose Gather Text to connect this window.';
