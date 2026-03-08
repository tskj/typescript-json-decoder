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

// literal number and boolean decoders
expectType<1>(literal(1)(1));
expectType<true>(literal(true)(true));
expectType<1 | 2 | 3>(union(literal(1), literal(2), literal(3))(1));

// record with literal() wrapper for numbers and booleans
const literal_record_decoder = record({ type: literal('admin'), level: literal(42), active: literal(true), name: string });
expectType<{ type: 'admin'; level: 42; active: true; name: string }>(
  literal_record_decoder({ type: 'admin', level: 42, active: true, name: '' }),
);

// bare number and boolean literals in record (without literal() wrapper)
// Note: TS 4.x widens bare number literals to `number` in generic inference;
// booleans preserve (true/false) because boolean = true | false union.
// Use `as const` or `literal()` for exact number literal types.
const bare_literal_record = record({ type: 'admin' as const, level: 42, active: true, name: string });
expectType<{ type: 'admin'; level: number; active: true; name: string }>(
  bare_literal_record({ type: 'admin', level: 42, active: true, name: '' }),
);

// with `as const`, number literals are preserved
const bare_literal_record_const = record({ type: 'admin' as const, level: 42 as const, active: true, name: string });
expectType<{ type: 'admin'; level: 42; active: true; name: string }>(
  bare_literal_record_const({ type: 'admin', level: 42, active: true, name: '' }),
);

// with whole-object `as const`, all literals are preserved
const bare_literal_record_full_const = record({ type: 'admin', level: 42, active: true, name: string } as const);
expectType<{ type: 'admin'; level: 42; active: true; name: string }>(
  bare_literal_record_full_const({ type: 'admin', level: 42, active: true, name: '' }),
);

// bare number literals in union (preserved as direct args)
const bare_number_union = union(1, 2, 3);
expectType<1 | 2 | 3>(bare_number_union(1));

// bare boolean in union
const bare_bool_union = union(true, string);
expectType<true | string>(bare_bool_union(true));

// bare number literal in tuple (preserved as direct args)
const bare_tuple = tuple(42, string);
expectType<[42, string]>(bare_tuple([42, 'hello']));

// mixed: bare literals with decoders in union
const mixed_union = union(1, 'hello' as const, boolean);
expectType<1 | 'hello' | boolean>(mixed_union(1));
