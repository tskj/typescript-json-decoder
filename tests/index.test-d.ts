import { expectAssignable, expectType } from 'tsd';
import {
  boolean,
  Decoder,
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
