
// These will be available globally from the CDN scripts in index.html
declare const jspdf: any;
declare const html2canvas: any;

export const exportToPdf = async (
  editorElementId: string,
  translation: string,
  notes: string,
) => {
  const editorElement = document.getElementById(editorElementId);
  if (!editorElement) {
    console.error('Editor element not found for PDF export.');
    return;
  }

  const parentWrapper = editorElement.parentElement as HTMLElement;
  if (!parentWrapper) {
      console.error('Editor parent wrapper not found.');
      return;
  }

  const originalEditorStyle = {
    height: editorElement.style.height,
    overflow: editorElement.style.overflow,
  };
  const originalParentStyle = {
    height: parentWrapper.style.height,
    overflow: parentWrapper.style.overflow,
  };

  try {
    const scrollHeight = editorElement.scrollHeight;
    parentWrapper.style.height = 'auto';
    parentWrapper.style.overflow = 'visible';
    editorElement.style.height = `${scrollHeight}px`;
    editorElement.style.overflow = 'visible';

    const { jsPDF } = jspdf;
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: 'a4',
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pdfWidth - margin * 2;
    let y = margin;

    const checkAndAddPage = (neededHeight: number) => {
      if (y + neededHeight > pdfHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    // 1. Process Editor Content
    const editorCanvas = await html2canvas(editorElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff', // Force white background for PDF
      onclone: (clonedDoc) => {
        // Ensure no dark mode or styling interferences
        clonedDoc.documentElement.classList.remove('dark');
        clonedDoc.body.classList.remove('dark');
        
        const editor = clonedDoc.getElementById(editorElementId);
        if (editor) {
          // Adjust styles for better PDF visibility
          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { transition: none !important; animation: none !important; opacity: 1 !important; visibility: visible !important; }
            .pdf-annotation { 
              color: #000000 !important; 
              background-color: #fffbeb !important; 
              border: 1px solid #78350f !important;
              font-weight: bold !important;
              padding: 2px 6px !important;
              display: inline-block !important;
              font-family: sans-serif !important;
              font-size: 11px !important;
              line-height: 1 !important;
              border-radius: 4px !important;
            }
            .pdf-marker { 
              color: #000000 !important; 
              font-weight: 900 !important;
              font-size: 18px !important;
              display: inline-block !important;
              margin-bottom: 2px !important;
              line-height: 1 !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          // Force colors on specific elements to be extra sure
          clonedDoc.querySelectorAll('.pdf-annotation').forEach((el: any) => {
            el.style.setProperty('color', '#000000', 'important');
            el.style.setProperty('opacity', '1', 'important');
          });
          clonedDoc.querySelectorAll('.pdf-marker').forEach((el: any) => {
            el.style.setProperty('color', '#000000', 'important');
            el.style.setProperty('opacity', '1', 'important');
          });
        }
      }
    });
    
    const canvasWidth = editorCanvas.width;
    const canvasHeight = editorCanvas.height;

    let canvasPosition = 0;
    while (canvasPosition < canvasHeight) {
      const remainingCanvasHeight = canvasHeight - canvasPosition;
      const spaceOnPage = pdfHeight - y;
      const canvasHeightOnPage = ((spaceOnPage - margin) * canvasWidth) / contentWidth;
      const heightToDraw = Math.min(remainingCanvasHeight, canvasHeightOnPage);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth;
      tempCanvas.height = heightToDraw;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(
          editorCanvas,
          0, canvasPosition,
          canvasWidth, heightToDraw,
          0, 0,
          canvasWidth, heightToDraw
        );

        const imageData = tempCanvas.toDataURL('image/png');
        const imagePdfHeight = (heightToDraw * contentWidth) / canvasWidth;
        
        checkAndAddPage(imagePdfHeight);
        pdf.addImage(imageData, 'PNG', margin, y, contentWidth, imagePdfHeight);
        y += imagePdfHeight;
      }
      
      canvasPosition += heightToDraw;

      if (canvasPosition < canvasHeight) {
        pdf.addPage();
        y = margin;
      }
    }
    y += 20;

    // 2. Process Translation
    if (translation.trim()) {
      checkAndAddPage(40);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Translation', margin, y);
      y += 20;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const translationLines = pdf.splitTextToSize(translation, contentWidth);
      const textHeight = translationLines.length * 10 * 1.15;
      checkAndAddPage(textHeight);
      pdf.text(translationLines, margin, y);
      y += textHeight + 20;
    }

    // 3. Process Notes
    if (notes.trim()) {
      checkAndAddPage(40);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text('Notes', margin, y);
      y += 20;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      const notesLines = pdf.splitTextToSize(notes, contentWidth);
      const textHeight = notesLines.length * 10 * 1.15;
      checkAndAddPage(textHeight);
      pdf.text(notesLines, margin, y);
      y += textHeight + 20;
    }

    pdf.save('latin-annotations.pdf');

  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('An error occurred while exporting to PDF. See the console for details.');
  } finally {
    // CRITICAL: Restore original styles to not break the UI
    editorElement.style.height = originalEditorStyle.height;
    editorElement.style.overflow = originalEditorStyle.overflow;
    parentWrapper.style.height = originalParentStyle.height;
    parentWrapper.style.overflow = originalParentStyle.overflow;
  }
};
