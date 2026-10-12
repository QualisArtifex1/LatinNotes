const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const zlib = require('node:zlib');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const context = { window: {} };
vm.runInNewContext(read('lesson-readings.js'), context);
const lessons = JSON.parse(JSON.stringify(context.window.LATIN_LESSONS));
const bundle = read('assets/index-DNmu9U65.js');
const start = bundle.indexOf('zc=Object.assign(') + 'zc=Object.assign('.length;
const end = bundle.indexOf(',window.LATIN_LESSON_READINGS)', start);
assert(start > 0 && end > start);
const original = vm.runInNewContext('(' + bundle.slice(start, end) + ')');
const chunks = [1, 2, 3, 4].map(n => read(`commentary-data-0${n}.js`).match(/push\('([^']+)'\)/)[1]).join('');
const compact = JSON.parse(zlib.gunzipSync(Buffer.from(chunks, 'base64')));
const removeSpace = text => text.replace(/\s+/g, '');
const expectedNumbers = [...Array.from({ length: 32 }, (_, i) => i + 1), ...Array.from({ length: 37 }, (_, i) => i + 34)];
assert.deepEqual(lessons.map(l => l.number), expectedNumbers);
assert.equal(new Set(lessons.map(l => l.label)).size, 69);
for (const lesson of lessons) {
  assert.match(lesson.label, new RegExp(`^Lesson ${lesson.number} \\(`));
  assert(lesson.text.trim());
  assert(lesson.commentaryRefs.length);
  assert.equal(lesson.pdfPage, 12 + 2 * lesson.number);
  for (const [key, index] of lesson.commentaryRefs) {
    assert(lesson.sources.some(s => s.key === key));
    assert(compact[key][4][index], `${lesson.label}: missing note`);
    if (lesson.author === 'Vergil') {
      const line = Number(compact[key][4][index][0]);
      assert(lesson.sources.some(s => s.key === key && s.lines.includes(line)), `${lesson.label}: commentary outside lesson at ${line}`);
    }
  }
}
for (const author of ['Pliny the Younger', 'Vergil']) {
  for (const [key, text] of Object.entries(original[author])) {
    const recovered = [];
    if (author === 'Pliny the Younger') {
      for (const lesson of lessons.filter(l => l.author === author)) {
        for (const source of lesson.sources.filter(s => s.key === key)) {
          assert.equal(lesson.text, text.slice(source.start, source.end).trim());
          recovered.push([source.start, lesson.text]);
        }
      }
    } else {
      for (const lesson of lessons.filter(l => l.author === author)) {
        const physical = lesson.text.split('\n');
        // Verse 7.45 is two physical lines in the original app; preserve both.
        const lines = lesson.number === 58 ? [physical[0] + '\n' + physical[1], ...physical.slice(2)] : physical;
        assert.equal(lines.length, lesson.sources.reduce((n, s) => n + s.lines.length, 0));
        let offset = 0;
        for (const source of lesson.sources) {
          if (source.key === key) source.lines.forEach((line, i) => recovered.push([line, lines[offset + i]]));
          offset += source.lines.length;
        }
      }
    }
    assert.equal(new Set(recovered.map(([n]) => n)).size, recovered.length, `Duplicate text: ${key}`);
    recovered.sort((a, b) => a[0] - b[0]);
    assert.equal(removeSpace(recovered.map(([, t]) => t).join(' ')), removeSpace(text), `Changed or missing Latin: ${key}`);
  }
}
const byNumber = n => lessons.find(l => l.number === n);
assert.equal(byNumber(34).label, 'Lesson 34 (Aeneid 1.1-33)');
assert.equal(byNumber(34).text.split('\n').length, 11);
assert.equal(byNumber(38).sources.length, 2);
assert.equal(byNumber(38).text.split('\n').length, 13);
assert.equal(byNumber(41).sources.length, 2);
assert.equal(byNumber(46).sources.length, 2);
assert.equal(byNumber(57).sources.length, 2);
assert.equal(byNumber(66).text.split('\n').length, 13);
assert.equal(byNumber(67).text.split('\n').length, 14);
const applied = Object.assign({}, original, context.window.LATIN_LESSON_READINGS);
for (const author of Object.keys(original).filter(a => !['Pliny the Younger', 'Vergil'].includes(a))) {
  assert.deepEqual(applied[author], original[author]);
}
const html = read('index.html');
assert(html.indexOf('lesson-readings.js') < html.indexOf('assets/index-DNmu9U65.js'));
assert.match(html, /index-DNmu9U65\.js\?v=20261012-culture-1/);
console.log('PASS: 69 ordered lessons; exact Latin coverage; combined passages; lesson-specific commentary; other authors unchanged; cache version.');
// Exercise the shipped decoder and lesson enrichment, including exact verse maps.
(async () => {
  const sandbox = {
    window: { LATIN_LESSONS: lessons, LATIN_COMMENTARY_CHUNKS: [chunks] },
    document: { createElement: () => ({ innerHTML: '', get textContent() { return this.innerHTML.replace(/<[^>]*>/g, ''); } }) },
    DecompressionStream, Blob, Response, Uint8Array, atob,
  };
  vm.runInNewContext(read('commentary-data.js'), sandbox);
  const data = await sandbox.window.LATIN_COMMENTARY_PROMISE;
  for (const lesson of lessons) {
    const entry = data[lesson.label];
    assert.equal(entry.notes.length, lesson.commentaryRefs.length + (lesson.number === 48 ? 1 : 0));
    assert(entry.notes.every(note => note.reading === lesson.label));
    if (lesson.author === 'Vergil') assert.equal(entry.lineNumbers.length, lesson.text.split('\n').length);
  }
  assert.deepEqual(Array.from(data[byNumber(38).label].lineNumbers), [102,103,104,105,106,107,496,497,498,499,500,501,502]);
  assert(data['Epistulae, 6.16'], 'Legacy commentary must remain available');
  assert(data['Aeneid, 1.1-33'], 'Legacy commentary must remain available');
  console.log('PASS: shipped commentary decoder, all lesson notes, discontinuous verse maps, and legacy entries.');
})().catch(error => { console.error(error); process.exitCode = 1; });
