# Caesar commentary: Dickinson Notes, Gallic War 1.1–1.7

The app bundles all 108 paragraphs from the **Notes** fields of these seven
Dickinson College Commentaries pages, in source order, including the seven
chapter summaries. Vocabulary and media fields are excluded. Note wording,
translations, commentator names, and reference text are retained; hyperlinks
and website layout/scripts are removed. Existing preloaded Latin is unchanged.

| Chapter | Paragraphs | Source |
| --- | ---: | --- |
| 1.1 | 21 | https://dcc.dickinson.edu/caesar/book-1/chapter-1-1 |
| 1.2 | 13 | https://dcc.dickinson.edu/caesar/book-1/chapter-1-2 |
| 1.3 | 20 | https://dcc.dickinson.edu/caesar/book-1/chapter-1-3 |
| 1.4 | 11 | https://dcc.dickinson.edu/caesar/book-1/chapter-1-4 |
| 1.5 | 11 | https://dcc.dickinson.edu/caesar/book-1/chapter-1-5 |
| 1.6 | 17 | https://dcc.dickinson.edu/caesar/book-1/chapter-1-6 |
| 1.7 | 15 | https://dcc.dickinson.edu/caesar/book-1/chapter-1-7 |

Source: Christopher Francese, *Caesar: Selections from the Gallic War*.
Carlisle, Pennsylvania: Dickinson College Commentaries, 2011, revised and
enlarged 2018. Original commentators are credited in individual notes.

The imported content is redistributed under the same Creative Commons
Attribution-ShareAlike terms stated at https://dcc.dickinson.edu/terms-use.
The note data retains source and reuse information, also displayed as plain
text in the commentary panel. This licensing applies to the imported notes.

## Import and verification

`scripts/import-caesar-notes.py` requires Python, Beautiful Soup 4, and curl.
Run it to refresh `caesar-commentary.js` from the seven source pages, or pass
`--source-dir PATH` to read cached HTML named `1.html` through `7.html`.
Each chapter records a SHA-256 digest of the source paragraphs' text, with
whitespace collapsed. The browser test recomputes that digest from the shipped
HTML to check wording, punctuation, accents, order, and completeness.

The separate `anchorPhrases` metadata links each note to the app's Latin;
it never changes the displayed note. Overrides in the import script cover:

- Multiple tribal and river names in shared notes (1.1).
- Source headings `in septentriones…solem` and `spectat inter etc.` versus the
  app's precise inflected wording (1.1).
- The consuls' names and textual variants in the app's existing reading (1.2).
- `praeterquam quod` versus `praeter quod`, and `asciscunt` versus `adsciscunt`
  in the app's existing reading (1.5).
- Dictionary headwords Piso/Gabinius versus Pisone/Gabinio in the reading (1.6).

All 101 non-summary notes have matched anchors; several notes reference more
than one phrase. Summaries appear as Overview cards and have no word anchor.
Numbered cards use Chapter labels, avoiding invented prose line numbers.

Run `node tests/caesar-commentary.test.cjs` and, with Playwright and Chrome
available, `node scripts/test-caesar-commentary.cjs` against a local server.
