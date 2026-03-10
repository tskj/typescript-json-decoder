/**
 * Typed regex DSL example.
 *
 * Demonstrates composable, type-safe regex patterns with the regex() DSL.
 */
import { regex, record, string, union } from 'typescript-json-decoder';

const { digits, digit, letter } = regex;

// --- Compose parts — the return type reflects the pattern structure ---

const semver = regex('v', digits, '.', digits, '.', digits);
// RegexPart<`v${number}.${number}.${number}`>

console.log(semver('v1.2.3')); // 'v1.2.3'

// --- Quantifiers ---

letter.oneOrMore();   // [a-zA-Z]+
digit.zeroOrMore();   // \d*
digit.zeroOrOne();    // \d?  (type: Digit | '')
digit.repeat(4);      // \d{4}
digit.repeat(2, 4);   // \d{2,4}

// --- Composability: regex() results nest inside other regex() calls ---

const datePart = regex(digits, '-', digits, '-', digits);
const timePart = regex(digit.repeat(2), ':', digit.repeat(2));
const datetime = regex(datePart, 'T', timePart);

console.log(datetime('2024-01-15T09:30')); // '2024-01-15T09:30'

// --- union() with regex parts ---

const cssLength = regex(digits, union('px', 'em', 'rem'));
console.log(cssLength('42px')); // '42px'

// zeroOrOne for optional suffixes
const maybeUnit = regex(digits, union('px', 'em').zeroOrOne());
console.log(maybeUnit('42'));   // '42'
console.log(maybeUnit('42px')); // '42px'

// --- Custom character classes ---

const hex = regex('#', regex.chars('0-9a-fA-F').repeat(6));
console.log(hex('#ff9900')); // '#ff9900'

// --- RegexPart extends Decoder — .map(), .optional(), etc. ---

// .map() transforms the result
const px = regex(digits, 'px').map(s => parseInt(s, 10));
console.log(px('42px')); // 42

// .optional() gives decoder semantics (T | undefined)
const optionalVersion = regex('v', digits).optional();
console.log(optionalVersion(undefined)); // undefined
console.log(optionalVersion('v2'));      // 'v2'
