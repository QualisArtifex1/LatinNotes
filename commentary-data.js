(function () {
  "use strict";

  function htmlText(value) {
    const element = document.createElement("span");
    element.innerHTML = value;
    return element.textContent || "";
  }

  function termsFromHtml(html) {
    const terms = [];
    const seen = new Set();
    const addTerm = (term) => {
      const cleaned = term.trim();
      if (!cleaned || seen.has(cleaned)) return;
      seen.add(cleaned);
      terms.push(cleaned);
    };
    for (const match of html.matchAll(/<strong>([\s\S]*?)<\/strong>/g)) {
      const term = htmlText(match[1].replace(/<[^>]*>/g, ""));
      addTerm(term);
      for (const part of term.split(/[\s\u2026.,;:()\/+=\[\]{}<>]+/)) addTerm(part);
    }
    return terms;
  }

  function unpack(compact) {
    const data = {};
    for (const [key, entry] of Object.entries(compact)) {
      const [title, sections, signature, readings, notes, credit, readingNotesHtml, lineNumbers] = entry;
      data[key] = {
        key,
        title,
        sections,
        signature,
        credit,
        readingNotesHtml,
        lineNumbers,
        notes: notes.map((note, index) => ({
          id: key + ":" + index,
          line: note[0],
          reading: readings[note[1]] || title,
          commentHtml: note[2],
          terms: termsFromHtml(note[2]),
        })),
      };
    }
    // Keep legacy entries for saved annotations, while giving each lesson only its own notes.
    for (const lesson of window.LATIN_LESSONS || []) {
      const notes = lesson.commentaryRefs.map(([key, index], position) => {
        const note = data[key]?.notes[index];
        if (!note) throw new Error(`Missing commentary for ${lesson.label}: ${key}:${index}`);
        return { ...note, id: `${lesson.label}:${position}`, reading: lesson.label };
      });
      data[lesson.label] = {
        key: lesson.label,
        title: lesson.label,
        sections: [lesson.label],
        lineNumbers: lesson.author === "Vergil"
          ? lesson.sources.flatMap(source => source.lines.flatMap(line =>
            lesson.number === 58 && line === 45 ? [45, 45] : [line]))
          : undefined,
        signature: lesson.text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[’']/g, "").toLowerCase().replace(/[^a-z0-9]+/g, ""),
        notes,
      };
    }
    return data;
  }

  async function inflateCommentaryData() {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser does not support DecompressionStream, which is needed for compressed commentary data.");
    }
    const encoded = (window.LATIN_COMMENTARY_CHUNKS || []).join("");
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    const compact = JSON.parse(await new Response(stream).text());
    const data = unpack(compact);
    window.LATIN_COMMENTARY = data;
    return data;
  }

  window.LATIN_COMMENTARY_PROMISE = inflateCommentaryData();
})();
