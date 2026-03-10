import { expectAssignable, expectType } from 'tsd';
import {
  boolean,
  date,
  Decoder,
  DefaultDecoder,
  RecordDecoder,
  DecodeError,
  field,
  fields,
  number,
  optional,
  record,
  string,
  undef,
  union,
  intersection,
  array,
  literal,
  tuple,
  decoder,
  nullable,
  dict,
  set,
  map,
  DecoderFunction,
  unknown,
  integer,
  always,
  withDefault,
  regex,
  objectOf,
  bigint,
  nonEmptyArray,
  missing,
  lazy,
  safeDecode,
} from '../src';

let n = 0;
expectType<number>(n);

type rec_t = {
  data: string;
  value: number;
  rec: { more: boolean };
  f: string;
  option?: string;
  list_of_stuff: (string | boolean)[];
  intersect: { a: number; c: boolean } | { a: 'foo'; b: number; c: boolean };
};
const rec_decoder = record({
  data: string,
  value: number,
  rec: { more: boolean },
  f: fields({ data: string, value: number }).map(({ data, value }) => data + value),
  option: optional(string),
  list_of_stuff: array(union(string, boolean)),
  intersect: intersection(union({ a: number }, { a: string, b: number }), {
    c: boolean,
    a: union(number, decoder('foo')),
  }),
});
expectAssignable<Decoder<rec_t>>(rec_decoder);
expectType<rec_t>(
  rec_decoder({
    data: '',
    value: 0,
    rec: { more: true },
    option: 'yes',
    intersect: { a: 'foo' },
  }),
);

let union_decoder = union(string, number, record({}));
expectType<string | number | {}>(union_decoder('test'));

let intersection_decoder = intersection(
  { a: string },
  { a: literal('foo'), b: number },
);
expectAssignable<{ a: 'foo'; b: number }>(intersection_decoder({ a: 'foo' }));
expectAssignable<{ a: 'foo' }>(intersection_decoder({ a: 'foo' }));

expectAssignable<{ a: string; b: number }>(
  intersection({ a: string }, { b: number })({}),
);
expectAssignable<number | undefined>(
  intersection(optional(number), optional(number))(null),
);
expectAssignable<number | null>(
  intersection(nullable(number), nullable(number))(null),
);

let optional_decoder = optional(union(string, number));
expectType<string | number | undefined>(optional_decoder(''));

let discriminated_rec_decoder = union(
  { discriminant: literal('one') },
  { discriminant: literal('two'), data: string },
);
expectType<{ discriminant: 'one' } | { discriminant: 'two'; data: string }>(
  discriminated_rec_decoder({ discriminant: 'one' }),
);

let discriminated_tuple_decoder = union(
  tuple('one', number),
  tuple('two', string),
  tuple('three', { data: string }),
);
let discriminated_tuple_decoder_2 = union(
  ['one' as const, number],
  ['two' as const, string],
  ['three' as const, { data: string }],
);
let discriminated_tuple_decoder_3 = union(
  [literal('one'), number],
  [literal('two'), string],
  [literal('three'), { data: string }],
);
type expected_discriminated_tuple_t =
  | ['one', number]
  | ['two', string]
  | ['three', { data: string }];
expectType<expected_discriminated_tuple_t>(
  discriminated_tuple_decoder(['one', 1]),
);
expectType<expected_discriminated_tuple_t>(
  discriminated_tuple_decoder_2(['one', 1]),
);
expectType<expected_discriminated_tuple_t>(
  discriminated_tuple_decoder_3(['one', 1]),
);

const a_or_b_literal_decoder = union('a', 'b');
expectType<'a' | 'b'>(a_or_b_literal_decoder('a'));

const a_or_b_decoder = union(literal('a'), literal('b'));
expectType<'a' | 'b'>(a_or_b_decoder('a'));

const a_b_or_r_decoder = union('a', 'b', { test: string });
expectType<'a' | 'b' | { test: string }>(a_b_or_r_decoder({ test: '' }));

expectType<Decoder<Map<string, number>>>(dict(number));
expectType<Decoder<Map<'small' | 'medium', number>>>(
  dict(number, ['small', 'medium']),
);

// unknown decoder should resolve to `unknown`
expectType<unknown>(unknown('anything'));
expectType<unknown>(unknown(42));
expectType<unknown>(unknown(null));
expectAssignable<DecoderFunction<unknown>>(unknown);

// integer decoder should resolve to `number`
expectType<number>(integer(42));
expectAssignable<DecoderFunction<number>>(integer);

