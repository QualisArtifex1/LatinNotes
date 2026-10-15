let exporting = false;

// Render outside the bounded application layout. Capture one page at a time so
// long readings never exceed browser canvas height/area limits.
export async function exportAnnotatedPdf({renderReading, translation, notes}) {
  if (exporting) return;
  exporting = true;
  let surface, unmount;
  const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Export PDF');
  if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
  try {
    if (!window.html2canvas || !window.jspdf) throw new Error('PDF libraries have not loaded. Check your connection and try again.');
    await document.fonts.ready;
    const editor = document.getElementById('editor-container');
    surface = document.createElement('div');
    surface.id = 'pdf-export-surface';
    surface.style.cssText = `position:absolute;left:0;top:0;width:${Math.max(800,editor.clientWidth)}px;background:white;color:#292524;z-index:-10000;pointer-events:none;overflow:visible;`;
    surface.setAttribute('aria-hidden', 'true');
    const style = document.createElement('style');
    style.textContent = '#pdf-export-surface *{animation:none!important;transition:none!important;opacity:1!important} #pdf-export-surface .pdf-text-section{padding:24px 64px;font:24px/1.5 "EB Garamond",serif;white-space:pre-wrap;overflow-wrap:anywhere} #pdf-export-surface h2{font:bold 28px/1.5 sans-serif;margin-bottom:16px}';
    surface.append(style);
    const reading = document.createElement('div');
    reading.style.padding = '96px 0 24px';
    surface.append(reading);
    document.body.append(surface);
    unmount = renderReading(reading);
    for (const [title, text] of [['Translation', translation], ['Scholarly Notes', notes]]) {
      if (!text.trim()) continue;
      const section = document.createElement('section');
      section.className = 'pdf-text-section';
      const heading = document.createElement('h2'); heading.textContent = title;
      const body = document.createElement('div'); body.textContent = text;
      section.append(heading, body); surface.append(section);
    }
    // Let React commit and its ResizeObserver settle connection geometry.
    await new Promise(resolve => setTimeout(resolve, 150));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const width = Math.ceil(surface.getBoundingClientRect().width), height = Math.ceil(surface.scrollHeight);
    const pdf = new window.jspdf.jsPDF({orientation:'p',unit:'pt',format:'a4'});
    const margin = 32, pageWidth = pdf.internal.pageSize.getWidth(), pageHeight = pdf.internal.pageSize.getHeight();
    const printWidth = pageWidth - 2 * margin, capacity = Math.floor((pageHeight - 2 * margin) * width / printWidth);
    const top = surface.getBoundingClientRect().top;
    const protectedRows = [...surface.querySelectorAll('[draggable]')].map(el => {
      const rects = [el, ...el.parentElement.querySelectorAll('.pdf-annotation,.pdf-marker')].map(node => node.getBoundingClientRect());
      return {top:Math.min(...rects.map(r=>r.top)),bottom:Math.max(...rects.map(r=>r.bottom))};
    });
    protectedRows.push(...[...surface.querySelectorAll('h2')].map(el=>el.getBoundingClientRect()));
    for (const el of surface.querySelectorAll('.pdf-text-section > div')) {
      const range = document.createRange(); range.selectNodeContents(el);
      protectedRows.push(...range.getClientRects());
    }
    let offset = 0, page = 0;
    while (offset < height) {
      let end = Math.min(height, offset + capacity);
      // Move the page break above any word/annotation/text line it intersects.
      for (let attempt = 0; attempt < 30; attempt++) {
        const crossing = protectedRows.filter(rect => rect.top - top < end && rect.bottom - top > end);
        if (!crossing.length) break;
        const candidate = Math.floor(Math.min(...crossing.map(rect => rect.top - top))) - 2;
        if (candidate <= offset + capacity / 2) break;
        end = candidate;
      }
      const tile = document.createElement('div');
      tile.style.cssText = `position:absolute;left:0;top:0;width:${width}px;height:${end-offset}px;overflow:hidden;background:white;z-index:-9999;pointer-events:none`;
      const copy = surface.cloneNode(true);
      copy.style.top = `${-offset}px`;
      copy.style.zIndex = 'auto';
      tile.append(copy); document.body.append(tile);
      let canvas;
      try {
        canvas = await window.html2canvas(tile, {
          foreignObjectRendering:true, scale:2, width, height:end-offset,
          useCORS:true, backgroundColor:'#ffffff', logging:false,
          onclone: doc => { doc.documentElement.classList.remove('dark'); doc.body.classList.remove('dark'); }
        });
      } finally { tile.remove(); }
      if (page++) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg',0.94),'JPEG',margin,margin,printWidth,(end-offset)*printWidth/width);
      canvas.width=canvas.height=0;
      offset=end;
    }
    pdf.save('latin-annotations.pdf');
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('Could not export PDF. ' + error.message);
  } finally {
    unmount?.(); surface?.remove(); exporting=false;
    if (button) { button.disabled=false; button.removeAttribute('aria-busy'); }
  }
}
