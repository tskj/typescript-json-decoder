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
