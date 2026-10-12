export const SNAPSHOT_APP_URL="https://qualisartifex1.github.io/LatinNotes/";
const LIMIT=2_000_000;
export function validateSnapshot(data) {
 if(data?.format!=='latin-notes-snapshot'||data.version!==1)throw Error('This is not a supported Latin Notes snapshot.');
 const s=data.session, ids=new Set();
 if(!s||!Array.isArray(s.words)||s.words.length>5000||!Array.isArray(s.lines)||s.lines.length>10000)throw Error('Invalid passage or connections.');
 let count=0;
 const words=s.words.map(row=>{if(!Array.isArray(row))throw Error('Invalid passage.');return row.map(w=>{
 if(++count>20000||typeof w.id!=='string'||ids.has(w.id)||typeof w.text!=='string')throw Error('Invalid word data.');ids.add(w.id);
 const clean={id:w.id,text:w.text};
 for(const key of ['highlight','marker','interlinearNote'])if(w[key]!==undefined){if(typeof w[key]!=='string')throw Error('Invalid annotation.');clean[key]=w[key];}
 if(clean.highlight&&!['red','green','blue','yellow','purple','orange'].includes(clean.highlight))throw Error('Invalid highlight.');
 for(const key of ['underline','annotationBracket'])if(w[key]!==undefined)clean[key]=!!w[key];return clean;
 });});
 const lineIds=new Set();const lines=s.lines.map(l=>{if(typeof l.id!=='string'||lineIds.has(l.id)||!ids.has(l.fromWordId)||!ids.has(l.toWordId))throw Error('Invalid connection.');lineIds.add(l.id);return {id:l.id,fromWordId:l.fromWordId,toWordId:l.toWordId};});
 if(typeof s.translation!=='string'||typeof s.notes!=='string'||!Number.isFinite(s.fontSize)||s.fontSize<12||s.fontSize>72||!Number.isFinite(s.lineSpacing)||s.lineSpacing<0||s.lineSpacing>300)throw Error('Invalid notes or display settings.');
 return {format:data.format,version:1,session:{words,lines,translation:s.translation,notes:s.notes,fontSize:s.fontSize,lineSpacing:s.lineSpacing}};
}
export async function encodeSnapshot(session) {
 const data=validateSnapshot({format:'latin-notes-snapshot',version:1,session});const json=JSON.stringify(data);
 if(new TextEncoder().encode(json).length>LIMIT)throw Error('This snapshot is too large. Try a shorter passage.');
 const zipped=new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 let binary='';for(const byte of zipped)binary+=String.fromCharCode(byte);
 return {data,code:btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')};
}
export async function decodeSnapshot(code) {
 if(!/^[A-Za-z0-9_-]+$/.test(code)||code.length>LIMIT)throw Error('The snapshot link is invalid or too large.');
 const bytes=Uint8Array.from(atob(code.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>LIMIT){await reader.cancel();throw Error('The snapshot is too large.');}chunks.push(value);}
 return validateSnapshot(JSON.parse(await new Blob(chunks).text()));
}
export function SnapshotPanel({React,session,onLoad}) {
 const [pasteMode,setPasteMode]=React.useState(false),[pasted,setPasted]=React.useState(''),[loading,setLoading]=React.useState(false);
 const h=React.createElement,[open,setOpen]=React.useState(false),[url,setUrl]=React.useState(''),[status,setStatus]=React.useState(''),[received,setReceived]=React.useState(false),[previous,setPrevious]=React.useState(null);
 const current=React.useRef({session,onLoad});current.current={session,onLoad};const dialog=React.useRef(null),file=React.useRef(null);
 const accept=data=>{const value=validateSnapshot(data);setPrevious(current.current.session.words.length?current.current.session:null);current.current.onLoad(value.session);setReceived(true);setStatus('Student snapshot loaded, including translation and notes.');};
 React.useEffect(()=>{let live=true;const read=async()=>{if(!location.hash.startsWith('#snapshot='))return;try{const value=await decodeSnapshot(location.hash.slice(10));if(live)accept(value);}catch(e){if(live){setStatus('Could not open snapshot: '+e.message);setOpen(true);}}};read();window.addEventListener('hashchange',read);return()=>{live=false;window.removeEventListener('hashchange',read)};},[]);
 React.useEffect(()=>{if(open&&!dialog.current.open)dialog.current.showModal();else if(!open&&dialog.current.open)dialog.current.close();},[open]);
 const share=async()=>{setPasteMode(false);setOpen(true);setStatus('Preparing snapshot…');setUrl('');try{const {code}=await encodeSnapshot(current.current.session);const link=new URL(SNAPSHOT_APP_URL);link.hash='snapshot='+code;setUrl(link.href);setStatus('Ready. This is a fixed copy of your work.');}catch(e){setStatus(e.message)}};
 const loadPasted=async()=>{setLoading(true);setStatus('Loading snapshot…');try{const text=pasted.trim();const hash=text.startsWith('#snapshot=')?text:new URL(text).hash;if(!hash.startsWith('#snapshot='))throw Error('Paste a complete snapshot link containing #snapshot=.');const data=await decodeSnapshot(hash.slice(10));accept(data);setOpen(false);setPasted('');}catch(e){setStatus('Could not load snapshot: '+e.message);}finally{setLoading(false)}};
 const download=async()=>{try{const {data}=await encodeSnapshot(current.current.session);const u=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='latin-notes-snapshot.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}catch(e){setStatus(e.message)}};
 return h(React.Fragment,null,
 h('div',{className:'snapshot-bar'},received&&h('span',null,'Student snapshot'),previous&&h('button',{onClick:()=>{current.current.onLoad(previous);setPrevious(null);setReceived(false);history.replaceState(null,'',location.pathname+location.search)}},'Return to previous work'),session.words.length>0&&h('button',{onClick:share},'Share snapshot'),h('button',{onClick:()=>{setPasteMode(true);setStatus('');setPasted('');setOpen(true)}},'Open snapshot link'),h('button',{onClick:()=>file.current.click()},'Import snapshot'),h('input',{ref:file,type:'file',accept:'.json,application/json',hidden:true,onChange:async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>LIMIT)throw Error('File is too large.');accept(JSON.parse(await f.text()));}catch(error){setStatus(error.message);setOpen(true);}e.target.value='';}})),
 h('dialog',{ref:dialog,className:'snapshot-dialog',onCancel:()=>setOpen(false),'aria-labelledby':'snapshot-title'},
 pasteMode?h(React.Fragment,null,h('h2',{id:'snapshot-title'},'Open snapshot link'),h('p',null,'Paste a student’s snapshot link to restore their passage, annotations, translation, and scholarly notes.'),h('label',{htmlFor:'paste-snapshot'},'Snapshot link'),h('textarea',{id:'paste-snapshot',value:pasted,onChange:e=>setPasted(e.target.value),placeholder:'Paste the complete link here…',autoFocus:true}),h('p',null,'Your current work will be available through Return to previous work. The link is read here; no other website is opened.'),h('p',{role:'status'},status),h('div',{className:'snapshot-actions'},h('button',{onClick:loadPasted,disabled:loading||!pasted.trim()},loading?'Loading…':'Load snapshot'),h('button',{onClick:()=>setOpen(false)},'Cancel'))):h(React.Fragment,null,h('h2',{id:'snapshot-title'},'Share a snapshot'),h('p',null,'Includes your passage, highlights, connections, markers, interlinear notes, translation, scholarly notes, and display settings.'),h('p',{role:'status'},status),
 url&&h(React.Fragment,null,h('label',{htmlFor:'snapshot-link'},'Snapshot link'),h('textarea',{id:'snapshot-link',readOnly:true,value:url,onFocus:e=>e.target.select()}),h('p',null,`${url.length.toLocaleString()} characters. ${url.length>8000?'This is a long link; downloading is the safer backup.':''}`),h('div',{className:'snapshot-actions'},h('button',{onClick:async()=>{try{await navigator.clipboard.writeText(url);setStatus('Link copied.');}catch{setStatus('Select and copy the link above.');}}},'Copy link'),h('a',{href:url,target:'_blank',rel:'noopener'},'Open snapshot in a new tab'))),
 h('p',null,'No account or upload. Anyone with the link can read the snapshot.'),h('div',{className:'snapshot-actions'},h('button',{onClick:download,disabled:!session.words.length},'Download snapshot'),h('button',{onClick:()=>setOpen(false)},'Close')))));
}
