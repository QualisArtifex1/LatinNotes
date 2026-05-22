import type { Definition, Inflection, MorphForm, ParseResponse, TokenResult } from "../types";

type NValue = string | number;

interface RawInflection {
  ending: string;
  pos: string;
  note?: string;
  n: NValue[];
  form: string;
}

interface RawStem {
  orth: string;
  pos: string;
  form: string;
  n: NValue[];
  wid: number;
}

interface RawWord {
  id?: number;
  orth: string;
  parts?: string[];
  pos: string;
  form?: string;
  n?: NValue[];
  senses: string[];
}

interface Addon {
  orth: string;
  pos: string;
  form?: string;
  senses: string[];
}

interface Addons {
  prefixes: Addon[];
  suffixes: Addon[];
  tackons: Addon[];
  packons: Addon[];
  not_packons: Addon[];
}

interface OpenWordsData {
  words: RawWord[];
  stems: RawStem[];
  inflects: RawInflection[];
  uniques: RawWord[];
  addons: Addons;
}

interface MatchStem {
  st: RawStem;
  infls: RawInflection[];
}

interface LookupResult {
  w: RawWord | Addon;
  stems?: MatchStem[];
}

const PUNCTUATION_PATTERN = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g;
let parserPromise: Promise<OpenWordsParser> | null = null;

function dataUrl(fileName: string) {
  return `${import.meta.env.BASE_URL}open-words/${fileName}`;
}

async function fetchJson<T>(fileName: string): Promise<T> {
  const response = await fetch(dataUrl(fileName));
  if (!response.ok) {
    throw new Error(`Could not load ${fileName}`);
  }
  return (await response.json()) as T;
}

function summarize(tokens: TokenResult[]) {
  const definitions = tokens.reduce((count, token) => count + token.defs.length, 0);
  const forms = tokens.reduce(
    (count, token) =>
      count + token.defs.reduce((definitionCount, definition) => definitionCount + definition.infls.length, 0),
    0
  );

  return {
    tokens: tokens.length,
    matched: tokens.filter((token) => token.defs.length > 0).length,
    definitions,
    forms
  };
}

function cloneWord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sameArray(left?: NValue[], right?: NValue[]) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return left.every((item, index) => item === right[index]);
}

function stripEnding(word: string, ending: string) {
  return ending ? word.slice(0, -ending.length) : word;
}

function formKey(infl: RawInflection) {
  return infl.form;
}

function formattedInflKey(infl: Inflection) {
  return `${infl.pos}|${infl.ending}|${JSON.stringify(infl.form)}`;
}

function translate(value: string, dictionary: Record<string, string>) {
  return dictionary[value] ?? value;
}

function isRawWord(value: RawWord | Addon): value is RawWord {
  return "parts" in value || "id" in value || "n" in value;
}

class OpenWordsParser {
  private wordsById = new Map<number, RawWord>();
  private stemsByOrth = new Map<string, RawStem[]>();
  private uniquesByOrth = new Map<string, RawWord>();
  private inflects: RawInflection[];

  constructor(private data: OpenWordsData) {
    this.inflects = [...data.inflects].sort((left, right) => left.ending.length - right.ending.length);

    for (const word of data.words) {
      if (typeof word.id === "number") {
        this.wordsById.set(word.id, word);
      }
    }

    for (const stem of data.stems) {
      const stems = this.stemsByOrth.get(stem.orth);
      if (stems) {
        stems.push(stem);
      } else {
        this.stemsByOrth.set(stem.orth, [stem]);
      }
    }

    for (const unique of data.uniques) {
      this.uniquesByOrth.set(unique.orth, unique);
    }
  }

