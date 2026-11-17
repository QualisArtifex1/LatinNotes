const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const matching = require('../commentary-matching.js');
const context = {window:{}};
vm.runInNewContext(read('caesar-commentary.js'), context);
const entries = context.window.LATIN_CAESAR_COMMENTARY;
const bundle = read('assets/index-DNmu9U65.js');
const marker = 'zc=Object.assign({},window.LATIN_READINGS=';
const start = bundle.indexOf(marker) + marker.length;
const end = bundle.indexOf(',window.LATIN_LESSON_READINGS)', start);
const readings = vm.runInNewContext('(' + bundle.slice(start,end) + ')').Caesar;
const counts = [21,13,20,11,11,17,15];
const plain = html => html.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&nbsp;/g,'\u00a0').replace(/\s+/g,' ').trim();
assert.deepEqual(Object.keys(entries),counts.map((_,i)=>`De Bello Gallico, 1.${i+1}`));
let noteCount=0, anchored=0, references=0;
for (let chapter=1;chapter<=7;chapter++) {
  const entry=entries[`De Bello Gallico, 1.${chapter}`];
  assert.equal(entry.notes.length,counts[chapter-1]);
  assert.equal(new Set(entry.notes.map(n=>n.id)).size,entry.notes.length);
  assert.equal(entry.notes[0].label,'Overview');
  assert.equal(entry.notes[0].anchorPhrases.length,0);
  assert.match(entry.credit,/Dickinson College Commentaries/);
  assert.match(entry.sourceCitation,/Christopher Francese/);
  assert.match(entry.sourceCitation,/Attribution-ShareAlike/);
  assert.equal(entry.sourceUrl,`https://dcc.dickinson.edu/caesar/book-1/chapter-1-${chapter}`);
  const hash=crypto.createHash('sha256').update(entry.notes.map(n=>plain(n.commentHtml)).join('\n')).digest('hex');
  assert.equal(hash,entry.sourceNotesSha256,`All source wording and paragraphs retained: 1.${chapter}`);
  for (const note of entry.notes) {
    assert(!/<(?:a|script|style|iframe|img)\b|\b(?:href|onclick|style)=/i.test(note.commentHtml));
    assert(note.commentHtml.startsWith('<p>') && note.commentHtml.endsWith('</p>'));
  }
  const words=readings[entry.key].split(/\s+/).filter(w=>matching.normalize(w)).map(text=>({text,key:matching.normalize(text)}));
  const result=matching.attach(entry.notes,words);
  assert(result.audit.every(row=>row.status.startsWith('matched')),`No unmatched, partial or ambiguous anchors in 1.${chapter}`);
  for (const note of entry.notes.slice(1)) assert(result.assignments.some(ids=>ids.has(note.id)),note.id);
  if(chapter===1) {
    const northeast=result.audit.find(row=>row.noteId.endsWith('note-20'));
    assert.equal(northeast.indices.length,5);
    assert.equal(northeast.indices.map(i=>words[i].key).join(' '),'in septentrionem et orientem solem');
    for(const name of ['belgae','aquitani','celtae']) assert(result.audit.some(row=>row.noteId.endsWith('note-04')&&row.indices.some(i=>words[i].key===name)));
  }
  if(chapter===5) {
    assert(entry.notes[3].commentHtml.includes('praeterquam quod'));
    assert.equal(result.audit.find(row=>row.noteId.endsWith('note-04')).indices.map(i=>words[i].key).join(' '),'praeter quod');
    assert(entry.notes.at(-1).commentHtml.includes('asciscunt'));
  }
  noteCount+=entry.notes.length;anchored+=entry.notes.length-1;references+=result.audit.length;
}
assert.equal(noteCount,108);assert.equal(anchored,101);
const html=read('index.html');
assert(html.indexOf('caesar-commentary.js')<html.indexOf('commentary-data.js?v='));
assert.match(html,/commentary-matching\.js\?v=20261117-caesar-1/);
// Exercise the actual shipped decoder, not just the standalone imported data.
(async()=>{
  const sandbox={window:{LATIN_CAESAR_COMMENTARY:entries},document:{createElement:()=>({innerHTML:'',get textContent(){return this.innerHTML.replace(/<[^>]*>/g,'');}})},DecompressionStream,Blob,Response,Uint8Array,atob};
  vm.runInNewContext(read('lesson-readings.js'),sandbox);
  for(let i=1;i<=4;i++)vm.runInNewContext(read(`commentary-data-0${i}.js`),sandbox);
  vm.runInNewContext(read('commentary-data.js'),sandbox);
  const data=await sandbox.window.LATIN_COMMENTARY_PROMISE;
  for(const key of Object.keys(entries))assert.equal(data[key],entries[key]);
  assert(data['Epistulae, 6.16']);assert(data['Lesson 34 (Aeneid 1.1-33)']);
  assert.equal(data['De Bello Gallico, 4.24'],undefined);
  console.log(`PASS: ${noteCount} complete source paragraphs; ${anchored} anchored notes / ${references} references; wording hashes, plain references, attribution, exact source variants, and shipped loader.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