// always decoder should resolve to the constant's exact type (with const type param)
expectType<false>(always(false)('anything'));
expectType<'hello'>(always('hello')(42));
expectAssignable<DecoderFunction<boolean>>(always(false));
// always as default in union
expectAssignable<DecoderFunction<boolean>>(union(boolean, always(false)));

// safeDecode should return discriminated union result with DecodeError
const safeResult = safeDecode(string, 'hello');
expectType<{ ok: true; value: string } | { ok: false; error: DecodeError }>(safeResult);
if (safeResult.ok) {
  expectType<string>(safeResult.value);
}

// literal() standalone — preserves exact types
expectType<1>(literal(1)(1));
expectType<true>(literal(true)(true));
expectType<1 | 2 | 3>(union(literal(1), literal(2), literal(3))(1));

// --- record: 4 ways to use number/boolean literals ---

// 1. literal() wrapper — exact types preserved
const record_literal_wrap = record({ type: literal('admin'), level: literal(42), active: literal(true), name: string });
expectType<{ type: 'admin'; level: 42; active: true; name: string }>(
  record_literal_wrap({ type: 'admin', level: 42, active: true, name: '' }),
);

// 2. bare literals — TS 5.x with const type parameters preserves all literal types
const record_bare = record({ type: 'admin', level: 42, active: true, name: string });
expectType<{ type: 'admin'; level: 42; active: true; name: string }>(
  record_bare({ type: 'admin', level: 42, active: true, name: '' }),
);

// 3. whole-object `as const` — also preserves all literal types (both work in TS 5.x)
const record_full_const = record({ type: 'admin', level: 42, active: true, name: string } as const);
expectType<{ type: 'admin'; level: 42; active: true; name: string }>(
  record_full_const({ type: 'admin', level: 42, active: true, name: '' }),
);

// 4. edge cases: 0, false, -1 — all preserved by const type parameters
const record_edge = record({ zero: 0, no: false, neg: -1, name: string });
expectType<{ zero: 0; no: false; neg: -1; name: string }>(
  record_edge({ zero: 0, no: false, neg: -1, name: '' }),
);

// 5. nested record with bare literals
const record_nested = record({ name: string, config: record({ level: 42, active: true }) });
expectType<{ name: string; config: { level: 42; active: true } }>(
  record_nested({ name: '', config: { level: 42, active: true } }),
);

// 6. optional/nullable with bare literals
expectAssignable<{ level?: number }>(record({ level: optional(42) })({}));
expectAssignable<{ level: number | null }>(record({ level: nullable(42) })({ level: null }));

// 7. bare number/boolean in nested POJOs (no record() wrapper needed)
const record_nested_bare = record({ name: string, config: { level: 42, active: true, type: 'admin' } });
expectAssignable<{ name: string; config: { level: 42; active: true; type: 'admin' } }>(
  record_nested_bare({ name: '', config: { level: 42, active: true, type: 'admin' } }),
);

// 8. bare POJO with number/boolean via decoder()
const pojo_with_literals = decoder({ level: 42, name: string });
expectAssignable<{ level: 42; name: string }>(
  pojo_with_literals({ level: 42, name: '' }),
);

// --- union, tuple: bare literals as direct args always preserve ---
expectType<1 | 2 | 3>(union(1, 2, 3)(1));
expectType<true | string>(union(true, string)(true));
expectType<1 | 'hello' | boolean>(union(1, 'hello', boolean)(1));
expectType<[42, string]>(tuple(42, string)([42, 'hello']));

// --- type-level tests mirroring runtime combination tests ---

// 9. optional wrapping bare POJO with number/boolean literals
const record_optional_pojo = record({
  name: string,
  config: optional({ level: 42, active: true }),
});
expectAssignable<{ name: string; config?: { level: 42; active: true } }>(
  record_optional_pojo({ name: '', config: { level: 42, active: true } }),
);

// 10. nullable wrapping bare POJO with number/boolean literals
const record_nullable_pojo = record({
  name: string,
  config: nullable({ level: 42, active: true }),
});
expectAssignable<{ name: string; config: { level: 42; active: true } | null }>(
  record_nullable_pojo({ name: '', config: { level: 42, active: true } }),
);

// 11. union of bare POJOs with number/boolean literals
const union_bare_pojo = union(
  { type: 'a', level: 1 },
  { type: 'b', active: true },
);
expectAssignable<{ type: 'a'; level: 1 } | { type: 'b'; active: true }>(
  union_bare_pojo({ type: 'a', level: 1 }),
);

// 12. array of bare POJOs with number/boolean literals
const array_bare_pojo = array({ id: number, active: true });
expectAssignable<{ id: number; active: true }[]>(
  array_bare_pojo([{ id: 1, active: true }]),
);

