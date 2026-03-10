/**
 * Tests for the typed regex DSL.
 */
import { regex, makeRegexPart, RegexPart } from '../src/regex-dsl';
import { record, string, number, union, array, fallback } from '../src';

const { digit, digits, letter, lower, upper, w, dot, chars, range } = regex;
const word = w.oneOrMore();

// ---------------------------------------------------------------------------
// Regex parts used AS decoders (standalone)
// ---------------------------------------------------------------------------

test('digit is a decoder', () => {
  expect(digit('5')).toBe('5');
  expect(() => digit('55')).toThrow();
  expect(() => digit('a')).toThrow();
});

test('digits is a decoder', () => {
  expect(digits('42')).toBe('42');
  expect(digits('0')).toBe('0');
  expect(() => digits('abc')).toThrow();
});

test('letter is a decoder', () => {
  expect(letter('a')).toBe('a');
  expect(letter('Z')).toBe('Z');
  expect(() => letter('1')).toThrow();
  expect(() => letter('ab')).toThrow();
});

test('union with literals works as decoder', () => {
  const color = union('red', 'green', 'blue');
  expect(color('red')).toBe('red');
  expect(() => color('yellow')).toThrow();
});


// ---------------------------------------------------------------------------
// Regex parts inside records
// ---------------------------------------------------------------------------

test('regex parts work in record()', () => {
  const dec = record({
    id: digits,
    color: union('red', 'blue'),
    name: string,
  });
  expect(dec({ id: '42', color: 'red', name: 'hello world' })).toEqual({
    id: '42',
    color: 'red',
    name: 'hello world',
  });
  expect(() => dec({ id: 'abc', color: 'red', name: 'x' })).toThrow();
  expect(() => dec({ id: '1', color: 'yellow', name: 'x' })).toThrow();
});

// ---------------------------------------------------------------------------
// Regex composition
// ---------------------------------------------------------------------------

test('regex(...parts) matches and rejects', () => {
  const dec = regex(digits, '-', digits);
  expect(dec('123-456')).toBe('123-456');
  expect(() => dec('abc')).toThrow();
  expect(() => dec('123')).toThrow();
});

test('literal string parts are escaped', () => {
  const dec = regex('(', digits, ')');
  expect(dec('(42)')).toBe('(42)');
  expect(() => dec('42')).toThrow();
});

test('literal number parts', () => {
  const dec = regex('v', 2, '.', digits);
  expect(dec('v2.0')).toBe('v2.0');
  expect(dec('v2.123')).toBe('v2.123');
  expect(() => dec('v3.0')).toThrow();
});

test('digit, digit — two digits exactly', () => {
  const dec = regex(digit, digit);
  expect(dec('42')).toBe('42');
  expect(() => dec('123')).toThrow();
  expect(() => dec('a1')).toThrow();
});

test('union in regex', () => {
  const dec = regex(union('red', 'green', 'blue'), '-', digits);
  expect(dec('red-1')).toBe('red-1');
  expect(() => dec('yellow-1')).toThrow();
});

test('union with numbers in regex', () => {
  const dec = regex('http/', union(1, 2), '.', digit);
  expect(dec('http/1.1')).toBe('http/1.1');
  expect(() => dec('http/3.0')).toThrow();
});

test('string decoder in regex matches anything', () => {
  const dec = regex('https://', string, '/api');
  expect(dec('https://example.com/api')).toBe('https://example.com/api');
  expect(() => dec('http://example.com/api')).toThrow();
});

// ---------------------------------------------------------------------------
// Fluent combinators
// ---------------------------------------------------------------------------

test('union().zeroOrOne() in regex', () => {
  const dec = regex(digits, union('px', 'em').zeroOrOne());
  expect(dec('42px')).toBe('42px');
  expect(dec('42')).toBe('42');
  expect(() => dec('42vw')).toThrow();
});

