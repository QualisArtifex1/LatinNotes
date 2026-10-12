const fs=require('node:fs'),vm=require('node:vm'),zlib=require('node:zlib'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');const matcher=require('../commentary-matching.js');
const context={window:{}};vm.runInNewContext(read('lesson-readings.js'),context);
const chunks=[1,2,3,4].map(i=>read(`commentary-data-0${i}.js`).match(/push\('([^']+)'\)/)[1]).join('');const data=JSON.parse(zlib.gunzipSync(Buffer.from(chunks,'base64')));
const rows=[];
for(const lesson of context.window.LATIN_LESSONS){const mapped=lesson.author==='Vergil'?lesson.sources.flatMap(s=>s.lines.flatMap(n=>lesson.number===58&&n===45?[45,45]:[n])):null;
 const words=lesson.text.split('\n').flatMap((line,i)=>line.split(/\s+/).filter(w=>matcher.normalize(w)).map(text=>({key:matcher.normalize(text),lineNumber:mapped?mapped[i]:i+1,text})));
 const notes=lesson.commentaryRefs.map(([key,i],n)=>({id:lesson.label+':'+n,line:data[key][4][i][0],commentHtml:data[key][4][i][2]}));
 if(lesson.number===48)notes.unshift({id:lesson.label+':continuation-185',line:data['Aeneid, 4.165-197'][4][20][0],commentHtml:data['Aeneid, 4.165-197'][4][20][2]});
 for(const row of matcher.attach(notes,words,!!mapped).audit)rows.push({lesson:lesson.number,...row,attachedWords:row.indices.map(i=>words[i].text)});
}
const bundle=read('assets/index-DNmu9U65.js');const start=bundle.indexOf('zc=Object.assign(')+'zc=Object.assign('.length;const end=bundle.indexOf(',window.LATIN_LESSON_READINGS)',start);const originals=vm.runInNewContext('('+bundle.slice(start,end)+')');
for(const [key,entry] of Object.entries(data).filter(([key])=>!key.startsWith('Aeneid,')&&!key.startsWith('Epistulae,'))){const text=Object.values(originals).map(book=>book[key]).find(Boolean);if(!text)throw Error('Missing text '+key);const words=text.split('\n').flatMap((line,i)=>line.split(/\s+/).filter(w=>matcher.normalize(w)).map(text=>({key:matcher.normalize(text),lineNumber:entry[7]?.[i]??i+1,text})));const notes=entry[4].map((n,i)=>({id:key+':'+i,line:n[0],commentHtml:n[2]}));for(const row of matcher.attach(notes,words,!!entry[7]).audit)rows.push({lesson:key,...row,attachedWords:row.indices.map(i=>words[i].text)});}
fs.writeFileSync(path.join(root,'commentary-audit.json'),JSON.stringify(rows,null,2)+'\n');console.log(rows.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}));console.log(rows.filter(r=>r.status!=='matched').slice(0,35).map(r=>({lesson:r.lesson,phrase:r.phrase,status:r.status})));console.log(rows.filter(r=>r.phrase.includes('cubant')));
