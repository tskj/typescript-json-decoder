/**
 * Type-level tests for the regex DSL.
 */
import { expectType, expectAssignable } from 'tsd';
import { regex, RegexPart } from '../src/regex-dsl';
import { Decoder } from '../src/types';
import { string, record, union } from '../src';

const { digit, digits, letter, lower, upper, w, dot } = regex;

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type Letter = 'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'|'i'|'j'|'k'|'l'|'m'|'n'|'o'|'p'|'q'|'r'|'s'|'t'|'u'|'v'|'w'|'x'|'y'|'z'
  |'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L'|'M'|'N'|'O'|'P'|'Q'|'R'|'S'|'T'|'U'|'V'|'W'|'X'|'Y'|'Z';

// --- regex parts ARE Decoders ---
expectAssignable<Decoder<Digit>>(digit);
expectAssignable<Decoder<`${number}`>>(digits);
expectAssignable<Decoder<Letter>>(letter);
expectAssignable<Decoder<string>>(w);

// --- regex parts work in record() ---
const rec = record({ id: digits, color: union('red', 'blue') });
expectAssignable<{ id: string; color: string }>(rec({ id: '1', color: 'red' }));

// --- regex() returns RegexPart (composable) ---
expectType<RegexPart<`${number}-${number}`>>(regex(digits, '-', digits));
expectType<RegexPart<`user-${number}`>>(regex('user-', digits));
expectType<RegexPart<`v2.${number}`>>(regex('v', 2, '.', digits));
expectType<RegexPart<`${Digit}${Digit}`>>(regex(digit, digit));
expectType<RegexPart<`${Letter}${number}`>>(regex(letter, digits));

// oneOf → union of literals
expectType<RegexPart<`${'red' | 'green' | 'blue'}-${number}`>>(
  regex(union('red', 'green', 'blue'), '-', digits),
);

// union with numbers in regex
expectType<RegexPart<`http/${1 | 2}.${Digit}`>>(
  regex('http/', union(1, 2), '.', digit),
);

// .zeroOrOne() → T | '' (regex ? quantifier)
expectType<RegexPart<`${number}${'px' | 'em' | ''}`>>(
  regex(digits, union('px', 'em').zeroOrOne()),
);

// string decoder in regex — falls back to .*, literal surroundings preserved
expectType<RegexPart<`https://${string}/api`>>(regex('https://', string, '/api'));

// .oneOrMore() / .zeroOrMore() / .repeat() → string fallback
expectAssignable<RegexPart<string>>(regex(letter.oneOrMore()));
expectAssignable<RegexPart<string>>(regex(digit.zeroOrMore()));
expectAssignable<RegexPart<string>>(regex(digit.repeat(4)));
expectAssignable<RegexPart<string>>(regex(digit.repeat(2, 4)));

// regex(RegExp) → Decoder<string> (not RegexPart — flags not preserved)
expectType<Decoder<string>>(regex(/\d+/));

// .map() transforms output type (leaves regex-land)
expectType<Decoder<number>>(regex(digits).map(Number));

// pure literal string
expectType<RegexPart<'hello'>>(regex('hello'));

// multiple literal segments concatenate
expectType<RegexPart<'abc'>>(regex('a', 'b', 'c'));

// semver-like
expectType<RegexPart<`v${number}.${number}.${number}`>>(
  regex('v', digits, '.', digits, '.', digits),
);

// zeroOrOne pre-release tag
expectType<RegexPart<`v${number}.${number}${'-alpha' | '-beta' | ''}`>>(
  regex('v', digits, '.', digits, union('-alpha', '-beta').zeroOrOne()),
);

// CSS length: number + unit
expectType<RegexPart<`${number}${'px' | 'em' | 'rem'}`>>(
  regex(digits, union('px', 'em', 'rem')),
);

// .map() changes output from string to number
expectType<Decoder<number>>(
  regex(digits, 'px').map(s => parseInt(s, 10)),
);

// lower and upper have precise character types
type LowercaseLetter = 'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'|'i'|'j'|'k'|'l'|'m'|'n'|'o'|'p'|'q'|'r'|'s'|'t'|'u'|'v'|'w'|'x'|'y'|'z';
type UppercaseLetter = Uppercase<LowercaseLetter>;
expectAssignable<Decoder<LowercaseLetter>>(lower);
expectAssignable<Decoder<UppercaseLetter>>(upper);

// --- union(RegexPart, strings) returns RegexPart with combined type ---
const norChar = union(letter, 'æ', 'ø', 'å');
expectAssignable<Decoder<Letter | 'æ' | 'ø' | 'å'>>(norChar);

// union(RegexPart, RegexPart) combines types
const alphaNum = union(digit, letter);
expectAssignable<Decoder<Digit | Letter>>(alphaNum);

// union(RegexPart, strings) has .oneOrMore()
expectAssignable<Decoder<string>>(union(letter, 'æ', 'ø', 'å').oneOrMore());

// --- regex.chars and regex.range return RegexPart ---
expectAssignable<RegexPart<string>>(regex.chars('a-z'));
expectAssignable<RegexPart<string>>(regex.range('a', 'z'));

// regex.chars/range are Decoders
expectAssignable<Decoder<string>>(regex.chars('0-9a-f'));
expectAssignable<Decoder<string>>(regex.range('0', '9'));

// regex.chars/range work in regex()
expectAssignable<RegexPart<string>>(regex(regex.chars('a-f').repeat(6)));
expectAssignable<RegexPart<string>>(regex('#', regex.chars('0-9a-fA-F').repeat(6)));

// --- composability: regex() results are RegexParts, usable inside other regex() ---
const date = regex(digits, '-', digits, '-', digits);
const time = regex(digit.repeat(2), ':', digit.repeat(2));

// regex result has .repeat(), .oneOrMore(), .zeroOrOne()
expectAssignable<RegexPart<string>>(date.repeat(2));
expectAssignable<RegexPart<string>>(date.oneOrMore());
expectAssignable<RegexPart<string>>(date.zeroOrOne());

// nested regex preserves pattern types
expectAssignable<RegexPart<string>>(regex(date, 'T', time));

// .optional() on RegexPart gives decoder semantics (T | undefined), not regex semantics
expectAssignable<Decoder<`${number}-${number}-${number}` | undefined>>(date.optional());
