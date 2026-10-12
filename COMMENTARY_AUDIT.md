# Commentary matching and panel audit

Scope: every `<strong>` phrase in the bundled commentary for the 69 numbered
lessons and the four other readings with bundled commentary. This checks the
app's actual commentary HTML and Latin, not the original printed PDFs.

Run `node scripts/audit-commentary.cjs` to regenerate `commentary-audit.json`.
The report includes the source phrase, note identifier, matched word positions,
and the actual attached Latin. Context-resolved and reordered phrases are
identified separately from direct matches.

Current results: 1,837 references, including the supplementary Lesson 48 note:
- 1,794 matched phrases.
- 14 reordered phrases attached to their individual words.
- 24 repeated references resolved using surrounding commentary context.
- 3 nonliteral references: supplied `eī)` and `(mōvērunt)`, and an English heading.
- 2 references outside their assigned lesson: `lūce` and `custōs` in Lesson 47.
  Both words begin Lesson 48; the complete source note is additionally included
  there, where both now match. The original Lesson 47 note remains available and
  is labeled as outside the Latin shown.

Matching handles macrons (including y), j/i, attached -que/-ve/-ne, explicit
contracted perfect forms, supplied parenthetical words, phrase reordering,
and a small explicit table of verified differences between the stored Latin
and commentary (e.g. illiteratus/illitteratus, hostes/hostis, submisso/summisso).
The source wording and Latin are preserved. In Lesson 46, the grammatical
expansion `primus prima` is anchored through `primus`, not the unrelated `prima`
in a preceding sentence. Ellipsis spans include intervening words; reordered
phrases without ellipses attach only their named words.

Interface: source notes remain intact in a numbered, collapsible bottom panel.
Clicking a marked Latin word selects and scrolls to its note. Clicking a note's
number selects its linked words and scrolls the passage to them. The two regions
scroll independently. The Translation / Scholarly Notes drawer remains below.
Small numbers mark the final attached word of each source note; dotted
underlines show the other clickable words. Keyboard Enter/Space opens a note.

Verification includes cubantem -> cubantemque, multiple bold phrases per source
note, cross-verse ellipses, supplied words, variant spellings, invalid prefix
matches, and the Lesson 47/48 boundary. Browser checks cover panel selection,
independent scrolling, collapse/reopen, desktop/mobile bounds, and mode exit.
