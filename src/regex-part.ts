/**
 * RegexPart — a Decoder that also carries a regex pattern for composition.
 * Shared between the regex DSL and combinators like union().
 *
 * RegexPart extends Decoder, so it has all decoder methods (.optional(),
 * .nullable(), .map(), etc.) plus regex-specific quantifiers (.zeroOrOne(),
 * .oneOrMore(), .zeroOrMore(), .repeat()).
 */
import { Decoder, makeDecoder } from './types';
import { DecodeError } from './decode-error';
import { err, regexPattern, defaultTag } from './utils';

export interface RegexPart<T extends string = string> extends Decoder<T> {
  readonly [regexPattern]: string;

  /** Match zero or one times (regex ? quantifier) */
  zeroOrOne(): RegexPart<T | ''>;

  /** Match one or more times */
  oneOrMore(): RegexPart<string>;

  /** Match zero or more times */
  zeroOrMore(): RegexPart<string>;

  /** Repeat exactly N times, or between min and max times */
  repeat(n: number): RegexPart<string>;
  repeat(min: number, max: number): RegexPart<string>;
}

export function makeRegexPart<T extends string>(pattern: string): RegexPart<T> {
  const re = new RegExp(`^(?:${pattern})$`);

  const base = makeDecoder((value: unknown) => {
    if (typeof value !== 'string') {
      throw DecodeError.simple(
        err`The value ${value} is not of type ${'string'}, but is of type ${typeof value}`,
        'string',
        value,
      );
    }
    if (!re.test(value)) {
      throw DecodeError.simple(
        err`The string ${value} does not match the pattern ${re}`,
        `string matching ${re}`,
        value,
      );
    }
    return value as T;
  });

  return Object.assign(base, {
    [regexPattern]: pattern,
    zeroOrOne() {
      const opt = makeRegexPart<T | ''>(`(?:${pattern})?`);
      (opt as any)[defaultTag] = '';
      return opt;
    },
    oneOrMore(): RegexPart<string> {
      return makeRegexPart(`(?:${pattern})+`);
    },
    zeroOrMore(): RegexPart<string> {
      return makeRegexPart(`(?:${pattern})*`);
    },
    repeat(min: number, max?: number): RegexPart<string> {
      const q = max !== undefined ? `{${min},${max}}` : `{${min}}`;
      return makeRegexPart(`(?:${pattern})${q}`);
    },
  }) as unknown as RegexPart<T>;
}