// 13. deeply nested bare POJOs with mixed literal types
const deeply_nested = record({
  name: string,
  level1: {
    level2: {
      value: 42,
      flag: true,
      tag: 'deep',
    },
  },
});
expectAssignable<{ name: string; level1: { level2: { value: 42; flag: true; tag: 'deep' } } }>(
  deeply_nested({ name: '', level1: { level2: { value: 42, flag: true, tag: 'deep' } } }),
);

// 14. bare literal tuple with number and boolean
const bare_literal_tuple = decoder([42, true]);
expectAssignable<[42, boolean]>(bare_literal_tuple([42, true]));

// 15. record nesting record with optional fields preserves types
const inner_rec = record({ a: optional(string), b: number });
const outer_rec = record({ x: inner_rec, y: string });
expectType<{ x: { a?: string; b: number }; y: string }>(
  outer_rec({ x: { b: 1 }, y: 'hi' }),
);

// 16. intersection of bare POJOs with number literals
const intersect_bare_pojo = intersection(
  { type: 'admin', level: 42 },
  { name: string },
);
expectAssignable<{ type: 'admin'; level: 42; name: string }>(
  intersect_bare_pojo({ type: 'admin', level: 42, name: 'test' }),
);

// --- 17. kitchen sink: bare literals across all combinators ---

// set of bare POJOs with number/boolean literals
const set_bare = set({ id: number, active: true });
expectAssignable<Set<{ id: number; active: true }>>(
  set_bare([{ id: 1, active: true }]),
);

// dict with bare number literal values
const dict_bare = dict(42);
expectAssignable<Map<string, 42>>(dict_bare({ a: 42 }));

// fields with bare number/boolean in schema
const fields_bare = record({
  combined: fields(
    { level: number, active: true },
  ).map(({ level, active }) => `${level}-${active}`),
});
expectType<{ combined: string }>(fields_bare({ level: 5, active: true }));

// always as fallback in union with bare literal POJO
const with_default = union({ status: 'ok', code: 200 }, always({ status: 'error', code: 0 }));
expectAssignable<{ status: 'ok'; code: 200 } | { status: 'error'; code: 0 }>(
  with_default({ status: 'ok', code: 200 }),
);

// union mixing bare literals, decoder functions, and POJOs
const mixed_union = union(42, string, { tag: true });
expectAssignable<number | string | { tag: true }>(mixed_union(42));

// nullable intersection with bare literal POJO
const nullable_intersect = nullable(intersection(
  { type: 'x', level: 42 },
  { name: string },
));
expectAssignable<{ type: 'x'; level: 42; name: string } | null>(
  nullable_intersect({ type: 'x', level: 42, name: 'hi' }),
);

// optional array of bare literal tuples
const opt_array_tuples = optional(array(decoder([number, true])));
expectAssignable<[number, boolean][] | undefined>(
  opt_array_tuples([[1, true]]),
);

// map keyed by field from bare literal POJO
const map_bare = map({ id: number, active: true }, (x: { id: number; active: true }) => x.id);
expectAssignable<Map<number, { id: number; active: true }>>(
  map_bare([{ id: 1, active: true }]),
);

// --- 18. README examples: type-level verification ---

// Config decoder with mixed bare literals
const readme_config = record({
  version: 2,
  env: 'production',
  debug: false,
  name: string,
  retries: number,
});
expectType<{ version: 2; env: 'production'; debug: false; name: string; retries: number }>(
  readme_config({ version: 2, env: 'production', debug: false, name: 'app', retries: 3 }),
);

// literal(42) vs bare 42 — both preserve exact type with TS 5 const type parameters
const readme_literal_wrap = record({ level: literal(42), name: string });
const readme_bare = record({ level: 42, name: string });
expectType<{ level: 42; name: string }>(readme_literal_wrap({ level: 42, name: '' }));
expectType<{ level: 42; name: string }>(readme_bare({ level: 42, name: '' }));

// union of bare number literals
const readme_status_codes = union(200, 404, 500);
expectType<200 | 404 | 500>(readme_status_codes(200));

// union of bare string literals
const readme_directions = union('north', 'south', 'east', 'west');
expectType<'north' | 'south' | 'east' | 'west'>(readme_directions('north'));

// record with unknown field (unknown includes undefined, so the field is optional)
const readme_with_metadata = record({ name: string, metadata: unknown });
expectAssignable<{ name: string; metadata?: unknown }>(
  readme_with_metadata({ name: 'x', metadata: {} }),
);

// missing decoder — key becomes optional undefined in the type
const with_missing = record({ name: string, deleted: missing });
expectType<{ name: string; deleted?: undefined }>(with_missing({ name: 'alice' }));