test('.oneOrMore()', () => {
  const dec = regex(letter.oneOrMore());
  expect(dec('hello')).toBe('hello');
  expect(() => dec('')).toThrow();
  expect(() => dec('123')).toThrow();
});

test('.zeroOrMore()', () => {
  const dec = regex('a', digit.zeroOrMore(), 'z');
  expect(dec('az')).toBe('az');
  expect(dec('a123z')).toBe('a123z');
  expect(() => dec('abz')).toThrow();
});

test('.repeat(n)', () => {
  const dec = regex(digit.repeat(4), '-', digit.repeat(2), '-', digit.repeat(2));
  expect(dec('2024-06-15')).toBe('2024-06-15');
  expect(() => dec('24-6-15')).toThrow();
});

test('.repeat(min, max)', () => {
  const dec = regex(digit.repeat(1, 3));
  expect(dec('1')).toBe('1');
  expect(dec('123')).toBe('123');
  expect(() => dec('')).toThrow();
  expect(() => dec('1234')).toThrow();
});

// ---------------------------------------------------------------------------
// Existing regex(RegExp) API
// ---------------------------------------------------------------------------

test('regex(RegExp) still works', () => {
  const dec = regex(/^\d+$/);
  expect(dec('42')).toBe('42');
  expect(() => dec('abc')).toThrow();
});

// ---------------------------------------------------------------------------
// Composability with decoder methods
// ---------------------------------------------------------------------------

test('.map() works', () => {
  const dec = regex(digits).map(Number);
  expect(dec('42')).toBe(42);
});

test('.safeDecode() works', () => {
  const dec = regex(digits, '-', digits);
  const ok = dec.safeDecode('1-2');
  expect(ok).toEqual({ ok: true, value: '1-2' });
  const fail = dec.safeDecode('nope');
  expect(fail.ok).toBe(false);
});

// ---------------------------------------------------------------------------
// Real-world patterns
// ---------------------------------------------------------------------------

test('date: YYYY-MM-DD', () => {
  const dateDec = regex(digit.repeat(4), '-', digit.repeat(2), '-', digit.repeat(2));
  expect(dateDec('2024-06-15')).toBe('2024-06-15');
  expect(dateDec('1999-12-31')).toBe('1999-12-31');
  expect(() => dateDec('24-6-15')).toThrow();
  expect(() => dateDec('2024/06/15')).toThrow();
});

test('time: HH:MM:SS', () => {
  const timeDec = regex(digit.repeat(2), ':', digit.repeat(2), ':', digit.repeat(2));
  expect(timeDec('14:30:00')).toBe('14:30:00');
  expect(() => timeDec('2:30:00')).toThrow();
});

test('ISO timestamp', () => {
  const ts = regex(
    digit.repeat(4), '-', digit.repeat(2), '-', digit.repeat(2),
    'T',
    digit.repeat(2), ':', digit.repeat(2), ':', digit.repeat(2),
    'Z',
  );
  expect(ts('2024-06-15T14:30:00Z')).toBe('2024-06-15T14:30:00Z');
  expect(() => ts('2024-06-15 14:30:00')).toThrow();
});

test('semantic version: vX.Y.Z', () => {
  const semver = regex('v', digits, '.', digits, '.', digits);
  expect(semver('v1.2.3')).toBe('v1.2.3');
  expect(semver('v0.0.1')).toBe('v0.0.1');
  expect(semver('v12.345.6')).toBe('v12.345.6');
  expect(() => semver('1.2.3')).toThrow();
  expect(() => semver('v1.2')).toThrow();
});

test('semver with optional pre-release', () => {
  const pre = regex('v', digits, '.', digits, '.', digits, union('-alpha', '-beta', '-rc').zeroOrOne());
  expect(pre('v1.0.0')).toBe('v1.0.0');
  expect(pre('v1.0.0-beta')).toBe('v1.0.0-beta');
  expect(pre('v1.0.0-rc')).toBe('v1.0.0-rc');
  expect(() => pre('v1.0.0-gamma')).toThrow();
});

