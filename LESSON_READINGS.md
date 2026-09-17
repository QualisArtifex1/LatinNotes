# Preloaded Latin lessons

The Pliny and Vergil dropdowns use **one entry per Latin reading lesson** in Geoffrey
Steadman's *College Pliny and Vergil* (first edition, online revision 20 May 2025).
Lesson 33 is an English introduction, so it has no Latin reading entry.

Source: https://geoffreysteadman.com/wp-content/uploads/2025/05/plinyvergil.20may25.pdf
Required selections: https://apcentral.collegeboard.org/media/pdf/ap-latin-course-and-exam-description.pdf
(printed page 12 / PDF page 19).

`lesson-readings.js` contains the readable lesson data, PDF page numbers, the original
reading offsets or verse numbers, and references to the existing commentary notes.
It loads before the application bundle and replaces only the Pliny and Vergil
preloaded groups. Labels name the broader assigned passage, while each lesson's
text contains its own portion. Lessons 38, 41, 46, 57 and 66 combine portions from
separate ranges into one reading. The existing prose and verse text, spelling,
punctuation and macrons are preserved; only whitespace at selection boundaries
is trimmed. Verse 7.45 retains its original wrap across two physical lines.

Lesson 39 retains the existing required text, Aeneid 1.503–508. Steadman's printed
lesson continues through 1.512, but those four additional lines were not in the
preloaded reading and are not added here. Commentary for lines 509–512 is therefore
excluded from the new lesson entry. No texts or lesson numbers are invented.

`commentary-data.js` adds lesson-specific commentary after decoding the existing
data. Legacy passage entries remain available for saved annotations. The dropdown
label enhancer skips the already-complete lesson labels.

When changing these files, bump their script URL versions in `index.html` to avoid
serving cached text or picker behavior.

Validation: `node tests/lesson-readings.test.cjs`

The regression check verifies 69 ordered lesson entries, complete preservation of
the original Latin without duplicated segments, combined lessons, verse-note
boundaries, unchanged other-author groups, and the cache-versioned script loading.
