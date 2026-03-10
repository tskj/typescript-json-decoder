/**
 * Typed regex DSL
 *
 * All building blocks live under the `regex` namespace:
 *
 *   import { regex } from 'typescript-json-decoder';
 *
 *   regex(regex.digits, '-', regex.letter.oneOrMore())
 *   regex.digit.repeat(4)
 *   regex.chars('a-zA-ZæøåÆØÅ').oneOrMore()
 *
 * regex() returns a RegexPart, so results are fully composable:
 *
 *   const date = regex(regex.digits, '-', regex.digits, '-', regex.digits);
 *   const time = regex(regex.digit.repeat(2), ':', regex.digit.repeat(2));
 *   const datetime = regex(date, 'T', time);
 *   const repeatedDate = date.repeat(3);
 */

import { Decoder, makeDecoder } from './types';
import { DecodeError } from './decode-error';
import { err, regexPattern } from './utils';
import { string as stringDecoder } from './primitive-decoders';
import { makeRegexPart, RegexPart } from './regex-part';

export { RegexPart, makeRegexPart } from './regex-part';
export { regexPattern };

// ---------------------------------------------------------------------------
// Type-level: concatenate types from a sequence of parts
// ---------------------------------------------------------------------------

type PartType<P> =
  P extends string ? P :
  P extends number ? `${P}` :
  P extends Decoder<infer T> ?
    T extends string ? T :
    T extends number ? `${T}` :
    T extends boolean ? `${T}` :
    string :
  never;

type ConcatParts<Parts extends readonly unknown[]> =
  Parts extends readonly [infer H, ...infer T]
    ? `${PartType<H>}${ConcatParts<T>}`
    : '';

// ---------------------------------------------------------------------------
// Character types
// ---------------------------------------------------------------------------

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

type LowercaseLetter =
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i'
  | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r'
  | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';

type UppercaseLetter = Uppercase<LowercaseLetter>;

type Letter = LowercaseLetter | UppercaseLetter;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasPattern(x: unknown): x is { [regexPattern]: string } {
  return x != null && (typeof x === 'object' || typeof x === 'function') && regexPattern in x;
}

function patternFor(p: string | number | RegexPart<any> | Decoder<any>): string {
  if (typeof p === 'string') return escapeRegex(p);
  if (typeof p === 'number') return escapeRegex(String(p));
  if (hasPattern(p)) return p[regexPattern];
  // Allow the string decoder as a wildcard (.*)
  if (p === stringDecoder) return '.*';
  throw new Error(
    `regex(): argument is a Decoder without a regex pattern. ` +
    `Use regex building blocks (regex.digit, regex.letter, etc.), ` +
    `string/number literals, union() of these, or the string decoder. ` +
    `Note: .optional() leaves regex-land — use .zeroOrOne() for regex "?".`,
  );
}

// ---------------------------------------------------------------------------
// regex() — overloaded: regex(RegExp) or regex(...parts)
// ---------------------------------------------------------------------------

type RegexInput = string | number | RegexPart<any> | Decoder<any>;

export function regex(pattern: RegExp): Decoder<string>;
export function regex<const P extends readonly RegexInput[]>(
  ...parts: P
): RegexPart<ConcatParts<P> & string>;
export function regex(
  ...args: [RegExp] | RegexInput[]
): any {
  // Raw RegExp overload — returns plain Decoder (flags preserved, not composable)
  if (args.length === 1 && args[0] instanceof RegExp) {
    const pattern = args[0];
    return makeDecoder((value: unknown) => {
      const str = stringDecoder(value);
      if (!pattern.test(str)) {
        throw DecodeError.simple(
          err`The string ${str} does not match the pattern ${pattern}`,
          `string matching ${pattern}`,
          value,
        );
      }
      return str;
    });
  }

  // Parts overload — returns RegexPart (composable, has .repeat() etc.)
  const parts = args as RegexInput[];
  const combinedPattern = parts.map(patternFor).join('');
  return makeRegexPart(combinedPattern);
}

// ---------------------------------------------------------------------------
// regex namespace — all building blocks
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-namespace */
export namespace regex {
  /** Single digit 0-9 */
  export const digit: RegexPart<Digit> = makeRegexPart<Digit>('\\d');

  /** One or more digits (\d+) */
  export const digits: RegexPart<`${number}`> = makeRegexPart<`${number}`>('\\d+');

  /** Single lowercase letter a-z */
  export const lower: RegexPart<LowercaseLetter> = makeRegexPart<LowercaseLetter>('[a-z]');

  /** Single uppercase letter A-Z */
  export const upper: RegexPart<UppercaseLetter> = makeRegexPart<UppercaseLetter>('[A-Z]');

  /** Single letter a-zA-Z */
  export const letter: RegexPart<Letter> = makeRegexPart<Letter>('[a-zA-Z]');

  /** Single word character (\w) */
  export const w: RegexPart<string> = makeRegexPart('\\w');

  /** Any single character (.) */
  export const dot: RegexPart<string> = makeRegexPart('.');

  /**
   * Create a RegexPart from a character class string.
   *
   *   regex.chars('a-zA-ZæøåÆØÅ')  → matches [a-zA-ZæøåÆØÅ]
   *   regex.chars('0-9a-f')         → matches [0-9a-f]
   */
  export function chars<T extends string = string>(c: string): RegexPart<T> {
    return makeRegexPart<T>(`[${c}]`);
  }

  /**
   * Create a RegexPart matching a single character in the given range.
   *
   *   regex.range('a', 'z')   → matches [a-z]
   *   regex.range('0', '9')   → matches [0-9]
   */
  export function range<T extends string = string>(from: string, to: string): RegexPart<T> {
    return makeRegexPart<T>(`[${from}-${to}]`);
  }
}