test('hex color: #RRGGBB', () => {
  const hex = regex('#', w.repeat(6));
  expect(hex('#ff00aa')).toBe('#ff00aa');
  expect(hex('#000000')).toBe('#000000');
  expect(() => hex('ff00aa')).toThrow();
  expect(() => hex('#fff')).toThrow(); // no shorthand
});

test('IP address (v4 simple)', () => {
  const octet = digit.repeat(1, 3);
  const ip = regex(octet, '.', octet, '.', octet, '.', octet);
  expect(ip('192.168.1.1')).toBe('192.168.1.1');
  expect(ip('0.0.0.0')).toBe('0.0.0.0');
  expect(ip('255.255.255.255')).toBe('255.255.255.255');
  expect(() => ip('1234.0.0.1')).toThrow();
  expect(() => ip('1.2.3')).toThrow();
});

test('HTTP method + path', () => {
  const method = union('GET', 'POST', 'PUT', 'DELETE', 'PATCH');
  const route = regex(method, ' /', word);
  expect(route('GET /users')).toBe('GET /users');
  expect(route('POST /data')).toBe('POST /data');
  expect(() => route('OPTIONS /foo')).toThrow();
});

test('email-like pattern', () => {
  const emailDec = regex(word, '@', word, '.', letter.oneOrMore());
  expect(emailDec('alice@example.com')).toBe('alice@example.com');
  expect(() => emailDec('no-at-sign.com')).toThrow();
  expect(() => emailDec('@missing.com')).toThrow();
});

test('phone number: +CC-XXX-XXXX', () => {
  const phone = regex('+', digit.repeat(1, 3), '-', digit.repeat(3), '-', digit.repeat(4));
  expect(phone('+1-555-1234')).toBe('+1-555-1234');
  expect(phone('+47-123-4567')).toBe('+47-123-4567');
  expect(() => phone('555-1234')).toThrow();
});

test('CSS length with units', () => {
  const unit = union('px', 'em', 'rem', '%', 'vh', 'vw');
  const cssLen = regex(digits, unit);
  expect(cssLen('42px')).toBe('42px');
  expect(cssLen('100%')).toBe('100%');
  expect(cssLen('16rem')).toBe('16rem');
  expect(() => cssLen('42pt')).toThrow();
  expect(() => cssLen('px')).toThrow();
});

