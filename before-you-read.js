const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character]));

function richText(value = "") {
  return escapeHtml(value).replace(/(\d+)(st|nd|rd|th)\b/gi, '$1<sup class="ordinal-suffix">$2</sup>');
}

function cleanSubtitle(value = "") {
  return value.replace(/\s+\d+$/, "");
}

function isInlineHeading(text) {
  return text.length < 115 && /^[A-Z]/.test(text) && !/^\d+[.)]/.test(text) && (!/[.!:]$/.test(text) || /\?$/.test(text));
}

function renderTimeline(timeline) {
  if (!timeline) return "";
  return `<ol class="timeline">${timeline.map((item) => `<li><time>${richText(item.date)}</time><span>${richText(item.event)}</span></li>`).join("")}</ol>`;
}

function renderTable(table) {
  if (!table) return "";
  const headers = table.headers.map((header) => `<th>${richText(header)}</th>`).join("");
  const rows = table.rows.map((row, index) => `<tr class="${table.highlightRows?.includes(index) ? "highlight-row" : ""}">${row.map((cell) => `<td>${richText(cell)}</td>`).join("")}</tr>`).join("");
  return `<div class="note-table-wrap"><table class="note-table"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderContent(content = []) {
  return content.map((item) => {
    if (item.type === "paragraph") return `<p class="${item.numbered ? "numbered" : ""}">${richText(item.text)}</p>`;
    const lines = item.lines.map((line) => `<div class="verse-line"><span>${line.segments.map((segment) => segment.emphasis ? `<strong class="source-emphasis">${escapeHtml(segment.text)}</strong>` : `<span>${escapeHtml(segment.text)}</span>`).join("")}</span>${line.line ? `<small>${escapeHtml(line.line)}</small>` : ""}</div>`).join("");
    return `<figure class="verse-quotation"><div class="verse-lines">${lines}</div>${item.citation ? `<figcaption>${richText(item.citation)}</figcaption>` : ""}</figure>`;
  }).join("");
}

function renderBlock(block) {
  const heading = block.heading !== "Context & analysis" ? `<h3>${richText(block.heading)}</h3>` : "";
  const paragraphs = block.paragraphs.map((paragraph) => isInlineHeading(paragraph)
    ? `<h4>${richText(paragraph)}</h4>`
    : `<p class="${/^\d+[.)]/.test(paragraph) ? "numbered" : ""}">${richText(paragraph)}</p>`).join("");
  return `<section class="note-block ${block.variant === "boxed" ? "boxed-note" : ""}">${heading}${renderTimeline(block.timeline)}${renderTable(block.table)}${paragraphs}${renderContent(block.content)}</section>`;
}

function renderFigures(figures = []) {
  if (!figures.length) return "";
  return `<section class="lesson-figures" aria-label="Figures from the commentary"><p class="figure-kicker">From the commentary</p>${figures.map((figure) => {
    const src = figure.src.replace(/^\/figures\//, "./cultural-notes/images/figures/");
    return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(figure.alt)}" /><figcaption><span>${richText(figure.caption)}</span><small>${richText(figure.credit)}</small></figcaption></figure>`;
  }).join("")}</section>`;
}

export function findCulturalLesson(words, lessons) {
 const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
 const passage = normalize(words.flat().map(word => word.text).join(' '));
 return passage ? lessons.find(lesson => normalize(lesson.text) === passage)?.number : undefined;
}
export function renderCulturalEntry(entry) {
 return `<header><p>${escapeHtml(entry.label)} · ${escapeHtml(entry.source)}</p><h2>${escapeHtml(entry.passage)}</h2><p>${escapeHtml(cleanSubtitle(entry.subtitle))}</p></header>${entry.blocks.length ? entry.blocks.map(renderBlock).join('') : '<p>No cultural or literary notes are listed for this lesson.</p>'}${renderFigures(entry.figures)}<footer>Commentary adapted from Geoffrey Steadman, <em>College Pliny and Vergil</em> (2023), used under CC BY-NC-SA 3.0. Vocabulary and grammar notes omitted.</footer>`;
}
export function BeforeYouRead({React, words}) {
 const h=React.createElement, [notes,setNotes]=React.useState(null), [error,setError]=React.useState(false), [retry,setRetry]=React.useState(0), ref=React.useRef(null);
 const lesson=findCulturalLesson(words,window.LATIN_LESSONS||[]);
 React.useEffect(()=>{let live=true;setError(false);fetch(new URL('./cultural-notes/notes.json',import.meta.url)).then(r=>{if(!r.ok)throw Error();return r.json()}).then(data=>{if(live)setNotes(data)}).catch(()=>{if(live)setError(true)});return()=>{live=false}},[retry]);
 React.useEffect(()=>{if(ref.current)ref.current.open=false},[lesson]);
 React.useEffect(()=>{const dismiss=e=>{if(ref.current&&!ref.current.contains(e.target))ref.current.open=false};const escape=e=>{if(e.key==='Escape'&&!e.target.closest('dialog')&&ref.current?.open){ref.current.open=false;ref.current.querySelector('summary').focus()}};document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape)}},[]);
 const entry=notes?.find(note=>note.lesson===lesson);
 return h('details',{className:'before-you-read',ref},h('summary',null,'Before you read'),h('section',{className:'before-you-read-panel','aria-label':'Cultural and literary notes',tabIndex:0},h('button',{className:'before-you-read-close',onClick:()=>{ref.current.open=false;ref.current.querySelector('summary').focus()},'aria-label':'Close cultural notes'},'×'),!lesson?h('p',null,'Choose a numbered lesson to see its cultural and literary notes. These notes are not available for custom passages.'):error?h('p',null,'The notes could not be loaded. ',h('button',{onClick:()=>setRetry(retry+1)},'Try again')):!notes?h('p',{role:'status'},'Loading cultural notes…'):entry?h(React.Fragment,null,h(AuthorIntroduction,{React,author:entry.author}),h('article',{key:lesson,dangerouslySetInnerHTML:{__html:renderCulturalEntry(entry)}})):h('p',null,'No cultural notes are available for this lesson.')));
}

export function AuthorIntroduction({React,author}) {
 const h=React.createElement, dialog=React.useRef(null), [selected,setSelected]=React.useState(null), [entry,setEntry]=React.useState(null), [error,setError]=React.useState(false);
 React.useEffect(()=>{if(!selected)return;let live=true;setEntry(null);setError(false);dialog.current.showModal();fetch(new URL('./cultural-notes/notes.json',import.meta.url)).then(r=>{if(!r.ok)throw Error();return r.json()}).then(notes=>{if(live)setEntry(notes.find(n=>selected==='pliny'?n.id==='pliny-introduction':n.lesson===33))}).catch(()=>{if(live)setError(true)});return()=>{live=false}},[selected]);
 const close=()=>{dialog.current.close();setSelected(null)};
 return h('div',{className:author?'author-intro-link':'meet-authors'},!author&&h('span',null,'Meet the authors'),...(author?[author]:['pliny','vergil']).map(name=>h('button',{key:name,type:'button',onClick:()=>setSelected(name)},author?'Author introduction: '+(name==='pliny'?'Pliny':'Vergil'):'About '+(name==='pliny'?'Pliny':'Vergil'))),h('dialog',{ref:dialog,className:'author-intro-dialog before-you-read-panel','aria-label':'Author introduction',onCancel:close},h('button',{type:'button',className:'before-you-read-close',onClick:close,'aria-label':'Close author introduction'},'×'),entry?h(React.Fragment,null,h('figure',{className:'author-portrait'},h('img',{src:`./cultural-notes/images/${selected}.jpg`,alt:selected==='pliny'?'Sculpture of Pliny the Younger':'Portrait traditionally identified as Vergil'}),h('figcaption',null,selected==='pliny'?'Riccardo Ortelli / Wikimedia Commons, CC BY-SA 4.0':'Roman sculptor, public domain / Wikimedia Commons')),h('article',{dangerouslySetInnerHTML:{__html:renderCulturalEntry(entry)}})):h('p',{role:'status'},error?'Could not load the introduction. Close and try again.':'Loading introduction…')));
}
