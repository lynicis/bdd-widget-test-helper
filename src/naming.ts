/**
 * Faithful TypeScript port of bdd_widget_test's step naming
 * (lib/src/util/string_utils.dart, lib/src/step_generator.dart and the
 * `diacritic` package's replacement map), verified against the package's
 * own test fixtures.
 *
 * Pipeline for a raw step line, e.g. `Given I see {'text'} widgets`:
 *   1. parseRawStepLine: split `{...}` parameters out of the line;
 *      only the step NAME goes into the identifier.
 *   2. removeDiacritics: fold accented Latin onto ASCII (ö→o, ı→i, ş→s…).
 *   3. Strip `<placeholders>`, then every char that is not \w / \s / \d
 *      (JS `\w` == Dart `\w` == ASCII only), collapse whitespace.
 *   4. camelize → the Dart function name; underscore() of that → the file name.
 */
import { DIACRITIC_MULTI, DIACRITIC_SINGLE } from './diacritics.generated';

export function removeDiacritics(text: string): string {
  let out = '';
  for (const ch of text) {
    const single = DIACRITIC_SINGLE[ch];
    if (single !== undefined) {
      out += single;
    } else {
      const multi = DIACRITIC_MULTI[ch];
      out += multi !== undefined ? multi : ch;
    }
  }
  return out;
}

const _DIGIT = 1;
const _LOWER = 2;
const _UNDERSCORE = 4;
const _UPPER = 8;
const _ALPHA = _LOWER | _UPPER;
const _ALPHA_NUM = _ALPHA | _DIGIT;

function asciiType(ch: string): number {
  if (ch.length === 1) {
    const c = ch.charCodeAt(0);
    if (c < 128) {
      if (c >= 97 && c <= 122) return _LOWER;
      if (c >= 65 && c <= 90) return _UPPER;
      if (c >= 48 && c <= 57) return _DIGIT;
      if (c === 95) return _UNDERSCORE;
    }
  }
  return 0;
}

/** "The app is running" => "the_app_is_running"; "theAppIsRunning" => "the_app_is_running" */
export function underscore(input: string): string {
  let sb = '';
  let separate = false;
  for (const s of Array.from(input)) {
    const type = asciiType(s);
    if (separate && type & _UPPER) {
      sb += '_' + s.toLowerCase();
      separate = true;
    } else {
      sb += s.toLowerCase();
      separate = (type & _ALPHA_NUM) !== 0 || (type & _UNDERSCORE) !== 0 && separate;
    }
  }
  return sb;
}

/** "The_app_is_running" => "theAppIsRunning" */
export function camelize(input: string): string {
  const string = input.toLowerCase();
  let sb = '';
  let capitalize = true;
  let isBeginning = true;
  let remove = false;
  for (const s of Array.from(string)) {
    const type = asciiType(s);
    if (capitalize && type & _ALPHA) {
      sb += isBeginning ? s : s.toUpperCase();
      capitalize = false;
      remove = true;
      isBeginning = false;
    } else {
      if (type & _UNDERSCORE) {
        if (!remove) {
          sb += s;
          remove = true;
        }
        capitalize = true;
      } else {
        if (type & _ALPHA_NUM) {
          capitalize = false;
          remove = true;
        } else {
          capitalize = true;
          remove = false;
          isBeginning = true;
        }
        sb += s;
      }
    }
  }
  return sb;
}

/**
 * Splits a raw step line into [name, ...parameters]. `{...}` groups are
 * parameters; nested braces stay inside the parameter.
 */
export function parseRawStepLine(stepLine: string): string[] {
  const name: string[] = [];
  const parameters: string[] = [];
  let parameter: string[] = [];
  let bracketsNesting = 0;
  for (const c of stepLine) {
    if (c === '{') {
      bracketsNesting++;
      if (bracketsNesting === 1) continue;
    }
    if (c === '}') {
      bracketsNesting--;
      if (bracketsNesting === 0) {
        parameters.push(parameter.join(''));
        parameter = [];
        continue;
      }
    }
    if (bracketsNesting === 0) name.push(c);
    else parameter.push(c);
  }
  return [name.join(''), ...parameters];
}

const examplesRegExp = /<(.*?)>/gi;
const charactersAndNumbersRegExp = /[^\w\s\d]+/g;
const repeatingSpacesRegExp = /\s+/g;

function camelizedString(input: string): string {
  const text = removeDiacritics(input)
    .replace(examplesRegExp, '')
    .replace(charactersAndNumbersRegExp, '')
    .replace(repeatingSpacesRegExp, ' ')
    .trim()
    .replace(/ /g, '_');
  return camelize(text);
}

const unusableStart = /^[\d_]/;

/**
 * The Dart identifier a step is named after, or null when its text names
 * nothing usable: non-ASCII scripts leave nothing behind, a leading digit or
 * underscore is not a callable name (matches stepIdentifier in step_generator.dart).
 */
export function stepIdentifier(stepText: string): string | null {
  const candidate = camelizedString(parseRawStepLine(stepText)[0]);
  return candidate.length > 0 && !unusableStart.test(candidate) ? candidate : null;
}

/** The step file name without extension: "the app is running" -> "the_app_is_running". */
export function getStepFilename(stepText: string): string | null {
  const identifier = stepIdentifier(stepText);
  return identifier === null ? null : underscore(identifier);
}

/**
 * The parameter type GenericStep would generate for a `{...}` parameter:
 * bool for true/false, num for parseable numbers, String for quoted,
 * dynamic otherwise.
 */
export function genericParameterType(parameter: string): 'bool' | 'num' | 'String' | 'dynamic' {
  if (parameter === 'true' || parameter === 'false') return 'bool';
  if (parameter !== '' && !isNaN(Number(parameter))) return 'num';
  if (
    (parameter.startsWith('"') && parameter.endsWith('"')) ||
    (parameter.startsWith("'") && parameter.endsWith("'"))
  ) {
    return 'String';
  }
  return 'dynamic';
}

/** The step's <placeholder> names, in order, deduplicated. */
export function examplePlaceholders(stepLine: string): string[] {
  const names = new Set<string>();
  for (const m of stepLine.matchAll(/<(.*?)>/g)) names.add(m[1]);
  return [...names];
}

/** The built-in steps of bdd_widget_test (predefinedSteps in step_generator.dart). */
export const predefinedSteps: ReadonlySet<string> = new Set([
  'theAppIsRunning',
  'iDismissThePage',
  'iDontSeeIcon',
  'iDontSeeRichText',
  'iDontSeeText',
  'iDontSeeWidget',
  'iEnterIntoInputField',
  'iSeeDisabledElevatedButton',
  'iSeeEnabledElevatedButton',
  'iSeeExactlyWidgets',
  'iSeeIcon',
  'iSeeMultipleTexts',
  'iSeeMultipleWidgets',
  'iSeeRichText',
  'iSeeText',
  'iSeeWidget',
  'iTapIcon',
  'iTapText',
  'iWait',
  'theScreenMatchesGolden',
]);

