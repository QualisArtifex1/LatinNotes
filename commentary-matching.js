(function(root){
 'use strict';
 // Explicit source/reading variants verified during the audit; no general fuzzy matching.
 const variants={eis:'iis',curso:'cursu',illiteratus:'illitteratus',relliquias:'reliquias',teucorum:'teucrorum',tydide:'tydide',hostes:'hostis',ferentes:'ferentis',validis:'ualidis',alta:'alta',ardentes:'ardentis',vires:'viris',extremum:'extremam',luce:'luci',custos:'custos',moliris:'moliri',invitus:'inuitus',concussus:'percussus',ignes:'ignis',tingueret:'tingeret',leves:'levis',nymph:'nympha',submisso:'summisso',orbes:'orbis',eripiar:'eripiare'};
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/j/g,'i').replace(/[^a-z]/g,'');
 function phrases(html){return [...html.matchAll(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi)].map(m=>m[1].replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim()).filter(s=>/[A-Za-zÀ-ſ]/.test(s));}
 function tokens(phrase){return phrase.replace(/^Lāocoönta\) /,'').replace(/prīmus prīma/g,'prīmus').replace(/ lētī et$/,' lētī').replace(/\(est$/,'').replace(/-que(?=…|\.|\s|$)/g,' ').replace(/^que /,'').replace(/([A-Za-zÀ-ſ]+)\(runt\)/g,'$1re').replace(/([A-Za-zÀ-ſ]+r)\(unt(?:[^)]*)\)/g,'$1e').replace(/\([^)]*\)/g,'').replace(/([a-zāēīōūȳ])-([a-zāēīōūȳ])/gi,'$1$2').normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^A-Za-z]+/).map(normalize).filter(Boolean);}
 function matches(word,term){return word===term || word===variants[term] || ((term.length>=3||["se","me","te","id","ea","eo"].includes(term)) && ['que','ve','ne'].some(s=>word===term+s||word===variants[term]+s));}
 function range(line){const m=String(line).match(/(\d+)(?:\s*[-–—]\s*(\d+))?/);if(!m)return null;const a=+m[1];let b=m[2]?+m[2]:a;if(m[2]&&m[2].length<m[1].length){b=Math.floor(a/10**m[2].length)*10**m[2].length+b;if(b<a)b+=10**m[2].length;}return [a,b];}
 function attach(notes,words,reliable=false){
 const assignments=words.map(()=>new Set()),audit=[];
 for(const note of notes){const bounds=range(note.line);for(const phrase of phrases(note.commentHtml)){
 if(phrase==='-que…-que'){const rr=range(note.line);const seq=words.map((w,i)=>i).filter(i=>words[i].key.endsWith('que')&&(!rr||!reliable||(words[i].lineNumber>=rr[0]&&words[i].lineNumber<=rr[1])));seq.forEach(i=>assignments[i].add(note.id));audit.push({noteId:note.id,phrase,status:seq.length?'matched':'unmatched',indices:seq});continue;}
 const ts=tokens(phrase),ellipsis=/…|\.{2,}/.test(phrase);if(!ts.length || phrase==='eī)' || phrase.startsWith('Evidence of the Emperor')){audit.push({noteId:note.id,phrase,status:'supplied',indices:[]});continue;}
 const eligible=i=>!reliable||!bounds||(words[i].lineNumber>=bounds[0]&&words[i].lineNumber<=bounds[1]);
 let starts=words.map((w,i)=>i).filter(i=>eligible(i)&&matches(words[i].key,ts[0]));if(!starts.length && reliable){starts=words.map((w,i)=>i).filter(i=>matches(words[i].key,ts[0]));if(bounds&&starts.length){const distance=Math.min(...starts.map(i=>Math.abs(words[i].lineNumber-bounds[0])));starts=starts.filter(i=>Math.abs(words[i].lineNumber-bounds[0])===distance);}}let found=[];
 for(const start of starts){const seq=[start];let cursor=start+1;for(const term of ts.slice(1)){let next=-1;for(let i=cursor;i<Math.min(words.length,start+100);i++){if(matches(words[i].key,term)){next=i;break;}if(!ellipsis&&i>cursor+14)break;}if(next<0)break;seq.push(next);cursor=next+1;}if(seq.length===ts.length)found.push(seq);}
 // Exact contiguous matches take precedence over widely separated matches.
 const contiguous=found.filter(seq=>seq.every((v,i)=>!i||v===seq[i-1]+1));if(contiguous.length)found=contiguous;
 if(found.length>1&&ts.length>1){const width=Math.min(...found.map(seq=>seq.at(-1)-seq[0]));found=found.filter(seq=>seq.at(-1)-seq[0]===width);}
 let indices=[],status='unmatched';
 if(found.length===1){indices=ellipsis?Array.from({length:found[0].at(-1)-found[0][0]+1},(_,i)=>found[0][0]+i):found[0];status='matched';}
 else if(found.length>1){status='ambiguous';}
 else { // Keep individually identifiable bold words accessible, without inventing a phrase span.
 for(const term of ts){let candidates=words.map((w,i)=>i).filter(i=>eligible(i)&&matches(words[i].key,term));if(!candidates.length)candidates=words.map((w,i)=>i).filter(i=>matches(words[i].key,term));if(candidates.length>1&&indices.length){const best=Math.min(...candidates.map(i=>Math.min(...indices.map(j=>Math.abs(i-j)))));candidates=candidates.filter(i=>Math.min(...indices.map(j=>Math.abs(i-j)))===best);}if(candidates.length===1)indices.push(candidates[0]);}
 for(const term of ts){if(indices.some(i=>matches(words[i].key,term))||!indices.length)continue;let cs=words.map((w,i)=>i).filter(i=>matches(words[i].key,term));if(cs.length){const distance=Math.min(...cs.map(i=>Math.min(...indices.map(j=>Math.abs(i-j)))));cs=cs.filter(i=>Math.min(...indices.map(j=>Math.abs(i-j)))===distance);if(cs.length===1)indices.push(cs[0]);}}indices=[...new Set(indices)];if(indices.length)status=ts.every(t=>indices.some(i=>matches(words[i].key,t)))?'matched-reordered':'partial';
 }
 indices.forEach(i=>assignments[i].add(note.id));audit.push({noteId:note.id,phrase,status,indices,terms:ts,candidates:found});
 }}
 // Resolve repeated prose references only when nearby notes provide a unique contextual anchor.
 for(const row of audit.filter(r=>r.status==='ambiguous')){
 const ni=notes.findIndex(n=>n.id===row.noteId);
 let anchors=audit.filter(r=>r.noteId===row.noteId&&r.indices.length).flatMap(r=>r.indices);
 if(!anchors.length){for(let delta=1;delta<=2&&!anchors.length;delta++)anchors=audit.filter(r=>[notes[ni-delta]?.id,notes[ni+delta]?.id].includes(r.noteId)&&r.indices.length).flatMap(r=>r.indices);}
 if(!anchors.length)continue;
 const score=seq=>Math.min(...seq.flatMap(i=>anchors.map(a=>Math.abs(i-a))));const best=Math.min(...row.candidates.map(score));const choices=row.candidates.filter(c=>score(c)===best);
 if(choices.length>1&&row.phrase==='maximē'&&choices.every(c=>c.every(i=>anchors.includes(i)))){row.indices=[...new Set(choices.flat())];row.status='matched-context';row.indices.forEach(i=>assignments[i].add(row.noteId));}
 if(choices.length===1){const seq=choices[0];row.indices=/…|\.{2,}/.test(row.phrase)?Array.from({length:seq.at(-1)-seq[0]+1},(_,i)=>seq[0]+i):seq;row.status='matched-context';row.indices.forEach(i=>assignments[i].add(row.noteId));}
 }
 return {assignments,audit};
 }
 const api={normalize,phrases,tokens,matches,attach};root.LatinCommentaryMatching=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
