import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {findCulturalLesson,renderCulturalEntry} from '../before-you-read.js';
const context={window:{}};vm.runInNewContext(readFileSync(new URL('../lesson-readings.js',import.meta.url),'utf8'),context);
const notes=JSON.parse(readFileSync(new URL('../cultural-notes/notes.json',import.meta.url)));
for(const lesson of context.window.LATIN_LESSONS){
 const words=[lesson.text.split(/\s+/).map(text=>({text}))];
 assert.equal(findCulturalLesson(words,context.window.LATIN_LESSONS),lesson.number);
 const entry=notes.find(n=>n.lesson===lesson.number);assert(entry);
 const html=renderCulturalEntry(entry);assert(html.includes(entry.passage.replaceAll('&','&amp;')));
 for(const figure of entry.figures||[])assert(existsSync(new URL('../cultural-notes/images'+figure.src,import.meta.url)));
}
assert.equal(findCulturalLesson([[{text:'Custom Latin passage'}]],context.window.LATIN_LESSONS),undefined);
console.log('PASS: all 69 lesson mappings, complete content rendering, local figures, and custom passage fallback.');
