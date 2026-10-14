/**
 * Minimal Gherkin parser matching bdd_widget_test's needs: finds every step
 * line (Given/When/Then/And/But, any dialect) with its position, tracks the
 * effective keyword for And/But inheritance, and ignores steps inside
 * comments, docstrings and Examples tables.
 *
 * Multilingual support mirrors cucumber_gherkin's builtin dialects: a
 * `# language: xx` header selects the dialect; keywords are matched with
 * their trailing space, `*` is a step in every language.
 */
import dialects from './gherkin/dialects.json';

export interface Dialect {
  name: string;
  native: string;
  feature: string[];
  rule: string[];
  background: string[];
  scenario: string[];
  scenarioOutline: string[];
  examples: string[];
  given: string[];
  when: string[];
  then: string[];
  and: string[];
  but: string[];
}

export interface ParsedStep {
  /** 0-based line index in the document. */
  line: number;
  /** The step text without the keyword, trimmed. */
  text: string;
  /** Effective keyword: 'given' | 'when' | 'then' | 'and' | 'but'. */
  keyword: StepKeyword;
  /** Start column of the step text (0-based). */
  textStart: number;
  /** End column (exclusive) of the step text. */
  textEnd: number;
  /** The keyword as written, e.g. `Given` or `Diyelim ki`. */
  keywordText: string;
  /** True when the line has a data table attached (a `|` line follows). */
  hasDataTable: boolean;
}

export type StepKeyword = 'given' | 'when' | 'then' | 'and' | 'but';

const languagePattern = /^\s*#\s*language\s*:\s*([a-zA-Z\-_]+)\s*$/;

export function dialectFor(code: string | undefined): Dialect | undefined {
  if (!code) return undefined;
  return (dialects as Record<string, Dialect>)[code];
}

export function parseFeature(contents: string): { steps: ParsedStep[]; language?: string } {
  const lines = contents.split(/\r?\n/);
  const language = detectLanguage(lines);
  const dialect = dialectFor(language) ?? dialectFor('en')!;
  const stepKeywords: Array<[StepKeyword, string[]]> = [
    ['given', dialect.given],
    ['when', dialect.when],
    ['then', dialect.then],
    ['and', dialect.and],
    ['but', dialect.but],
  ];
  const steps: ParsedStep[] = [];
  let inDocString = false;
  let docStringFence = '';
  let lastEffective: StepKeyword | undefined;
  const blockOpeners = [
    ...dialect.feature,
    ...dialect.rule,
    ...dialect.background,
    ...dialect.scenario,
    ...dialect.scenarioOutline,
    ...dialect.examples,
    'After:',
  ];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (inDocString) {
      if (line.trim().startsWith(docStringFence)) inDocString = false;
      continue;
    }
    if (line.trim().startsWith('"""') || line.trim().startsWith('```')) {
      inDocString = true;
      docStringFence = line.trim().slice(0, 3);
      continue;
    }

    // A block opener resets And/But inheritance for the new block.
    if (matchesBlockOpener(line, blockOpeners)) {
      lastEffective = undefined;
    }

    const step = matchStep(line, i, stepKeywords, lastEffective);
    if (step) {
      // And/But/* inherit the previous step's effective keyword, per Gherkin.
      lastEffective = step.keyword;
      steps.push(step);
    }
  }
  return { steps, language };
}

function detectLanguage(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 10)) {
    const m = languagePattern.exec(line);
    if (m) return m[1];
  }
  return undefined;
}

function matchesBlockOpener(line: string, openers: string[]): boolean {
  const t = line.trim();
  for (const opener of openers) {
    if (t.startsWith(opener)) return true;
  }
  return false;
}

function matchStep(
  line: string,
  lineIndex: number,
  keywords: Array<[StepKeyword, string[]]>,
  previousEffective: StepKeyword | undefined,
): ParsedStep | undefined {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('@')) return undefined;
  const indent = line.length - trimmed.length;

  // Longest matching keyword wins, so `Eğer ki` beats `Eğer`.
  let best: { keyword: StepKeyword; spelling: string } | undefined;
  for (const [keyword, spellings] of keywords) {
    for (const spelling of spellings) {
      const withSpace = spelling.endsWith(' ') ? spelling : spelling + ' ';
      if (trimmed.startsWith(withSpace)) {
        if (!best || withSpace.length > best.spelling.length) best = { keyword, spelling: withSpace };
      }
    }
  }
  if (!best) return undefined;
  const keywordText = best.spelling.trim();
  const rest = trimmed.slice(best.spelling.length);
  const text = rest.trim();
  if (text.length === 0) return undefined;
  const textStart = indent + best.spelling.length + (rest.length - rest.trimStart().length);
  // And/But/* resolve to the effective keyword of the previous step.
  const effective =
    (best.keyword === 'and' || best.keyword === 'but') && previousEffective !== undefined
      ? previousEffective
      : best.keyword;
  return {
    line: lineIndex,
    text,
    keyword: effective,
    keywordText,
    textStart,
    textEnd: indent + trimmed.length,
    hasDataTable: false, // filled in by withDataTables
  };
}


/** Second pass: mark steps whose next non-empty line is a table row. */
export function withDataTables(steps: ParsedStep[], contents: string): ParsedStep[] {
  const lines = contents.split(/\r?\n/);
  return steps.map((s) => {
    let j = s.line + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    const hasDataTable = j < lines.length && lines[j].trimStart().startsWith('|');
    return { ...s, hasDataTable };
  });
}