// always as fallback in union of records — both branches typed
const readme_with_fallback = union(
  record({ status: 'ok', data: string }),
  always({ status: 'error', data: '' }),
);
const readme_fallback_result = readme_with_fallback({ status: 'ok', data: 'hi' });
expectAssignable<{ status: 'ok'; data: string } | { status: 'error'; data: string }>(readme_fallback_result);
// narrowing works: if status is 'ok', data is string; if 'error', data is string
if ('status' in readme_fallback_result && readme_fallback_result.status === 'ok') {
  expectType<string>(readme_fallback_result.data);
}

// Discriminated union with bare string literals
const readme_cool = record({ type: 'cool', somestuff: string });
const readme_dumb = record({ type: 'dumb', otherstuff: string });
const readme_stuff = union(readme_cool, readme_dumb);
expectType<{ type: 'cool'; somestuff: string } | { type: 'dumb'; otherstuff: string }>(
  readme_stuff({ type: 'cool', somestuff: '' }),
);

// Nested bare POJO with mixed literal types
const readme_nested = record({
  name: string,
  config: {
    level: 42,
    active: true,
    env: 'prod',
  },
});
expectAssignable<{ name: string; config: { level: 42; active: true; env: 'prod' } }>(
  readme_nested({ name: '', config: { level: 42, active: true, env: 'prod' } }),
);

// always(null) as fallback — nullable without nullable()
const null_fallback = union(string, always(null));
expectAssignable<string | null>(null_fallback('hello'));

// always(undefined) as fallback — optional without optional()
const undef_fallback = union(number, always(undefined));
expectAssignable<number | undefined>(undef_fallback(42));

// always with primitive fallback in union of bare literals
const literal_with_default = union(200, 404, always(0));
expectAssignable<200 | 404 | number>(literal_with_default(200));

// always with fallback in union of arrays
const array_with_default = union(array(number), always([] as number[]));
expectAssignable<number[]>(array_with_default([1, 2]));

// always with fallback in union of tuples
const tuple_with_default = union(tuple(string, number), always(['unknown', 0] as [string, number]));
expectAssignable<[string, number]>(tuple_with_default(['hello', 42]));

// always with fallback in union of bare POJO
const pojo_with_default = union({ level: 42, name: string }, always({ level: 0, name: 'default' }));
expectAssignable<{ level: number; name: string }>(pojo_with_default({ level: 42, name: 'test' }));

// tagged union with always fallback — different shapes
const tagged_with_fallback = union(
  record({ tag: 'success', data: string }),
  record({ tag: 'error', code: number }),
  always({ tag: 'unknown' }),
);
expectAssignable<
  { tag: 'success'; data: string } | { tag: 'error'; code: number } | { tag: 'unknown' }
>(tagged_with_fallback({ tag: 'success', data: 'hi' }));

// same-shape fallback — record with always providing defaults for same keys
const same_shape_fallback = union(
  record({ status: 'active', score: number }),
  always({ status: 'inactive', score: 0 }),
);
expectAssignable<{ status: 'active'; score: number } | { status: 'inactive'; score: number }>(
  same_shape_fallback({ status: 'active', score: 99 }),
);

// --- withDefault decoder ---

// withDefault with plain decoder — fallback on throw
const wd_string = withDefault(string, 'fallback');
expectType<string>(wd_string('hello'));
expectAssignable<DecoderFunction<string>>(wd_string);

// withDefault with number
const wd_number = withDefault(number, 0);
expectType<number>(wd_number(42));

// withDefault in record — fields get defaults instead of being optional
const wd_record = record({
  name: string,
  role: withDefault(string, 'user'),
  retries: withDefault(number, 3),
});
expectType<{ name: string; role: string; retries: number }>(
  wd_record({ name: 'alice', role: 'admin', retries: 5 }),
);

// withDefault with array
const wd_array = withDefault(array(number), []);
expectType<number[]>(wd_array([1, 2]));

// withDefault preserves nullable — null is a valid decoded value, not stripped
const wd_nullable = withDefault(nullable(number), null);
expectType<number | null>(wd_nullable(42));

// withDefault preserves optional — undefined is a valid decoded value
const wd_optional = withDefault(optional(string), undefined);
expectType<string | undefined>(wd_optional('hello'));

// withDefault with union preserves all union cases
const wd_union = withDefault(union(string, number, nullable(boolean)), null);
expectAssignable<string | number | boolean | null>(wd_union('hello'));