test('UUID-like: 8-4-4-4-12 hex digits', () => {
  const h = w; // close enough for hex
  const uuid = regex(
    h.repeat(8), '-', h.repeat(4), '-', h.repeat(4), '-', h.repeat(4), '-', h.repeat(12),
  );
  expect(uuid('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
  expect(() => uuid('not-a-uuid')).toThrow();
  expect(() => uuid('550e8400-e29b-41d4-a716')).toThrow();
});

test('slug: lowercase letters, digits, and dashes', () => {
  const slugChar = chars('a-z0-9\\-');
  const slug = regex(slugChar.oneOrMore());
  expect(slug('my-cool-post-123')).toBe('my-cool-post-123');
  expect(() => slug('Has Spaces')).toThrow();
  expect(() => slug('UPPERCASE')).toThrow();
});

// ---------------------------------------------------------------------------
// Chaining regex with other decoder features
// ---------------------------------------------------------------------------

test('.map() to parse a date regex into a Date object', () => {
  const dateDec = regex(digit.repeat(4), '-', digit.repeat(2), '-', digit.repeat(2))
    .map(s => new Date(s));
  const d = dateDec('2024-06-15');
  expect(d).toBeInstanceOf(Date);
  expect(d.getFullYear()).toBe(2024);
});

test('.map() to extract number from CSS length', () => {
  const cssNum = regex(digits, union('px', 'em', 'rem'))
    .map(s => parseInt(s, 10));
  expect(cssNum('42px')).toBe(42);
  expect(cssNum('16rem')).toBe(16);
});

test('.chain() a regex into a record decoder', () => {
  const kv = regex(word, '=', word).chain((s: unknown) => {
    const [k, v] = (s as string).split('=');
    return { key: k, value: v };
  });
  expect(kv('foo=bar')).toEqual({ key: 'foo', value: 'bar' });
  expect(() => kv('not valid')).toThrow();
});

test('regex in a record with other decoders', () => {
  const semver = regex('v', digits, '.', digits, '.', digits);
  const dateDec = regex(digit.repeat(4), '-', digit.repeat(2), '-', digit.repeat(2));
  const release = record({
    version: semver,
    date: dateDec,
    name: string,
    downloads: number,
  });
  expect(release({
    version: 'v1.2.3',
    date: '2024-06-15',
    name: 'Release',
    downloads: 42,
  })).toEqual({
    version: 'v1.2.3',
    date: '2024-06-15',
    name: 'Release',
    downloads: 42,
  });
  expect(() => release({ version: 'bad', date: '2024-06-15', name: 'x', downloads: 0 })).toThrow();
});

test('regex decoder in an array', () => {
  const tag = regex(lower.oneOrMore());
  const tags = array(tag);
  expect(tags(['foo', 'bar', 'baz'])).toEqual(['foo', 'bar', 'baz']);
  expect(() => tags(['foo', '123'])).toThrow();
});

test('regex with fallback', () => {
  const version = fallback(regex('v', digits), 'v0');
  expect(version('v42')).toBe('v42');
  expect(version('bad')).toBe('v0');
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test('empty literal parts', () => {
  const dec = regex('', digits, '');
  expect(dec('42')).toBe('42');
});

test('single literal string', () => {
  const dec = regex('hello');
  expect(dec('hello')).toBe('hello');
  expect(() => dec('world')).toThrow();
});

test('single digit part', () => {
  const dec = regex(digit);
  expect(dec('5')).toBe('5');
  expect(() => dec('55')).toThrow();
});

test('many literal segments', () => {
  const dec = regex('a', 'b', 'c', 'd', 'e');
  expect(dec('abcde')).toBe('abcde');
  expect(() => dec('abcdf')).toThrow();
});

test('special regex characters in literals are escaped', () => {
  const dec = regex('price: $', digits, '.', digit.repeat(2));
  expect(dec('price: $19.99')).toBe('price: $19.99');
  expect(() => dec('price: 19.99')).toThrow();
});

test('regex parts reject non-string input', () => {
  expect(() => digit(42 as any)).toThrow();
  expect(() => digits(123 as any)).toThrow();
  expect(() => letter(true as any)).toThrow();
});

test('lower only matches lowercase', () => {
  expect(lower('a')).toBe('a');
  expect(lower('z')).toBe('z');
  expect(() => lower('A')).toThrow();
  expect(() => lower('1')).toThrow();
});

test('upper only matches uppercase', () => {
  expect(upper('A')).toBe('A');
  expect(upper('Z')).toBe('Z');
  expect(() => upper('a')).toThrow();
});

test('w matches letters, digits, underscore', () => {
  expect(w('a')).toBe('a');
  expect(w('0')).toBe('0');
  expect(w('_')).toBe('_');
  expect(() => w('-')).toThrow();
  expect(() => w(' ')).toThrow();
});

test('dot matches any single character', () => {
  expect(dot('x')).toBe('x');
  expect(dot('1')).toBe('1');
  expect(dot(' ')).toBe(' ');
  expect(() => dot('ab')).toThrow();
  expect(() => dot('')).toThrow();
});

test('chained quantifiers: letter.oneOrMore().zeroOrOne()', () => {
  const dec = regex(digits, letter.oneOrMore().zeroOrOne());
  expect(dec('42abc')).toBe('42abc');
  expect(dec('42')).toBe('42');
  expect(() => dec('abc')).toThrow();
});

// ---------------------------------------------------------------------------
// Norwegian / extended character sets
// ---------------------------------------------------------------------------

test('Norwegian character class via makeRegexPart', () => {
  const norChar = makeRegexPart('[a-zA-ZæøåÆØÅ]');
  expect(norChar('a')).toBe('a');
  expect(norChar('æ')).toBe('æ');
  expect(norChar('ø')).toBe('ø');
  expect(norChar('å')).toBe('å');
  expect(norChar('Æ')).toBe('Æ');
  expect(() => norChar('1')).toThrow();
  expect(() => norChar('ä')).toThrow();
});

test('union(letter, extra chars) combines into a RegexPart', () => {
  const norChar = union(letter, 'æ', 'ø', 'å', 'Æ', 'Ø', 'Å');
  expect(norChar('a')).toBe('a');
  expect(norChar('Z')).toBe('Z');
  expect(norChar('æ')).toBe('æ');
  expect(norChar('ø')).toBe('ø');
  expect(norChar('å')).toBe('å');
  expect(norChar('Æ')).toBe('Æ');
  expect(() => norChar('1')).toThrow();
  expect(() => norChar('ä')).toThrow();
});

test('union(letter, ...) with .oneOrMore() in regex', () => {
  const norChar = union(letter, 'æ', 'ø', 'å', 'Æ', 'Ø', 'Å');
  const norWord = regex(norChar.oneOrMore());
  expect(norWord('blåbær')).toBe('blåbær');
  expect(norWord('Ørjan')).toBe('Ørjan');
  expect(norWord('rød')).toBe('rød');
  expect(norWord('Ålesund')).toBe('Ålesund');
  expect(norWord('hello')).toBe('hello');
  expect(() => norWord('café')).toThrow();
  expect(() => norWord('hello world')).toThrow();
  expect(() => norWord('')).toThrow();
});

test('union(RegexPart, strings) in a record', () => {
  const norChar = union(letter, 'æ', 'ø', 'å', 'Æ', 'Ø', 'Å');
  const norWord = regex(norChar.oneOrMore());
  const dec = record({
    fornavn: norWord,
    etternavn: norWord,
    alder: number,
  });
  expect(dec({ fornavn: 'Bjørn', etternavn: 'Ødegård', alder: 42 }))
    .toEqual({ fornavn: 'Bjørn', etternavn: 'Ødegård', alder: 42 });
  expect(() => dec({ fornavn: 'Bjørn', etternavn: 'O\'Brien', alder: 30 })).toThrow();
});

test('union(RegexPart, strings) place name with hyphen', () => {
  const norChar = union(letter, 'æ', 'ø', 'å', 'Æ', 'Ø', 'Å');
  const norPlace = regex(norChar.oneOrMore(), union('-').zeroOrOne(), norChar.zeroOrMore());
  expect(norPlace('Kristiansand')).toBe('Kristiansand');
  expect(norPlace('Ås')).toBe('Ås');
  expect(norPlace('Stor-Elvdal')).toBe('Stor-Elvdal');
});

test('union(RegexPart, strings) standalone decoder', () => {
  const norChar = union(letter, 'æ', 'ø', 'å', 'Æ', 'Ø', 'Å');
  const norWord = regex(norChar.oneOrMore());
  expect(norWord('Trøndelag')).toBe('Trøndelag');
  const result = norWord.safeDecode('Tromsø');
  expect(result).toEqual({ ok: true, value: 'Tromsø' });
  const fail = norWord.safeDecode('Oslo123');
  expect(fail.ok).toBe(false);
});

test('union(digit, letter) combines two RegexParts', () => {
  const alphaNum = union(digit, letter);
  expect(alphaNum('a')).toBe('a');
  expect(alphaNum('5')).toBe('5');
  expect(() => alphaNum('!')).toThrow();
  const alphaWord = regex(alphaNum.oneOrMore());
  expect(alphaWord('abc123')).toBe('abc123');
  expect(() => alphaWord('abc 123')).toThrow();
});

// ---------------------------------------------------------------------------
// Composability: regex() results inside other regex() calls
// ---------------------------------------------------------------------------

test('regex() result is composable inside another regex()', () => {
  const date = regex(digits, '-', digits, '-', digits);
  const time = regex(digit, digit, ':', digit, digit);
  const datetime = regex(date, 'T', time);
  expect(datetime('2024-01-15T09:30')).toBe('2024-01-15T09:30');
  expect(() => datetime('not-a-datetime')).toThrow();
  expect(() => datetime('2024-01-15 09:30')).toThrow();
});

test('nested regex composition: semver inside version string', () => {
  const semver = regex(digits, '.', digits, '.', digits);
  const version = regex('v', semver);
  expect(version('v1.2.3')).toBe('v1.2.3');
  expect(() => version('1.2.3')).toThrow();
  expect(() => version('v1.2')).toThrow();
});

test('three levels of regex nesting', () => {
  const twoDigits = regex(digit.repeat(2));
  const time = regex(twoDigits, ':', twoDigits);
  const timeRange = regex(time, '-', time);
  expect(timeRange('09:30-17:00')).toBe('09:30-17:00');
  expect(() => timeRange('9:30-17:00')).toThrow();
});

test('composed regex with union', () => {
  const protocol = regex(union('http', 'https'), '://');
  const url = regex(protocol, word);
  expect(url('https://example')).toBe('https://example');
  expect(url('http://test')).toBe('http://test');
  expect(() => url('ftp://test')).toThrow();
});

test('regex().repeat() groups the pattern', () => {
  const twoDigits = regex(digit, digit);
  // twoDigits.repeat(3) should match exactly 6 digits (3 groups of 2)
  const dec = regex(twoDigits.repeat(3));
  expect(dec('123456')).toBe('123456');
  expect(() => dec('12345')).toThrow();   // 5 digits
  expect(() => dec('1234567')).toThrow(); // 7 digits
});

test('regex().oneOrMore() repeats the whole group', () => {
  const ab = regex('a', 'b');
  const dec = regex(ab.oneOrMore());
  expect(dec('ab')).toBe('ab');
  expect(dec('ababab')).toBe('ababab');
  expect(() => dec('abc')).toThrow();
  expect(() => dec('a')).toThrow();
  expect(() => dec('')).toThrow();
});

test('regex().zeroOrOne() makes the whole group optional', () => {
  const tag = regex('-', letter.oneOrMore());
  const dec = regex(digits, tag.zeroOrOne());
  expect(dec('42')).toBe('42');
  expect(dec('42-beta')).toBe('42-beta');
  expect(() => dec('42-')).toThrow(); // dash without letters
});

// ---------------------------------------------------------------------------
// regex.chars() and regex.range()
// ---------------------------------------------------------------------------

test('chars: hex digits', () => {
  const hex = chars('0-9a-fA-F');
  expect(hex('a')).toBe('a');
  expect(hex('F')).toBe('F');
  expect(hex('5')).toBe('5');
  expect(() => hex('g')).toThrow();
  expect(() => hex('G')).toThrow();
});

test('chars: Norwegian characters', () => {
  const norChar = chars('a-zA-ZæøåÆØÅ');
  expect(norChar('a')).toBe('a');
  expect(norChar('æ')).toBe('æ');
  expect(norChar('Å')).toBe('Å');
  expect(() => norChar('1')).toThrow();
  expect(() => norChar('ä')).toThrow();
});

test('chars with .oneOrMore() in regex', () => {
  const hex = chars('0-9a-fA-F');
  const color = regex('#', hex.repeat(6));
  expect(color('#ff00aa')).toBe('#ff00aa');
  expect(color('#FF00AA')).toBe('#FF00AA');
  expect(() => color('#gggggg')).toThrow();
});

test('chars Norwegian word', () => {
  const norChar = chars('a-zA-ZæøåÆØÅ');
  const norWord = regex(norChar.oneOrMore());
  expect(norWord('blåbær')).toBe('blåbær');
  expect(norWord('Ørjan')).toBe('Ørjan');
  expect(() => norWord('hello world')).toThrow();
});

test('range: lowercase', () => {
  const lc = range('a', 'z');
  expect(lc('m')).toBe('m');
  expect(() => lc('M')).toThrow();
  expect(() => lc('5')).toThrow();
});

test('range: digits', () => {
  const d = range('0', '9');
  expect(d('5')).toBe('5');
  expect(() => d('a')).toThrow();
});

test('range with quantifiers', () => {
  const lc = range('a', 'z');
  const dec = regex(lc.repeat(3, 8));
  expect(dec('hello')).toBe('hello');
  expect(dec('abc')).toBe('abc');
  expect(() => dec('ab')).toThrow();
  expect(() => dec('abcdefghi')).toThrow();
});

test('union(range, range) combines ranges', () => {
  const hexLower = range('a', 'f');
  const hexDigit = range('0', '9');
  const hex = union(hexLower, hexDigit);
  expect(hex('a')).toBe('a');
  expect(hex('5')).toBe('5');
  expect(() => hex('g')).toThrow();
  const hexStr = regex(hex.oneOrMore());
  expect(hexStr('deadbeef')).toBe('deadbeef');
  expect(hexStr('0f3c')).toBe('0f3c');
});

// ---------------------------------------------------------------------------
// Cross-feature combinations
// ---------------------------------------------------------------------------

test('chars in union with string literals', () => {
  const vowel = chars('aeiou');
  const special = union(vowel, 'æ', 'ø', 'å');
  expect(special('a')).toBe('a');
  expect(special('æ')).toBe('æ');
  expect(() => special('b')).toThrow();
  const dec = regex(special.oneOrMore());
  expect(dec('aæøå')).toBe('aæøå');
});

test('range in union with chars', () => {
  const up = range('A', 'Z');
  const lowerNor = chars('a-zæøå');
  const norLetter = union(up, lowerNor);
  expect(norLetter('A')).toBe('A');
  expect(norLetter('æ')).toBe('æ');
  expect(() => norLetter('1')).toThrow();
});

test('chars inside composed regex', () => {
  const hex = chars('0-9a-fA-F');
  const hexByte = regex(hex, hex);
  const macAddr = regex(
    hexByte, ':', hexByte, ':', hexByte, ':',
    hexByte, ':', hexByte, ':', hexByte,
  );
  expect(macAddr('aa:bb:cc:dd:ee:ff')).toBe('aa:bb:cc:dd:ee:ff');
  expect(() => macAddr('gg:bb:cc:dd:ee:ff')).toThrow();
});

test('composed regex in record()', () => {
  const semver = regex(digits, '.', digits, '.', digits);
  const dec = record({
    name: string,
    version: semver,
  });
  expect(dec({ name: 'foo', version: '1.2.3' }))
    .toEqual({ name: 'foo', version: '1.2.3' });
  expect(() => dec({ name: 'foo', version: 'abc' })).toThrow();
});

test('composed regex in array()', () => {
  const tag = regex(letter.oneOrMore(), '-', digits);
  const dec = array(tag);
  expect(dec(['feat-1', 'fix-42'])).toEqual(['feat-1', 'fix-42']);
  expect(() => dec(['feat-1', '123'])).toThrow();
});

test('composed regex with .map()', () => {
  const semver = regex(digits, '.', digits, '.', digits);
  const parts = semver.map(s => s.split('.').map(Number));
  expect(parts('1.2.3')).toEqual([1, 2, 3]);
  expect(() => parts('abc')).toThrow();
});

test('composed regex with .optional() in record', () => {
  const tag = regex(letter.oneOrMore());
  const dec = record({
    name: string,
    tag: tag.optional(),
  });
  expect(dec({ name: 'foo', tag: 'beta' }))
    .toEqual({ name: 'foo', tag: 'beta' });
  expect(dec({ name: 'foo', tag: undefined }))
    .toEqual({ name: 'foo', tag: undefined });
  expect(dec({ name: 'foo' }))
    .toEqual({ name: 'foo', tag: undefined });
});

test('composed regex with .fallback()', () => {
  const version = regex(digits, '.', digits);
  const dec = record({
    version: fallback(version, '0.0'),
  });
  expect(dec({ version: '1.2' })).toEqual({ version: '1.2' });
  expect(dec({ version: 'bad' })).toEqual({ version: '0.0' });
});

test('chars with .zeroOrOne() in regex', () => {
  const sign = chars('\\+\\-');
  const num = regex(sign.zeroOrOne(), digits);
  expect(num('42')).toBe('42');
  expect(num('+42')).toBe('+42');
  expect(num('-7')).toBe('-7');
  expect(() => num('abc')).toThrow();
});

test('chars with .zeroOrMore() and .oneOrMore()', () => {
  const lc = chars('a-z');
  const ident = regex(lc.oneOrMore(), chars('0-9').zeroOrMore());
  expect(ident('hello')).toBe('hello');
  expect(ident('hello123')).toBe('hello123');
  expect(() => ident('123hello')).toThrow();
  expect(() => ident('')).toThrow();
});

test('range in composed regex with union', () => {
  const up = range('A', 'Z');
  const lo = range('a', 'z');
  const className = regex(up, lo.oneOrMore());
  const fqn = regex(className, union('.').zeroOrOne(), className.zeroOrOne());
  expect(fqn('Foo')).toBe('Foo');
  expect(fqn('Foo.Bar')).toBe('Foo.Bar');
  expect(() => fqn('foo')).toThrow();
});

test('nested composed regex with .map() to parse structured data', () => {
  const year = regex(digit.repeat(4));
  const monthDay = regex(digit.repeat(2));
  const date = regex(year, '-', monthDay, '-', monthDay);
  const parsed = date.map(s => {
    const [y, m, d] = s.split('-');
    return { year: Number(y), month: Number(m), day: Number(d) };
  });
  expect(parsed('2024-01-15')).toEqual({ year: 2024, month: 1, day: 15 });
  expect(() => parsed('24-1-5')).toThrow();
});

test('full pipeline: chars → union → regex → compose → record → map', () => {
  const norChar = union(letter, chars('æøåÆØÅ'));
  const norWord = regex(norChar.oneOrMore());
  const phone = regex('+47', digit.repeat(8));

  const contact = record({
    name: norWord,
    phone: phone,
  });

  const result = contact({ name: 'Bjørn', phone: '+4712345678' });
  expect(result).toEqual({ name: 'Bjørn', phone: '+4712345678' });
  expect(() => contact({ name: 'Bjørn', phone: '+4612345678' })).toThrow();
  expect(() => contact({ name: 'Bjørn2', phone: '+4712345678' })).toThrow();
});

// ---------------------------------------------------------------------------
// Namespace access style
// ---------------------------------------------------------------------------

test('regex.digit etc. work via namespace', () => {
  expect(regex.digit('5')).toBe('5');
  expect(regex.digits('42')).toBe('42');
  expect(regex.letter('a')).toBe('a');
  expect(regex.lower('a')).toBe('a');
  expect(regex.upper('A')).toBe('A');
  expect(regex.w('_')).toBe('_');
  expect(regex.dot('!')).toBe('!');
});

test('regex.chars() and regex.range() via namespace', () => {
  const hex = regex.chars('0-9a-f');
  expect(hex('a')).toBe('a');
  expect(() => hex('g')).toThrow();

  const lc = regex.range('a', 'z');
  expect(lc('m')).toBe('m');
  expect(() => lc('5')).toThrow();
});
