(function () {
  "use strict";

  const STATE = {
    active: false,
    currentKey: localStorage.getItem("qa-commentary-current-reading") || "",
    lastEditorKey: "",
  };

  let DATA = window.LATIN_COMMENTARY || {};
  const COMMON_SHORT_TERMS = new Set(["a", "ab", "ad", "at", "de", "e", "ex", "in", "is", "ne", "non", "si", "ut"]);

  function normalize(value) {
    return (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’']/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function normalizeWord(value) {
    return normalize(value.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿĀ-ſ]+|[^A-Za-zÀ-ÖØ-öø-ÿĀ-ſ]+$/g, ""));
  }

  function captureSelectedReading() {
    document.addEventListener(
      "change",
      (event) => {
        const select = event.target.closest("select");
        if (!select || !select.value.includes("||")) return;
        const readingKey = select.value.split("||")[1];
        STATE.currentKey = readingKey;
        localStorage.setItem("qa-commentary-current-reading", readingKey);
      },
      true
    );
    document.addEventListener(
      "submit",
      (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        const select = form.querySelector("select");
        if (select && !select.value) {
          STATE.currentKey = "";
          localStorage.removeItem("qa-commentary-current-reading");
        }
      },
      true
    );
  }

  function getEditor() {
    return document.getElementById("editor-container");
  }

  function getWordSpans() {
    const editor = getEditor();
    if (!editor) return [];
    return Array.from(editor.querySelectorAll("div[draggable='true'] > span")).filter((span) => normalizeWord(span.textContent));
  }

  function inferCurrentReading() {
    if (STATE.currentKey && DATA[STATE.currentKey]) return STATE.currentKey;
    const words = getWordSpans();
    if (!words.length) return "";
    const sample = normalize(words.slice(0, 40).map((span) => span.textContent).join(" "));
    for (const [key, entry] of Object.entries(DATA)) {
      if (entry.signature && sample && entry.signature.startsWith(sample.slice(0, 80))) {
        STATE.currentKey = key;
        localStorage.setItem("qa-commentary-current-reading", key);
        return key;
      }
    }
    return "";
  }

  function commentaryForCurrentReading() {
    const key = inferCurrentReading();
    return key ? DATA[key] : null;
  }

  function lessonLabel(entry) {
    const lessons = new Set();
    for (const section of entry?.sections || []) {
      for (const match of section.matchAll(/Lessons?\s+([0-9,\-\s]+)/g)) {
        for (const part of match[1].split(",")) {
          const trimmed = part.trim();
          if (!trimmed) continue;
          if (trimmed.includes("-")) {
            const [start, end] = trimmed.split("-").map((value) => Number(value.trim()));
            if (Number.isFinite(start) && Number.isFinite(end)) {
              for (let lesson = start; lesson <= end; lesson += 1) lessons.add(lesson);
            }
          } else {
            const lesson = Number(trimmed);
            if (Number.isFinite(lesson)) lessons.add(lesson);
          }
        }
      }
    }
    const ordered = Array.from(lessons).sort((a, b) => a - b);
    if (ordered.length === 0) return "";
    const ranges = [];
    let start = ordered[0];
    let previous = ordered[0];
    for (const lesson of ordered.slice(1)) {
      if (lesson === previous + 1) {
        previous = lesson;
        continue;
      }
      ranges.push(start === previous ? String(start) : `${start}-${previous}`);
      start = previous = lesson;
    }
    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
    return `${ordered.length === 1 ? "Lesson" : "Lessons"} ${ranges.join(", ")}`;
  }

  function updateDropdownLessonLabels() {
    for (const option of document.querySelectorAll("select option[value*='||']")) {
      const readingKey = option.value.split("||")[1];
      const entry = DATA[readingKey];
      if (!entry) continue;
      if (!option.dataset.commentaryBaseLabel) option.dataset.commentaryBaseLabel = option.textContent || "";
      const label = lessonLabel(entry);
      option.textContent = label ? `${option.dataset.commentaryBaseLabel} (${label})` : option.dataset.commentaryBaseLabel;
    }
  }

  function ensureButton() {
    const entry = commentaryForCurrentReading();
    const toolbar = Array.from(document.querySelectorAll("button"))
      .find((button) => button.textContent && button.textContent.trim() === "Export PDF")
      ?.parentElement;
    let button = document.getElementById("qa-commentary-toggle");

    if (!toolbar || !entry) {
      if (button) button.remove();
      return;
    }

    if (!button) {
      button = document.createElement("button");
      button.id = "qa-commentary-toggle";
      button.type = "button";
      button.className =
        "flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-700 text-white font-bold text-sm hover:bg-indigo-800 transition-all shadow-md";
      button.addEventListener("click", () => {
        STATE.active = !STATE.active;
        updateMode();
      });
      toolbar.insertBefore(button, toolbar.firstChild);
    }

    button.hidden = false;
    button.textContent = STATE.active ? "Commentary On" : "Commentary Mode";
    button.setAttribute("aria-pressed", String(STATE.active));
    button.title = `${entry.title || STATE.currentKey} commentary`;
  }

  function buildWordIndex(entry) {
    const index = new Map();
    for (const note of entry.notes || []) {
      for (const term of note.terms || []) {
        const normalized = normalizeWord(term);
        if (!normalized) continue;
        if (normalized.length < 3 && !COMMON_SHORT_TERMS.has(normalized)) continue;
        if (!index.has(normalized)) index.set(normalized, []);
        index.get(normalized).push(note);
      }
    }
    return index;
  }

  function clearHighlights() {
    document.querySelectorAll(".qa-commentary-word").forEach((span) => {
      span.classList.remove("qa-commentary-word");
      span.removeAttribute("data-commentary-notes");
    });
  }

  function applyHighlights() {
    clearHighlights();
    if (!STATE.active) return;
    const entry = commentaryForCurrentReading();
    if (!entry) return;
    const index = buildWordIndex(entry);
    for (const span of getWordSpans()) {
      const key = normalizeWord(span.textContent || "");
      const notes = index.get(key);
      if (!notes || !notes.length) continue;
      span.classList.add("qa-commentary-word");
      span.dataset.commentaryNotes = JSON.stringify(notes.map((note) => note.id));
    }
  }

  function updateMode() {
    document.body.classList.toggle("qa-commentary-active", STATE.active);
    ensureButton();
    applyHighlights();
    if (!STATE.active) closePopover();
  }

  function notesById(entry) {
    const map = new Map();
    for (const note of entry?.notes || []) map.set(note.id, note);
    return map;
  }

  function showPopover(target) {
    const entry = commentaryForCurrentReading();
    if (!entry) return;
    const noteIds = JSON.parse(target.dataset.commentaryNotes || "[]");
    const lookup = notesById(entry);
    const notes = noteIds.map((id) => lookup.get(id)).filter(Boolean).slice(0, 6);
    if (!notes.length) return;

    closePopover();
    const popover = document.createElement("aside");
    popover.id = "qa-commentary-popover";
    popover.innerHTML = `
      <div class="qa-commentary-popover-header">
        <div>
          <div class="qa-commentary-popover-kicker">Commentary</div>
          <h3>${escapeHtml(target.textContent || "Word")}</h3>
        </div>
        <button type="button" aria-label="Close commentary">×</button>
      </div>
      <div class="qa-commentary-popover-body">
        ${notes
          .map(
            (note) => `
              <article>
                <div class="qa-commentary-line">Line ${escapeHtml(note.line)} · ${escapeHtml(note.reading)}</div>
                <p>${note.commentHtml}</p>
              </article>`
          )
          .join("")}
      </div>
    `;
    document.body.appendChild(popover);
    popover.querySelector("button").addEventListener("click", closePopover);

    const rect = target.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const top = Math.min(window.innerHeight - popoverRect.height - 16, rect.bottom + 14);
    const left = Math.min(window.innerWidth - popoverRect.width - 16, Math.max(16, rect.left + rect.width / 2 - popoverRect.width / 2));
    popover.style.top = `${Math.max(16, top)}px`;
    popover.style.left = `${left}px`;
  }

  function closePopover() {
    document.getElementById("qa-commentary-popover")?.remove();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function installClickHandler() {
    document.addEventListener(
      "click",
      (event) => {
        if (!STATE.active) return;
        const target = event.target.closest(".qa-commentary-word");
        if (!target) {
          if (!event.target.closest("#qa-commentary-popover") && !event.target.closest("#qa-commentary-toggle")) closePopover();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        showPopover(target);
      },
      true
    );
  }

  function installStyles() {
    if (document.getElementById("qa-commentary-styles")) return;
    const style = document.createElement("style");
    style.id = "qa-commentary-styles";
    style.textContent = `
      .qa-commentary-word {
        color: rgb(67 56 202);
        text-shadow: 0 0 7px rgba(99, 102, 241, 0.5), 0 0 16px rgba(245, 158, 11, 0.28);
        border-radius: 0.2rem;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.12);
      }
      .dark .qa-commentary-word {
        color: rgb(199 210 254);
        text-shadow: 0 0 8px rgba(129, 140, 248, 0.75), 0 0 18px rgba(251, 191, 36, 0.35);
      }
      .qa-commentary-active .qa-commentary-word {
        cursor: help;
      }
      #qa-commentary-popover {
        position: fixed;
        z-index: 100000;
        width: min(520px, calc(100vw - 32px));
        max-height: min(70vh, 560px);
        overflow: hidden;
        border: 1px solid rgba(120, 113, 108, 0.25);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.98);
        color: rgb(41, 37, 36);
        box-shadow: 0 24px 70px rgba(28, 25, 23, 0.28);
        font-family: Inter, system-ui, sans-serif;
      }
      .dark #qa-commentary-popover {
        background: rgba(28, 25, 23, 0.98);
        color: rgb(245, 245, 244);
        border-color: rgba(214, 211, 209, 0.15);
      }
      .qa-commentary-popover-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.1rem;
        border-bottom: 1px solid rgba(120, 113, 108, 0.18);
        background: rgba(238, 242, 255, 0.9);
      }
      .dark .qa-commentary-popover-header {
        background: rgba(49, 46, 129, 0.35);
      }
      .qa-commentary-popover-kicker {
        font-size: 0.66rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-weight: 800;
        color: rgb(79, 70, 229);
      }
      .qa-commentary-popover-header h3 {
        margin: 0.15rem 0 0;
        font-family: "EB Garamond", serif;
        font-size: 1.6rem;
        line-height: 1;
        font-weight: 800;
      }
      .qa-commentary-popover-header button {
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 1.8rem;
        line-height: 1;
        cursor: pointer;
      }
      .qa-commentary-popover-body {
        max-height: calc(min(70vh, 560px) - 76px);
        overflow: auto;
        padding: 0.85rem 1.1rem 1rem;
      }
      .qa-commentary-popover-body article + article {
        margin-top: 0.85rem;
        padding-top: 0.85rem;
        border-top: 1px solid rgba(120, 113, 108, 0.18);
      }
      .qa-commentary-line {
        margin-bottom: 0.25rem;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 800;
        color: rgb(120, 113, 108);
      }
      .qa-commentary-popover-body p {
        margin: 0;
        font-family: "EB Garamond", serif;
        font-size: 1.18rem;
        line-height: 1.32;
      }
      .qa-commentary-popover-body strong {
        font-weight: 800;
      }
      .qa-commentary-popover-body em {
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
  }

  function watchApp() {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const key = inferCurrentReading();
        const editorSignature = `${key}:${getWordSpans().length}`;
        if (editorSignature !== STATE.lastEditorKey) {
          STATE.lastEditorKey = editorSignature;
          closePopover();
          applyHighlights();
        }
        ensureButton();
        updateDropdownLessonLabels();
      });
    };
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    schedule();
  }

  function init() {
    installStyles();
    captureSelectedReading();
    installClickHandler();
    watchApp();
    if (window.LATIN_COMMENTARY_PROMISE) {
      window.LATIN_COMMENTARY_PROMISE
        .then((data) => {
          DATA = data || {};
          updateMode();
          updateDropdownLessonLabels();
        })
        .catch((error) => {
          console.error("Unable to load commentary data.", error);
        });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