// withDefault with tagged union
const wd_tagged = withDefault(
  union(
    record({ tag: 'ok', data: string }),
    record({ tag: 'err', code: number }),
  ),
  { tag: 'err', code: 0 },
);
expectAssignable<{ tag: 'ok'; data: string } | { tag: 'err'; code: number }>(wd_tagged({}));

// withDefault with nullable in a record
const wd_nullable_rec = record({
  name: string,
  data: withDefault(nullable(number), null),
});
expectAssignable<{ name: string; data: number | null }>(
  wd_nullable_rec({ name: 'a', data: 42 }),
);

// withDefault where fallback type extends the decoder type
const wd_string_null = withDefault(string, null);
expectType<string | null>(wd_string_null('hello'));

const wd_number_na = withDefault(number, 'N/A');
expectType<number | 'N/A'>(wd_number_na(42));

const wd_different_shape = withDefault(record({ name: string }), { error: 'not found' });
expectAssignable<{ name: string } | { error: string }>(wd_different_shape({}));

// --- regex decoder ---
const regex_decoder = regex(/^[^@]+@[^@]+$/);
expectType<string>(regex_decoder('a@b'));
expectAssignable<DecoderFunction<string>>(regex_decoder);

// regex in a record
const regex_record = record({ email: regex(/^[^@]+@[^@]+$/), name: string });
expectType<{ email: string; name: string }>(regex_record({ email: 'a@b', name: 'x' }));

// regex with withDefault — fallback is a string so type stays string
const regex_default = withDefault(regex(/^\d+$/), 'N/A');
expectType<string>(regex_default('123'));

// regex with withDefault — fallback is a different type
const regex_default_null = withDefault(regex(/^\d+$/), null);
expectType<string | null>(regex_default_null('123'));

// --- objectOf decoder ---
const ro_basic = objectOf(number);
expectType<Record<string, number>>(ro_basic({ a: 1 }));

// objectOf with constrained keys
const ro_keys = objectOf(number, ['small', 'medium', 'large']);
expectType<Record<'small' | 'medium' | 'large', number>>(ro_keys({ small: 1 }));

// objectOf with complex value decoder (using record())
const ro_complex = objectOf(record({ name: string, score: number }));
expectAssignable<Record<string, { name: string; score: number }>>(ro_complex({}));

// objectOf with bare POJO value decoder
const ro_bare = objectOf({ name: string, score: number });
expectAssignable<Record<string, { name: string; score: number }>>(ro_bare({}));

// objectOf in a record schema
const ro_nested = record({ name: string, scores: objectOf(number) });
expectType<{ name: string; scores: Record<string, number> }>(
  ro_nested({ name: 'x', scores: { a: 1 } }),
);

// --- field ---
const field_no_cont = record({ name: field('username', string) });
expectType<{ name: string }>(field_no_cont({ username: 'alice' }));

// field with .map()
const field_mapped = record({
  thing: field('nested', { theThingIWant: string }).map(x => x.theThingIWant),
  foo: string,
});
expectType<{ thing: string; foo: string }>(
  field_mapped({ foo: 'bar', nested: { theThingIWant: 'found' } }),
);

const field_doubled = record({
  doubled: field('value', number).map(x => x * 2),
});
expectType<{ doubled: number }>(field_doubled({ value: 21 }));

// --- bigint decoder ---
expectType<bigint>(bigint('123'));
expectAssignable<DecoderFunction<bigint>>(bigint);

// bigint in a record
const bigint_record = record({ name: string, balance: bigint });
expectType<{ name: string; balance: bigint }>(
  bigint_record({ name: 'x', balance: '123' }),
);

// safeDecode returns discriminated union with DecodeError
const readme_safe = safeDecode(string, 'hello');
expectType<{ ok: true; value: string } | { ok: false; error: DecodeError }>(readme_safe);

// --- literal ---
expectType<'admin'>(literal('admin')('admin'));
expectType<42>(literal(42)(42));

// literal with .map()
const lit_upper = literal('admin').map(x => x.toUpperCase());
expectType<string>(lit_upper('admin'));

const lit_inc = literal(42).map(x => x + 1);
expectType<number>(lit_inc(42));

// --- tuple ---

// 2-tuple
expectType<[string, number]>(tuple(string, number)(['a', 1]));

// 3-tuple
expectType<[string, number, boolean]>(tuple(string, number, boolean)(['a', 1, true]));

// 4-tuple
expectType<[string, number, boolean, string]>(tuple(string, number, boolean, string)(['a', 1, true, 'b']));

// 5-tuple
expectType<[string, number, boolean, string, number]>(
  tuple(string, number, boolean, string, number)(['a', 1, true, 'b', 2]),
);

// tuple with bare literals
expectType<[42, string]>(tuple(42, string)([42, 'hello']));

