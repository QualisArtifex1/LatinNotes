import type { HighlightColor } from './constants';

export interface AnnotatedWord {
  id: string;
  text: string;
  highlight?: HighlightColor;
  underline?: boolean;
  interlinearNote?: string;
  marker?: string;
}

export interface ConnectionLine {
  id: string;
  fromWordId: string;
  toWordId: string;
}

export interface SavedSession {
  linesOfWords: AnnotatedWord[][];
  lines: ConnectionLine[];
  translation: string;
  notes: string;
  timestamp: number;
  fontSize?: number;
  lineSpacing?: number;
}

export type MorphValue = string | number | string[] | undefined;

export type MorphForm = Record<string, MorphValue>;

export interface Inflection {
  ending: string;
  pos: string;
  form: MorphForm;
}

export interface Definition {
  orth: string[];
  senses: string[];
  infls: Inflection[];
}

export interface TokenResult {
  word: string;
  defs: Definition[];
}

export interface ParseStats {
  tokens: number;
  matched: number;
  definitions: number;
  forms: number;
}

export interface ParseResponse {
  input: string;
  tokens: TokenResult[];
  stats: ParseStats;
  generated_at: string;
}
