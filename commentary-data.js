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
      const [title, sections, signature, readings, notes] = entry;
      data[key] = {
        title,
        sections,
        signature,
        notes: notes.map((note, index) => ({
          id: key + ":" + index,
          line: note[0],
          reading: readings[note[1]] || title,
          commentHtml: note[2],
          terms: termsFromHtml(note[2]),
        })),
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