// tuple with .map()
const tuple_mapped = tuple(string, number).map(([name, age]) => ({ name, age }));
expectType<{ name: string; age: number }>(tuple_mapped(['alice', 30]));

// 0-tuple
expectType<[]>(tuple()([]));

// 0-tuple literal form
const empty_tuple = decoder([]);
expectType<[]>(empty_tuple([]));

// 0-tuple in record
const rec_with_unit = record({ unit: decoder([]), data: string });
expectType<{ unit: []; data: string }>(rec_with_unit({ unit: [], data: 'hi' }));

// 0-tuple bare literal form in record
const rec_with_unit2 = record({ unit: [] as [], data: string });
expectType<{ unit: []; data: string }>(rec_with_unit2({ unit: [], data: 'hi' }));

// 1-tuple
expectType<[string]>(tuple(string)(['a']));

// 3-tuple literal form via decoder()
const triple = decoder([string, number, boolean]);
expectType<[string, number, boolean]>(triple(['a', 1, true]));

// 1-tuple literal form
const single = decoder([number]);
expectType<[number]>(single([42]));

// tuple with records inside
const tuple_records = tuple({ name: string }, { city: string });
expectType<[{ name: string }, { city: string }]>(
  tuple_records([{ name: 'alice' }, { city: 'Oslo' }]),
);

// tuple with nested decoders
const tuple_nested = tuple(array(number), optional(string), nullable(boolean));
expectType<[number[], string | undefined, boolean | null]>(
  tuple_nested([[1], undefined, null]),
);

// tuple literal form in record
const rec_with_triple = record({ name: string, point: [number, number, number] });
expectType<{ name: string; point: [number, number, number] }>(
  rec_with_triple({ name: 'x', point: [0, 0, 0] }),
);

// --- array ---
expectType<number[]>(array(number)([1, 2]));

// array with .map()
const array_sum = array(number).map(xs => xs.reduce((a, b) => a + b, 0));
expectType<number>(array_sum([1, 2, 3]));

const array_len = array(string).map(xs => xs.length);
expectType<number>(array_len(['a', 'b']));

// --- lazy ---

// lazy preserves the inner decoder's type
expectType<string>(lazy(() => string)('hello'));

// lazy with record decoder
const lazyRecord = lazy(() => record({ name: string }));
expectType<{ name: string }>(lazyRecord({ name: 'hi' }));

// --- nonEmptyArray ---

// nonEmptyArray returns a non-empty tuple type
expectType<[number, ...number[]]>(nonEmptyArray(number)([1, 2]));

// nonEmptyArray with .map()
const nea_first = nonEmptyArray(number).map(xs => xs[0]);
expectType<number>(nea_first([1, 2]));

// --- optional ---
expectType<string | undefined>(optional(string)('hello'));

// optional with .map()
const opt_upper = optional(string).map(s => s !== undefined ? s.toUpperCase() : undefined);
expectType<string | undefined>(opt_upper('hello'));

// --- nullable ---
expectType<string | null>(nullable(string)('hello'));

// nullable with .map()
const null_upper = nullable(string).map(s => s !== null ? s.toUpperCase() : null);
expectType<string | null>(null_upper('hello'));

// --- set ---
expectAssignable<Set<number>>(set(number)([1, 2]));

// set with .map()
const set_size = set(number).map(s => s.size);
expectType<number>(set_size([1, 2, 3]));

// --- objectOf ---
expectType<Record<string, number>>(objectOf(number)({ a: 1 }));

// objectOf with keys
const oo_keys = objectOf(number, ['x', 'y'] as const);
expectType<Record<'x' | 'y', number>>(oo_keys({ x: 1, y: 2 }));

// objectOf with .map()
const oo_sum = objectOf(number).map(r => Object.values(r).reduce((a: number, b: number) => a + b, 0));
expectType<number>(oo_sum({ a: 1, b: 2 }));

// --- dict ---
expectAssignable<Map<string, number>>(dict(number)({ a: 1 }));

// dict with keys
const dict_keys = dict(number, ['small', 'medium']);
expectType<Map<'small' | 'medium', number>>(dict_keys({ small: 1, medium: 2 }));

// dict with .map()
const dict_size = dict(number).map(m => m.size);
expectType<number>(dict_size({ a: 1 }));

// --- v2: Callable Decoder objects ---

// .map() returns a Decoder with the transformed type
const mapped_string = string.map(s => s.length);
expectType<Decoder<number>>(mapped_string);
expectType<number>(mapped_string('hello'));

// chained .map()
const chained = string.map(s => s.length).map(n => n > 3);
expectType<Decoder<boolean>>(chained);
expectType<boolean>(chained('hello'));