  parseLine(line: string): TokenResult[] {
    return this.sanitize(line)
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => this.parse(word));
  }

  private parse(input: string): TokenResult {
    return {
      word: input,
      defs: this.formatOutput(this.latinToEnglish(input))
    };
  }

  private latinToEnglish(input: string): LookupResult[] {
    const [word] = this.splitEnclitic(input);
    const unique = this.uniquesByOrth.get(word);

    if (unique) {
      return [{ w: unique, stems: [] }];
    }

    return this.findForms(word);
  }

  private findForms(word: string, reduced = false): LookupResult[] {
    const inflections = this.inflects.filter((infl) => word.endsWith(infl.ending));
    const stems = this.checkStems(word, inflections);
    const out = this.lookupStems(stems, [], !reduced);

    if (out.length === 0 && !reduced) {
      const reducedOut = this.reduce(word);
      if (reducedOut) {
        out.push(...reducedOut);
      }
    }

    return out;
  }

  private checkStems(word: string, inflections: RawInflection[]) {
    const matchStems: MatchStem[] = [];

    for (const infl of inflections) {
      const stemOrth = stripEnding(word, infl.ending);
      const stems = this.stemsByOrth.get(stemOrth) ?? [];

      for (const stem of stems) {
        const isPosMatch = infl.pos === stem.pos || (infl.pos === "VPAR" && stem.pos === "V");
        const isParadigmMatch = infl.n[0] === stem.n[0];

        if (!isPosMatch || !isParadigmMatch) {
          continue;
        }

        const existing = matchStems.find((candidate) => candidate.st === stem);
        if (existing) {
          if (!existing.infls.some((stemInfl) => formKey(stemInfl) === formKey(infl))) {
            existing.infls.push(infl);
          }
        } else {
          matchStems.push({ st: stem, infls: [infl] });
        }
      }
    }

    return matchStems;
  }

  private lookupStems(matchStems: MatchStem[], out: LookupResult[], getWordEnds = true) {
    for (const matchStem of matchStems) {
      const word = this.wordsById.get(matchStem.st.wid);
      if (!word) {
        continue;
      }

      const existing = out.find((candidate) => {
        const existingWord = candidate.w;
        return (isRawWord(existingWord) && existingWord.id === word.id) || existingWord.orth === word.orth;
      });

      if (existing?.stems) {
        if (!existing.stems.some((stem) => stem.st === matchStem.st)) {
          existing.stems.push(matchStem);
        }
        continue;
      }

      let stemForWord: MatchStem = { st: matchStem.st, infls: [...matchStem.infls] };
      if (word.pos === "V") {
        const principlePartIndex = word.parts?.indexOf(stemForWord.st.orth) ?? -1;
        stemForWord = this.removeExtraInfls(stemForWord, principlePartIndex === 3 ? "V" : "VPAR");
      }

      let wordClone = cloneWord(word);
      if (getWordEnds) {
        wordClone = this.getWordEndings(wordClone);
      }

      out.push({ w: wordClone, stems: [stemForWord] });
    }

    return out;
  }

  private splitEnclitic(input: string): [string, LookupResult[]] {
    let word = input;
    const out: LookupResult[] = [];

    for (const tackon of this.data.addons.tackons) {
      if (word.endsWith(tackon.orth)) {
        if (word !== "est") {
          out.push({ w: { ...tackon, form: tackon.orth }, stems: [] });
          word = stripEnding(word, tackon.orth);
        }
        break;
      }
    }

    const packons = word.startsWith("qu") ? this.data.addons.packons : this.data.addons.not_packons;
    for (const packon of packons) {
      if (word.endsWith(packon.orth)) {
        out.push({ w: packon });
        word = stripEnding(word, packon.orth);
        break;
      }
    }

    return [word, out];
  }

  private getWordEndings(word: RawWord): RawWord {
    let endOne = false;
    let endTwo = false;
    let endThree = false;
    let endFour = false;
    const lenParts = word.parts?.length ?? 0;

    for (const infl of this.inflects) {
      const isSameParadigm = sameArray(infl.n, word.n);
      const isSamePos = infl.pos === word.pos || (["V", "VPAR"].includes(infl.pos) && ["V", "VPAR"].includes(word.pos));

      if (!isSameParadigm || !isSamePos || !word.parts) {
        continue;
      }

      if (word.pos === "V" || word.pos === "VPAR") {
        if (lenParts > 0 && !endOne && word.parts[0] && word.parts[0] !== "-" && infl.form === "PRES  ACTIVE  IND  1 S") {
          word.parts[0] += infl.ending;
          endOne = true;
        }
        if (lenParts > 1 && !endTwo && word.parts[1] && word.parts[1] !== "-" && infl.form === "PRES  ACTIVE  INF  0 X") {
          word.parts[1] += infl.ending;
          endTwo = true;
        }
        if (lenParts > 2 && !endThree && word.parts[2] && word.parts[2] !== "-" && infl.form === "PERF  ACTIVE  IND  1 S") {
          word.parts[2] += infl.ending;
          endThree = true;
        }
        if (lenParts > 3 && !endFour && word.parts[3] && word.parts[3] !== "-" && infl.form === "NOM S M PRES PASSIVE PPL") {
          word.parts[3] += infl.ending;
          endFour = true;
        }
      } else if (["N", "ADJ", "PRON"].includes(word.pos)) {
        if (lenParts > 0 && !endOne && word.parts[0] && word.parts[0] !== "-" && infl.form.startsWith("NOM S")) {
          word.parts[0] += infl.ending;
          endOne = true;
        }
        if (lenParts > 1 && !endTwo && word.parts[1] && word.parts[1] !== "-" && infl.form.startsWith("GEN S")) {
          word.parts[1] += infl.ending;
          endTwo = true;
        }
      }
    }

    if ((word.pos === "V" || word.pos === "VPAR") && word.parts) {
      if (lenParts > 0 && !endOne && word.parts[0] && word.parts[0] !== "-") {
        word.parts[0] += "o";
      }
      if (lenParts > 1 && !endTwo && word.parts[1] && word.parts[1] !== "-") {
        word.parts[1] += "?re";
      }
      if (lenParts > 2 && !endThree && word.parts[2] && word.parts[2] !== "-") {
        word.parts[2] += "i";
      }
      if (lenParts > 3 && !endFour && word.parts[3] && word.parts[3] !== "-") {
        word.parts[3] += "us";
      }
    }

    return word;
  }

  private sanitize(input: string) {
    return input.toLowerCase().replace(PUNCTUATION_PATTERN, " ").replace(/—/g, " ").replace(/\d/g, " ");
  }

  private reduce(word: string): LookupResult[] | false {
    let reduced = word;

    for (const prefix of this.data.addons.prefixes) {
      if (reduced.startsWith(prefix.orth)) {
        reduced = reduced.slice(prefix.orth.length);
        break;
      }
    }

    for (const suffix of this.data.addons.suffixes) {
      if (reduced.endsWith(suffix.orth)) {
        reduced = stripEnding(reduced, suffix.orth);
        break;
      }
    }

    const out = this.findForms(reduced, true);
    return out.some((lookup) => lookup.stems && lookup.stems.length > 0) ? out : false;
  }

  private removeExtraInfls(stem: MatchStem, removeType = "VPAR"): MatchStem {
    return {
      ...stem,
      infls: stem.infls.filter((infl) => infl.pos !== removeType)
    };
  }

  private formatOutput(out: LookupResult[]): Definition[] {
    return out.map((word) => {
      const rawWord = word.w;
      const obj: Definition = {
        orth: isRawWord(rawWord) && rawWord.parts ? rawWord.parts : [rawWord.orth],
        senses: rawWord.senses,
        infls: []
      };

      if (word.stems) {
        for (const stem of word.stems) {
          const seenRawForms = new Set<string>();
          const inflsToAdd: Inflection[] = [];

          for (const infl of stem.infls) {
            if (!seenRawForms.has(infl.form)) {
              seenRawForms.add(infl.form);
              inflsToAdd.push({
                ending: infl.ending,
                pos: infl.pos,
                form: this.formatForm(infl.form, infl.pos)
              });
            }
          }

          const seenFormatted = new Set(obj.infls.map(formattedInflKey));
          for (const infl of inflsToAdd) {
            const key = formattedInflKey(infl);
            if (!seenFormatted.has(key)) {
              seenFormatted.add(key);
              obj.infls.push(infl);
            }
          }
        }
      }

      if (obj.infls.length === 0) {
        obj.infls = [
          {
            form: this.formatForm(rawWord.form ?? rawWord.pos, rawWord.pos),
            ending: "",
            pos: rawWord.pos
          }
        ];
      }

      return this.formatMorph(obj);
    });
  }

  private formatMorph(word: Definition): Definition {
    return {
      ...word,
      infls: word.infls.map((infl) => ({
        ...infl,
        pos: this.formatPartOfSpeech(infl.pos)
      }))
    };
  }

  private formatPartOfSpeech(pos: string) {
    const partsOfSpeech: Record<string, string> = {
      N: "noun",
      V: "verb",
      VPAR: "participle",
      ADJ: "adjective",
      ADV: "adverb",
      PREP: "preposition",
      PRON: "pronoun",
      INTERJ: "interjection",
      NUM: "number",
      CONJ: "conjunction"
    };

    return partsOfSpeech[pos] ?? pos;
  }

  private formatForm(form: string, pos: string): MorphForm {
    if (["N", "PRON", "ADJ", "NUM"].includes(pos)) {
      const parts = form.split(" ");
      if (parts.length === 3) {
        return {
          declension: translate(parts[0], {
            NOM: "nominative",
            VOC: "vocative",
            GEN: "genitive",
            DAT: "dative",
            ACC: "accusative",
            LOC: "locative",
            ABL: "ablative",
            X: ""
          }),
          number: translate(parts[1], { S: "singular", P: "plural", X: "" }),
          gender: translate(parts[2], { M: "masculine", F: "feminine", N: "neuter", C: "C", X: "" })
        };
      }
      return { form: parts };
    }

    if (pos === "V" && form.length === 22) {
      return {
        tense: translate(form.slice(0, 6).trim(), {
          PRES: "present",
          IMPF: "imperfect",
          PERF: "perfect",
          FUT: "future",
          FUTP: "future perfect",
          PLUP: "pluperfect",
          INF: "infinitive",
          X: ""
        }),
        voice: translate(form.slice(6, 14).trim(), { ACTIVE: "active", PASSIVE: "passive", X: "" }),
        mood: translate(form.slice(14, 19).trim(), { IND: "indicative", SUB: "subjunctive", IMP: "imperative", INF: "infinitive", X: "" }),
        person: Number.parseInt(form.slice(19, 21).trim(), 10),
        number: translate(form.slice(21).trim(), { S: "singular", P: "plural", X: "" })
      };
    }

    if (pos === "VPAR" && form.length === 24) {
      return {
        declension: translate(form.slice(0, 4).trim(), {
          NOM: "nominative",
          VOC: "vocative",
          GEN: "genitive",
          DAT: "dative",
          ACC: "accusative",
          LOC: "locative",
          ABL: "ablative",
          X: ""
        }),
        number: translate(form.slice(4, 6).trim(), { S: "singular", P: "plural", X: "" }),
        gender: translate(form.slice(6, 8).trim(), { M: "masculine", F: "feminine", N: "neuter", C: "C", X: "" }),
        tense: translate(form.slice(8, 13).trim(), {
          PRES: "present",
          IMPF: "imperfect",
          PERF: "perfect",
          FUT: "future",
          FUTP: "future perfect",
          PLUP: "pluperfect",
          INF: "infinitive",
          X: ""
        }),
        voice: translate(form.slice(13, 21).trim(), { ACTIVE: "active", PASSIVE: "passive", X: "" })
      };
    }

    return { form };
  }
}

async function loadOpenWordsParser() {
  const [words, stems, inflects, uniques, addons] = await Promise.all([
    fetchJson<RawWord[]>("words.json"),
    fetchJson<RawStem[]>("stems.json"),
    fetchJson<RawInflection[]>("inflects.json"),
    fetchJson<RawWord[]>("uniques.json"),
    fetchJson<Addons>("addons.json")
  ]);

  return new OpenWordsParser({ words, stems, inflects, uniques, addons });
}

export function getOpenWordsParser() {
  parserPromise ??= loadOpenWordsParser();
  return parserPromise;
}

export async function parseLatinText(input: string): Promise<ParseResponse> {
  const text = input.trim();
  const tokens = text ? (await getOpenWordsParser()).parseLine(text) : [];

  return {
    input,
    tokens,
    stats: summarize(tokens),
    generated_at: new Date().toISOString()
  };
}
