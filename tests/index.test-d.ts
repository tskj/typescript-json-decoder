import { expectAssignable, expectType } from 'tsd';
import {
  boolean,
  Decoder,
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
  decode,
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
  transform,
  safeDecode,
} from '../src';

let n = 0;
expectType<number>(n);

type rec_t = {
  data: string;
  value: number;
  rec: { more: boolean };
  f: string;
  option?: string | undefined;
  list_of_stuff: (string | boolean)[];
  intersect: { a: number; c: boolean } | { a: 'foo'; b: number; c: boolean };
};
const rec_decoder = record({
  data: string,
  value: number,
  rec: { more: boolean },
  f: fields({ data: string, value: number }, ({ data, value }) => data + value),
  option: optional(string),
  list_of_stuff: array(union(string, boolean)),
  intersect: intersection(union({ a: number }, { a: string, b: number }), {
    c: boolean,
    a: union(number, decode('foo')),
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

expectType<DecoderFunction<Map<string, number>>>(dict(number));
expectType<DecoderFunction<Map<'small' | 'medium', number>>>(
  dict(number, ['small', 'medium'] as const),
);

// unknown decoder should resolve to `unknown`
expectType<unknown>(unknown('anything'));
expectType<unknown>(unknown(42));
expectType<unknown>(unknown(null));
expectAssignable<DecoderFunction<unknown>>(unknown);

// integer decoder should resolve to `number`
expectType<number>(integer(42));
expectAssignable<DecoderFunction<number>>(integer);

// always decoder should resolve to the constant's type
expectType<boolean>(always(false)('anything'));
expectType<string>(always('hello')(42));
expectAssignable<DecoderFunction<boolean>>(always(false));
// always as default in union
expectAssignable<DecoderFunction<boolean>>(union(boolean, always(false)));

// safeDecode should return discriminated union result
const safeResult = safeDecode(string, 'hello');
expectType<{ ok: true; value: string } | { ok: false; error: string }>(safeResult);
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

// 2. bare literals — TS 4.x widens numbers to `number`, booleans stay exact (boolean = true | false)
const record_bare = record({ type: 'admin' as const, level: 42, active: true, name: string });
expectType<{ type: 'admin'; level: number; active: true; name: string }>(
  record_bare({ type: 'admin', level: 42, active: true, name: '' }),
);

// 3. per-property `as const` — preserves number literal types
const record_per_const = record({ type: 'admin' as const, level: 42 as const, active: true, name: string });
expectType<{ type: 'admin'; level: 42; active: true; name: string }>(
  record_per_const({ type: 'admin', level: 42, active: true, name: '' }),
);

// 4. whole-object `as const` — preserves all literal types
const record_full_const = record({ type: 'admin', level: 42, active: true, name: string } as const);
expectType<{ type: 'admin'; level: 42; active: true; name: string }>(
  record_full_const({ type: 'admin', level: 42, active: true, name: '' }),
);

// 5. edge cases: 0, false, -1
const record_edge = record({ zero: 0, no: false, neg: -1 as const, name: string });
expectType<{ zero: number; no: false; neg: -1; name: string }>(
  record_edge({ zero: 0, no: false, neg: -1, name: '' }),
);

// 6. nested record with bare literals
const record_nested = record({ name: string, config: record({ level: 42 as const, active: true }) });
expectType<{ name: string; config: { level: 42; active: true } }>(
  record_nested({ name: '', config: { level: 42, active: true } }),
);

// 7. optional/nullable with bare literals
expectAssignable<{ level?: number }>(record({ level: optional(42) })({}));
expectAssignable<{ level: number | null }>(record({ level: nullable(42) })({ level: null }));

// 8. bare number/boolean in nested POJOs (no record() wrapper needed)
const record_nested_bare = record({ name: string, config: { level: 42, active: true, type: 'admin' as const } });
expectAssignable<{ name: string; config: { level: number; active: true; type: 'admin' } }>(
  record_nested_bare({ name: '', config: { level: 42, active: true, type: 'admin' } }),
);

// 9. bare POJO with number/boolean via decode()
const pojo_with_literals = decode({ level: 42, name: string });
expectAssignable<{ level: number; name: string }>(
  pojo_with_literals({ level: 42, name: '' }),
);

// --- union, tuple: bare literals as direct args always preserve ---
expectType<1 | 2 | 3>(union(1, 2, 3)(1));
expectType<true | string>(union(true, string)(true));
expectType<1 | 'hello' | boolean>(union(1, 'hello' as const, boolean)(1));
expectType<[42, string]>(tuple(42, string)([42, 'hello']));

// --- type-level tests mirroring runtime combination tests ---

// 10. optional wrapping bare POJO with number/boolean literals
const record_optional_pojo = record({
  name: string,
  config: optional({ level: 42, active: true }),
});
expectAssignable<{ name: string; config?: { level: number; active: true } }>(
  record_optional_pojo({ name: '', config: { level: 42, active: true } }),
);

// 11. nullable wrapping bare POJO with number/boolean literals
const record_nullable_pojo = record({
  name: string,
  config: nullable({ level: 42, active: true }),
});
expectAssignable<{ name: string; config: { level: number; active: true } | null }>(
  record_nullable_pojo({ name: '', config: { level: 42, active: true } }),
);

// 12. union of bare POJOs with number/boolean literals
const union_bare_pojo = union(
  { type: 'a' as const, level: 1 },
  { type: 'b' as const, active: true },
);
expectAssignable<{ type: 'a'; level: number } | { type: 'b'; active: true }>(
  union_bare_pojo({ type: 'a', level: 1 }),
);

// 13. array of bare POJOs with number/boolean literals
const array_bare_pojo = array({ id: number, active: true });
expectAssignable<{ id: number; active: true }[]>(
  array_bare_pojo([{ id: 1, active: true }]),
);

// 14. deeply nested bare POJOs with mixed literal types
const deeply_nested = record({
  name: string,
  level1: {
    level2: {
      value: 42,
      flag: true,
      tag: 'deep' as const,
    },
  },
});
expectAssignable<{ name: string; level1: { level2: { value: number; flag: true; tag: 'deep' } } }>(
  deeply_nested({ name: '', level1: { level2: { value: 42, flag: true, tag: 'deep' } } }),
);

// 15. bare literal tuple with number and boolean
const bare_literal_tuple = decode([42, true]);
expectAssignable<[number, boolean]>(bare_literal_tuple([42, true]));

// 16. record nesting record with optional fields preserves types
const inner_rec = record({ a: optional(string), b: number });
const outer_rec = record({ x: inner_rec, y: string });
expectType<{ x: { a?: string | undefined; b: number }; y: string }>(
  outer_rec({ x: { b: 1 }, y: 'hi' }),
);

// 17. intersection of bare POJOs with number literals
const intersect_bare_pojo = intersection(
  { type: 'admin' as const, level: 42 },
  { name: string },
);
expectAssignable<{ type: 'admin'; level: number; name: string }>(
  intersect_bare_pojo({ type: 'admin', level: 42, name: 'test' }),
);

// --- 18. kitchen sink: bare literals across all combinators ---

// set of bare POJOs with number/boolean literals
const set_bare = set({ id: number, active: true });
expectAssignable<Set<{ id: number; active: true }>>(
  set_bare([{ id: 1, active: true }]),
);

// dict with bare number literal values
const dict_bare = dict(42);
expectAssignable<Map<string, number>>(dict_bare({ a: 42 }));

// fields with bare number/boolean in schema
const fields_bare = record({
  combined: fields(
    { level: number, active: true },
    ({ level, active }) => `${level}-${active}`,
  ),
});
expectType<{ combined: string }>(fields_bare({ level: 5, active: true }));

// always as fallback in union with bare literal POJO
const with_default = union({ status: 'ok' as const, code: 200 }, always({ status: 'error' as const, code: 0 }));
expectAssignable<{ status: 'ok'; code: number } | { status: 'error'; code: number }>(
  with_default({ status: 'ok', code: 200 }),
);

// union mixing bare literals, decoder functions, and POJOs
const mixed_union = union(42, string, { tag: true });
expectAssignable<number | string | { tag: true }>(mixed_union(42));

// nullable intersection with bare literal POJO
const nullable_intersect = nullable(intersection(
  { type: 'x' as const, level: 42 },
  { name: string },
));
expectAssignable<{ type: 'x'; level: number; name: string } | null>(
  nullable_intersect({ type: 'x', level: 42, name: 'hi' }),
);

// optional array of bare literal tuples
const opt_array_tuples = optional(array(decode([number, true])));
expectAssignable<[number, boolean][] | undefined>(
  opt_array_tuples([[1, true]]),
);

// map keyed by field from bare literal POJO
const map_bare = map({ id: number, active: true }, (x: { id: number; active: true }) => x.id);
expectAssignable<Map<number, { id: number; active: true }>>(
  map_bare([{ id: 1, active: true }]),
);

// --- 19. README examples: type-level verification ---

// Config decoder with mixed bare literals
const readme_config = record({
  version: 2,
  env: 'production' as const,
  debug: false,
  name: string,
  retries: number,
});
expectType<{ version: number; env: 'production'; debug: false; name: string; retries: number }>(
  readme_config({ version: 2, env: 'production', debug: false, name: 'app', retries: 3 }),
);

// literal(42) vs 42 as const vs bare 42 — type differences
const readme_literal_wrap = record({ level: literal(42), name: string });
const readme_as_const = record({ level: 42 as const, name: string });
const readme_bare = record({ level: 42, name: string });
expectType<{ level: 42; name: string }>(readme_literal_wrap({ level: 42, name: '' }));
expectType<{ level: 42; name: string }>(readme_as_const({ level: 42, name: '' }));
expectType<{ level: number; name: string }>(readme_bare({ level: 42, name: '' }));

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

// always as fallback in union of records — both branches typed
const readme_with_fallback = union(
  record({ status: 'ok' as const, data: string }),
  always({ status: 'error' as const, data: '' }),
);
const readme_fallback_result = readme_with_fallback({ status: 'ok', data: 'hi' });
expectAssignable<{ status: 'ok'; data: string } | { status: 'error'; data: string }>(readme_fallback_result);
// narrowing works: if status is 'ok', data is string; if 'error', data is string
if ('status' in readme_fallback_result && readme_fallback_result.status === 'ok') {
  expectType<string>(readme_fallback_result.data);
}

// Discriminated union with bare string literals
const readme_cool = record({ type: 'cool' as const, somestuff: string });
const readme_dumb = record({ type: 'dumb' as const, otherstuff: string });
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
    env: 'prod' as const,
  },
});
expectAssignable<{ name: string; config: { level: number; active: true; env: 'prod' } }>(
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
  record({ tag: 'success' as const, data: string }),
  record({ tag: 'error' as const, code: number }),
  always({ tag: 'unknown' as const }),
);
expectAssignable<
  { tag: 'success'; data: string } | { tag: 'error'; code: number } | { tag: 'unknown' }
>(tagged_with_fallback({ tag: 'success', data: 'hi' }));

// same-shape fallback — record with always providing defaults for same keys
const same_shape_fallback = union(
  record({ status: 'active' as const, score: number }),
  always({ status: 'inactive' as const, score: 0 }),
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
    record({ tag: 'ok' as const, data: string }),
    record({ tag: 'err' as const, code: number }),
  ),
  { tag: 'err' as const, code: 0 },
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

const wd_number_na = withDefault(number, 'N/A' as const);
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
const ro_keys = objectOf(number, ['small', 'medium', 'large'] as const);
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

// --- field with continuation ---
const field_cont = record({
  thing: field('nested', { theThingIWant: string }, x => x.theThingIWant),
  foo: string,
});
expectType<{ thing: string; foo: string }>(
  field_cont({ foo: 'bar', nested: { theThingIWant: 'found' } }),
);

const field_transform = record({
  doubled: field('value', number, x => x * 2),
});
expectType<{ doubled: number }>(field_transform({ value: 21 }));

// field without continuation — preserves decoded type
const field_no_cont = record({ name: field('username', string) });
expectType<{ name: string }>(field_no_cont({ username: 'alice' }));

// --- bigint decoder ---
expectType<bigint>(bigint('123'));
expectAssignable<DecoderFunction<bigint>>(bigint);

// bigint in a record
const bigint_record = record({ name: string, balance: bigint });
expectType<{ name: string; balance: bigint }>(
  bigint_record({ name: 'x', balance: '123' }),
);

// safeDecode returns discriminated union
const readme_safe = safeDecode(string, 'hello');
expectType<{ ok: true; value: string } | { ok: false; error: string }>(readme_safe);

// --- transform ---

// transform with primitive decoder
const transform_num = transform(number, x => x * 2);
expectType<number>(transform_num(21));

// transform with record decoder
const transform_rec = transform(
  { name: string, age: number },
  x => `${x.name} is ${x.age}`,
);
expectType<string>(transform_rec({ name: 'alice', age: 30 }));

// transform with union
const transform_union = transform(union(string, number), x => String(x));
expectType<string>(transform_union('hello'));

// --- literal with continuation ---

const lit_cont_str = literal('admin', x => x.toUpperCase());
expectType<string>(lit_cont_str('admin'));

const lit_cont_num = literal(42, x => x + 1);
expectType<number>(lit_cont_num(42));

const lit_cont_bool = literal(true, x => (x ? 'yes' : 'no'));
expectType<'yes' | 'no'>(lit_cont_bool(true));

// literal without continuation — still preserves exact type
expectType<'admin'>(literal('admin')('admin'));
expectType<42>(literal(42)(42));

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

// tuple with transform (replaces inline continuation)
const tuple_transformed = transform(tuple(string, number), ([name, age]) => ({ name, age }));
expectType<{ name: string; age: number }>(tuple_transformed(['alice', 30]));

// 1-tuple
expectType<[string]>(tuple(string)(['a']));

// 3-tuple literal form via decode()
const triple = decode([string, number, boolean]);
expectType<[string, number, boolean]>(triple(['a', 1, true]));

// 1-tuple literal form
const single = decode([number]);
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

// --- array with continuation ---

const array_cont = array(number, xs => xs.reduce((a, b) => a + b, 0));
expectType<number>(array_cont([1, 2, 3]));

const array_cont_len = array(string, xs => xs.length);
expectType<number>(array_cont_len(['a', 'b']));

// array without continuation — preserves array type
expectType<number[]>(array(number)([1, 2]));

// --- optional with continuation ---

const opt_cont = optional(string, s => s.toUpperCase());
expectType<string | undefined>(opt_cont('hello'));
expectType<string | undefined>(opt_cont(undefined));

// optional without continuation — unchanged
expectType<string | undefined>(optional(string)('hello'));

// --- nullable with continuation ---

const null_cont = nullable(string, s => s.toUpperCase());
expectType<string | null>(null_cont('hello'));
expectType<string | null>(null_cont(null));

// nullable without continuation — unchanged
expectType<string | null>(nullable(string)('hello'));

// --- set with continuation ---

const set_cont = set(number, s => s.size);
expectType<number>(set_cont([1, 2, 3]));

// set without continuation — unchanged
expectAssignable<Set<number>>(set(number)([1, 2]));

// --- objectOf with continuation ---

const oo_cont = objectOf(number, (r: Record<string, number>) => Object.keys(r).length);
expectType<number>(oo_cont({ a: 1, b: 2 }));

// objectOf with keys and continuation
const oo_keys_cont = objectOf(number, ['x', 'y'] as const, r => r.x + r.y);
expectType<number>(oo_keys_cont({ x: 1, y: 2 }));

// objectOf without continuation — unchanged
expectType<Record<string, number>>(objectOf(number)({ a: 1 }));

// --- dict with continuation ---

const dict_cont = dict(number, m => m.size);
expectType<number>(dict_cont({ a: 1 }));

// dict with keys and continuation
const dict_keys_cont = dict(string, ['a', 'b'] as const, m => Array.from(m.values()));
expectType<string[]>(dict_keys_cont({ a: 'x', b: 'y' }));

// dict without continuation — unchanged
expectAssignable<Map<string, number>>(dict(number)({ a: 1 }));