// .map() on record decoder
const record_mapped = record({ name: string, age: number }).map(x => x.name);
expectType<Decoder<string>>(record_mapped);

// .safeDecode() returns discriminated union with DecodeError
const safe = string.safeDecode('hello');
expectType<{ ok: true; value: string } | { ok: false; error: DecodeError }>(safe);

// .safeDecode() on mapped decoder
const safe_mapped = string.map(s => s.length).safeDecode('hello');
expectType<{ ok: true; value: number } | { ok: false; error: DecodeError }>(safe_mapped);

// decoder() wraps to Decoder<T>
const wrapped = decoder((input: unknown) => String(input));
expectType<Decoder<string>>(wrapped);
expectType<string>(wrapped('hello'));

// decoder() wraps literal form
const wrapped_literal = decoder({ name: string, age: number });
expectType<{ name: string; age: number }>(wrapped_literal({ name: '', age: 0 }));

// all combinators return Decoder<T>
expectType<Decoder<string>>(string);
expectType<Decoder<number>>(number);
expectType<Decoder<boolean>>(boolean);
expectType<Decoder<number>>(integer);
expectType<Decoder<Date>>(date);
expectType<Decoder<bigint>>(bigint);
expectType<Decoder<unknown>>(unknown);

// Decoder<T> is assignable to DecoderFunction<T>
expectAssignable<DecoderFunction<string>>(string);
expectAssignable<DecoderFunction<number>>(number);

// --- .chain() types ---

// chain into a record literal form
const chained_record = unknown.chain({ name: string, age: number });
expectType<Decoder<{ name: string; age: number }>>(chained_record);

// chain into a tuple literal form
const chained_tuple = unknown.chain([number, string]);
expectType<Decoder<[number, string]>>(chained_tuple);

// chain into a decoder
const chained_decoder = string.chain(bigint);
expectType<Decoder<bigint>>(chained_decoder);

// chain into a string literal
const chained_literal = unknown.chain('ok');
expectType<Decoder<'ok'>>(chained_literal);

// .default() returns DefaultDecoder which extends Decoder
const string_with_default = string.default('John');
expectType<DefaultDecoder<string>>(string_with_default);
expectAssignable<Decoder<string>>(string_with_default);

// .map() on DefaultDecoder preserves default
const mapped_default = string.default('John').map(s => s.length);
expectType<DefaultDecoder<number>>(mapped_default);

// .create() returns T
expectType<string>(string_with_default.create());
expectType<string>(string.create('hello'));

// record .create() enforces required fields
const user_dec = record({ name: string.default('John'), age: integer });
expectType<{ name: string; age: number }>(user_dec.create({ age: 25 }));

// record with all defaults: .create() needs no args
const all_defaults = record({ name: string.default('John'), role: always('member') });
expectType<{ name: string; role: 'member' }>(all_defaults.create());

// nested record: fully-defaulted inner is auto-optional
const inner_dec = record({ city: string.default('X'), zip: string.default('0') });
const outer_dec = record({ name: string.default('N'), addr: inner_dec });
expectType<{ name: string; addr: { city: string; zip: string } }>(outer_dec.create());

// nested record: inner with required fields appears in patch
const inner_req = record({ city: string.default('X'), zip: string });
const outer_req = record({ name: string.default('N'), addr: inner_req });
expectType<{ name: string; addr: { city: string; zip: string } }>(outer_req.create({ addr: { zip: '1' } }));

// literal() returns DefaultDecoder
expectType<DefaultDecoder<'admin'>>(literal('admin'));
expectType<DefaultDecoder<42>>(literal(42));
expectType<DefaultDecoder<true>>(literal(true));
expectAssignable<Decoder<'admin'>>(literal('admin'));

// record with literal fields: all-default, .create() needs no args
const lit_rec = record({ type: literal('event'), version: literal(2) });
expectType<{ type: 'event'; version: 2 }>(lit_rec.create());

// bare literals in record are also defaulted — no literal() or as const needed
const bare_lit_rec = record({ type: 'user', name: string.default('Alice') });
expectType<{ type: 'user'; name: string }>(bare_lit_rec.create());

// all bare literals: .create() needs no args
const all_bare = record({ kind: 'event', version: 2, active: true });
expectType<{ kind: 'event'; version: 2; active: true }>(all_bare.create());

// mixed: bare literal + required field — patch requires only the non-literal
const mixed_bare = record({ type: 'item', name: string });
expectType<{ type: 'item'; name: string }>(mixed_bare.create({ name: 'x' }));

// bare tuple with all-defaulted elements: auto-defaults in record
const tuple_defaulted_rec = record({
  pair: [number.default(0), string.default('x')],
  label: string.default('test'),
});
expectType<{ pair: [number, string]; label: string }>(tuple_defaulted_rec.create());

// bare tuple with bare literals: auto-defaults in record
const tuple_lit_rec = record({ tag: ['event', 42], name: string.default('x') });
expectType<{ tag: ['event', 42]; name: string }>(tuple_lit_rec.create());

// ============================================================
// Decoder() class API
// ============================================================

// Decoder() with record: decoded value is the record type
class TypeUser extends Decoder(record({ name: string, age: number })) {}
expectType<{ name: string; age: number }>(TypeUser.decode({} as unknown));
expectType<{ name: string; age: number }>(new TypeUser({} as unknown));

// Plain objects are assignable to the class type (structural typing)
const type_user_plain: TypeUser = { name: 'Alice', age: 30 };
expectType<TypeUser>(type_user_plain);

// Decoder() with record: schema-aware .create()
class TypeUserWithDefaults extends Decoder(record({
  name: string.default('John'),
  age: integer,
  role: always('member'),
})) {}
// age is required, name/role are optional
expectType<{ name: string; age: number; role: 'member' }>(TypeUserWithDefaults.create({ age: 25 }));
// all defaults: no patch needed
class TypeAllDefaults extends Decoder(record({
  name: string.default('x'),
  active: always(true),
})) {}
expectType<{ name: string; active: true }>(TypeAllDefaults.create());

// Decoder() with tuple
class TypePair extends Decoder(tuple(string, number)) {}
expectType<[string, number]>(TypePair.decode({} as unknown));

// Decoder() with array
class TypeNames extends Decoder(array(string)) {}
expectType<string[]>(TypeNames.decode({} as unknown));

// Decoder() safeDecode returns the right result type
const type_safe = TypeUser.safeDecode({} as unknown);
if (type_safe.ok) {
  expectType<{ name: string; age: number }>(type_safe.value);
} else {
  expectType<DecodeError>(type_safe.error);
}

// Decoder() with record: missing required field is a type error
// @ts-expect-error — age is required
TypeUserWithDefaults.create();
// @ts-expect-error — age has wrong type
TypeUserWithDefaults.create({ age: 'bad' });

// Decoder() with plain schema (literal form, no record() needed)
class TypePlainUser extends Decoder({ name: string, age: number }) {}
expectType<{ name: string; age: number }>(TypePlainUser.decode({} as unknown));
const type_plain_user: TypePlainUser = { name: 'Alice', age: 30 };
expectType<TypePlainUser>(type_plain_user);

// Decoder() with plain schema: schema-aware create
class TypePlainDefaults extends Decoder({
  name: string.default('John'),
  age: integer,
  role: always('member'),
}) {}
expectType<{ name: string; age: number; role: 'member' }>(TypePlainDefaults.create({ age: 25 }));
// @ts-expect-error — age is required
TypePlainDefaults.create();

// Decoder() with tuple literal form
class TypeTuplePair extends Decoder([string, number]) {}
expectType<[string, number]>(TypeTuplePair.decode({} as unknown));

// Decoder() with bare literal in tuple
class TypeTaggedTuple extends Decoder(['text', string]) {}
expectType<['text', string]>(TypeTaggedTuple.decode({} as unknown));

// Decoder() with bare literal in record schema
class TypeBareEvent extends Decoder({ type: 'click', x: number, y: number }) {}
expectType<{ type: 'click'; x: number; y: number }>(TypeBareEvent.decode({} as unknown));
// type auto-defaults, so only x and y are required
expectType<{ type: 'click'; x: number; y: number }>(TypeBareEvent.create({ x: 1, y: 2 }));

// Decoder works as both a type and a value in the same file
const dual_dec: Decoder<string> = string;
class DualUser extends Decoder({ name: string, age: number }) {}
expectType<Decoder<string>>(dual_dec);
expectType<{ name: string; age: number }>(DualUser.decode({} as unknown));
const dual_plain: DualUser = { name: 'x', age: 0 };
expectType<DualUser>(dual_plain);

// Decoder() with optional fields: type has clean `?:` without `| undefined`
class TypeOptUser extends Decoder({ name: string, nickname: optional(string) }) {}
expectType<{ name: string; nickname?: string }>(TypeOptUser.decode({} as unknown));
const type_opt_user: TypeOptUser = { name: 'Alice' };
expectType<TypeOptUser>(type_opt_user);
const type_opt_user2: TypeOptUser = { name: 'Alice', nickname: 'Ali' };
expectType<TypeOptUser>(type_opt_user2);
