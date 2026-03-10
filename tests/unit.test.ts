import {
  decoder,
  boolean,
  decodeType,
  safeDecode,
  DecodeError,
  number,
  string,
  tuple,
  literal,
  record,
  undef,
  nil,
  field,
  fields,
  union,
  date,
  optional,
  array,
  set,
  map,
  dict,
  nullable,
  intersection,
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
  at,
  Decoder,
  DefaultDecoder,
} from '../src';

test('homogeneous tuple', () => {
  const t: [string, string] = ['a', 'b'];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = tuple(string, string);

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('heterogeneous tuple', () => {
  const t: [string, number] = ['a', 0];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = tuple(string, number);

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('homogeneous tuple literal', () => {
  const t: [string, string] = ['a', 'aa'];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = decoder([string, string]);

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('heterogeneous tuple literal', () => {
  const t: [string, number] = ['a', 1];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = decoder([string, number]);

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('nested tuple', () => {
  const t: [string, [string, string]] = ['a', ['b', 'c']];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = decoder(tuple(string, tuple(string, string)));

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('nested tuple literal', () => {
  const t: [string, [string, string]] = ['a', ['b', 'c']];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = decoder([string, [string, string]]);

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('literal string', () => {
  const l1: 'a' = 'a';

  type literal = decodeType<typeof literal_decoder>;
  const literal_decoder = literal(l1);

  expect<literal>(literal_decoder(l1)).toEqual(l1);
  expect(() => literal_decoder('b')).toThrow();
});

test('literal number', () => {
  const l1: 1 = 1;

  type literal = decodeType<typeof literal_decoder>;
  const literal_decoder = literal(1);

  expect<literal>(literal_decoder(l1)).toEqual(l1);
  expect(() => literal_decoder(2)).toThrow();
});

test('literal boolean', () => {
  type literal = decodeType<typeof literal_decoder>;
  const literal_decoder = literal(true);

  expect<literal>(literal_decoder(true)).toEqual(true);
  expect(() => literal_decoder(false)).toThrow();
  expect(() => literal_decoder('true')).toThrow();
});

test('literal number union with literal()', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = union(literal(1), literal(2), literal(3));

  expect<decoderType>(decoder(1)).toEqual(1);
  expect<decoderType>(decoder(2)).toEqual(2);
  expect<decoderType>(decoder(3)).toEqual(3);
  expect(() => decoder(4)).toThrow();
  expect(() => decoder('1')).toThrow();
});

test('mixed literal union', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = union('on', 'off', literal(0), literal(1), literal(true), literal(false));

  expect<decoderType>(decoder('on')).toEqual('on');
  expect<decoderType>(decoder('off')).toEqual('off');
  expect<decoderType>(decoder(0)).toEqual(0);
  expect<decoderType>(decoder(1)).toEqual(1);
  expect<decoderType>(decoder(true)).toEqual(true);
  expect<decoderType>(decoder(false)).toEqual(false);
  expect(() => decoder('yes')).toThrow();
  expect(() => decoder(2)).toThrow();
  expect(() => decoder(null)).toThrow();
});

test('record with literal() wrapper', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = record({
    type: literal('admin'),
    level: literal(42),
    active: literal(true),
    name: string,
  });

  expect<decoderType>(
    decoder({ type: 'admin', level: 42, active: true, name: 'Alice' }),
  ).toEqual({ type: 'admin', level: 42, active: true, name: 'Alice' });
  expect(() =>
    decoder({ type: 'user', level: 42, active: true, name: 'Alice' }),
  ).toThrow();
});

test('literal string union', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = union('a', 'b');

  expect<decoderType>(decoder('a')).toEqual('a');
  expect<decoderType>(decoder('b')).toEqual('b');
  expect(() => decoder('c')).toThrow();
});

test('literal literal string union', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = union(literal('a'), literal('b'));

  expect<decoderType>(decoder('a')).toEqual('a');
  expect<decoderType>(decoder('b')).toEqual('b');
  expect(() => decoder('c')).toThrow();
});

test('record intersection', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = intersection(
    record({a: union('foo', 'bar'), b: nullable(string)}),
    record({a: union('bar', 'baz'), b: string, c: optional(number)})
  );

  expect<decoderType>(decoder({a: 'bar', b: 'str'})).toEqual({a: 'bar', b: 'str'});
  expect(() => decoder({a: 'bar', b: null})).toThrow();
})

test('union intersection', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = intersection(
    union('foo', 'bar', 'baz'),
    union('bar', 'baz', number),
    union('baz', boolean, 'foo')
  )

  expect<decoderType>(decoder('baz')).toEqual('baz');
  expect(() => decoder('foo')).toThrow();
})

test('same props intersection', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = intersection(
    record({a: string}),
    record({a: field('a', a => string(a).toUpperCase())}),
  );

  expect<decoderType>(decoder({a: 'FOO'})).toEqual({a: 'FOO'});
  expect(() => decoder({a: 'Foo'})).toThrow();
})

test('deep intersection', () => {
  type decoderType = decodeType<typeof decoder>;
  const decoder = intersection(
    record({a: string, b: {c: number, d: boolean}, e: {}}),
    record({b: {d: boolean, f: nil}, g: number}),
  );

  expect<decoderType>(decoder({a: 'foo', b: {c: 42, d: false, f: null}, e: {}, g: 53, h: 'discard'}))
    .toEqual({ a: 'foo', b: { c: 42, d: false, f: null }, e: {}, g: 53 });
  expect(() => decoder({a: 'foo', b: {c: 42, d: false, f: null}, e: {}, h: 'discard'})).toThrow();
})

test('decode string', () => {
  const l1: 'a' = 'a';

  type literal = decodeType<typeof literal_decoder>;
  const literal_decoder = decoder(l1);

  expect<literal>(literal_decoder(l1)).toEqual(l1);
  expect(() => literal_decoder('b')).toThrow();
});

test('decode record', () => {
  const l1: {} = {};

  type literal = decodeType<typeof literal_decoder>;
  const literal_decoder = decoder({});

  expect<literal>(literal_decoder(l1)).toEqual(l1);
  expect(() => literal_decoder(null)).toThrow();
});

test('record decoder', () => {
  const l1: {} = {};

  type record = decodeType<typeof record_decoder>;
  const record_decoder = record({});

  expect<record>(record_decoder(l1)).toEqual(l1);
  expect(() => record_decoder(null)).toThrow();
});

test('record decoder with some data', () => {
  const l1 = { str: 'hei', num: 85, bool: true, missing: null };

  type record = decodeType<typeof record_decoder>;
  const record_decoder = record({
    str: string,
    num: number,
    bool: boolean,
    missing: nil,
  });

  expect<record>(record_decoder(l1)).toEqual(l1);
  expect(() => record_decoder({ str: 'hei' })).toThrow();
});

test('record decoder with nested literal data', () => {
  const l1 = { str: 'hei', num: 85, rec: { str: 'dete', data: 'data' } };

  type record = decodeType<typeof record_decoder>;
  const record_decoder = record({
    str: string,
    num: number,
    rec: {
      str: string,
      data: 'data',
    },
  });

  expect<record>(record_decoder(l1)).toEqual(l1);
  expect(() =>
    record_decoder({
      str: 'hei',
      num: 85,
      rec: { str: 'dete', data: 'wrong string' },
    }),
  ).toThrow();
});

test('field decoder', () => {
  const data = 'data';
  const l1 = { f: data };

  type record = decodeType<typeof record_decoder>;
  const record_decoder = record({
    f: field('f', string),
  });

  expect<record>(record_decoder(l1)).toEqual(l1);
  expect(() => record_decoder({ g: 'data' })).toThrow();
});

test('field decoder: rename', () => {
  const data = 'data';
  const l1 = { f: data };

  type record = decodeType<typeof record_decoder>;
  const record_decoder = record({
    g: field('f', string),
  });

  expect<record>(record_decoder(l1)).toEqual({ g: data });
  expect(() => record_decoder({ g: 'data' })).toThrow();
});

test('field decoder: nested', () => {
  const data = 'data';
  const l1 = { data: { f: data } };

  type record = decodeType<typeof record_decoder>;
  const record_decoder = record({
    data: { f: field('f', string) },
  });

  expect<record>(record_decoder(l1)).toEqual(l1);
  expect(() => record_decoder({ g: 'data' })).toThrow();
});

test('fields decoder', () => {
  const data = 'data';
  const l1 = { f: data, g: 0 };

  type record = decodeType<typeof record_decoder>;
  const record_decoder = record({
    f: string,
    g: number,
    h: fields({ f: string, g: number }).map(({ f, g }) => f + g),
  });

  const result = { ...l1, h: l1.f + l1.g };

  expect<record>(record_decoder(l1)).toEqual(result);
  expect<record>(
    record_decoder({ ...l1, h: 'this key will be ignored' }),
  ).toEqual(result);
});

test('union decoder', () => {
  const l1 = 'test data';

  type union = decodeType<typeof union_decoder>;
  const union_decoder = union(string, number);

  expect<union>(union_decoder(l1)).toEqual(l1);
  expect<union>(union_decoder(34)).toEqual(34);
  expect(() => union_decoder(true)).toThrow();
});

test('multi union decoder', () => {
  const data = 'test data';

  type union = decodeType<typeof union_decoder>;
  const union_decoder = union(
    string,
    number,
    boolean,
    undef,
    nil,
    tuple(string, string),
    record({ data: string }),
  );

  expect<union>(union_decoder(data)).toEqual(data);
  expect<union>(union_decoder(34)).toEqual(34);
  expect<union>(union_decoder(true)).toEqual(true);
  expect<union>(union_decoder(undefined)).toEqual(undefined);
  expect<union>(union_decoder(null)).toEqual(null);
  expect<union>(union_decoder([data, data])).toEqual([data, data]);
  expect<union>(union_decoder({ data })).toEqual({ data });
  expect(() => union_decoder({ fail: '' })).toThrow();
});

test('union with default case pattern', () => {
  const l1 = 'test data';

  type union = decodeType<typeof union_decoder>;
  const union_decoder = union(string, () => '');

  expect<union>(union_decoder('')).toEqual('');
  expect<union>(union_decoder(l1)).toEqual(l1);
  expect<union>(union_decoder(null)).toEqual('');
  expect<union>(union_decoder(false)).toEqual('');
});

test('discriminated union with records', () => {
  const one = { discriminant: 'one' };
  const two = { discriminant: 'two', data: 'stuff' };

  type adt = decodeType<typeof adt_decoder>;
  const adt_decoder = union(
    { discriminant: literal('one') },
    { discriminant: literal('two'), data: string },
  );

  expect<adt>(adt_decoder(one)).toEqual(one);
  expect<adt>(adt_decoder(two)).toEqual(two);
  expect(() => adt_decoder({ ...two, data: undefined })).toThrow();
});

test('discriminated union with tuples', () => {
  const one = ['one', 1];
  const two = ['two', 'stuff'];
  const three = ['three', { data: 'stuff' }];

  type adt = decodeType<typeof adt_decoder>;
  const adt_decoder = union(
    tuple('one', number),
    tuple('two', string),
    tuple('three', { data: string }),
  );

  expect<adt>(adt_decoder(one)).toEqual(one);
  expect<adt>(adt_decoder(two)).toEqual(two);
  expect<adt>(adt_decoder(three)).toEqual(three);
  expect(() => adt_decoder(['three', { data: undefined }])).toThrow();
});

test('optional string decoder', () => {
  const l1 = 'test data';

  type optional = decodeType<typeof optional_decoder>;
  const optional_decoder = optional(string);

  expect<optional>(optional_decoder('')).toEqual('');
  expect<optional>(optional_decoder(l1)).toEqual(l1);
  expect<optional>(optional_decoder(undefined)).toEqual(undefined);
  expect(() => optional_decoder(null)).toThrow();

  const data = { optional_decoder: l1 };
  expect(record({ optional_decoder })(data)).toEqual(data);
  expect(record({ optional_decoder })({})).toEqual({
    optional_decoder: undefined,
  });
});

test('array decoder', () => {
  const l1 = 'test data';

  type array = decodeType<typeof array_decoder>;
  const array_decoder = array(string);

  expect<array>(array_decoder([])).toEqual([]);
  expect<array>(array_decoder([l1])).toEqual([l1]);
  expect<array>(array_decoder([l1, ''])).toEqual([l1, '']);
  expect(() => array_decoder('')).toThrow();
  expect(() => array_decoder([l1, true])).toThrow();
  expect(() => array_decoder([l1, undefined])).toThrow();
  expect(() => array_decoder([[]])).toThrow();
  expect(() => array_decoder(null)).toThrow();
  expect(() => array_decoder({})).toThrow();
});

test('set decoder', () => {
  const l1 = 'test data';

  type set = decodeType<typeof set_decoder>;
  const set_decoder = set(string);

  expect<set>(set_decoder([])).toEqual(new Set());
  expect<set>(set_decoder([l1])).toEqual(new Set([l1]));
  expect<set>(set_decoder([l1, ''])).toEqual(new Set(['', l1]));
  expect(() => set_decoder([l1, true])).toThrow();
  expect(() => set_decoder([l1, undefined])).toThrow();
  expect(() => set_decoder([[]])).toThrow();
  expect(() => set_decoder(null)).toThrow();
  expect(() => set_decoder({})).toThrow();
});

test('map (list-of-records) decoder', () => {
  const l1 = [
    { data: 'one', meta_data: 1 },
    { data: 'two', meta_data: 2 },
  ];

  type map = decodeType<typeof map_decoder>;
  const map_decoder = map(
    { data: string, meta_data: number },
    ({ data }) => data,
  );

  expect<map>(map_decoder([])).toEqual(new Map());
  expect<map>(map_decoder(l1)).toEqual(new Map(l1.map((x) => [x.data, x])));
});

test('map (list-of-strings) decoder', () => {
  const l1 = ['one thing', 'and another'];

  type map = decodeType<typeof map_decoder>;
  const map_decoder = map(string, (s) => s.length);

  expect<map>(map_decoder([])).toEqual(new Map());
  expect<map>(map_decoder(l1)).toEqual(new Map(l1.map((x) => [x.length, x])));
});

test('dict decoder', () => {
  const l1 = { one: 1, two: 2 };

  type dict = decodeType<typeof dict_decoder>;
  const dict_decoder = dict(number);

  expect<dict>(dict_decoder({})).toEqual(new Map());
  expect<dict>(dict_decoder(l1)).toEqual(
    new Map([
      ['one', 1],
      ['two', 2],
    ]),
  );
});

test('dict decoder with typed key', () => {
  const l1 = { small: true, medium: false };
  const l2 = { xlarge: true, small: false };

  const SizeValues = ['small', 'medium', 'large'];

  type dict_with_typed_keys = decodeType<typeof dict_with_typed_keys_decoder>;
  const dict_with_typed_keys_decoder = dict(boolean, SizeValues);

  expect<dict_with_typed_keys>(dict_with_typed_keys_decoder({})).toEqual(
    new Map(),
  );
  expect<dict_with_typed_keys>(dict_with_typed_keys_decoder(l1)).toEqual(
    new Map([
      ['small', true],
      ['medium', false],
    ]),
  );
  expect(() => dict_with_typed_keys_decoder(l2)).toThrow();
});

test('nullable decoder', () => {
  type nullable = decodeType<typeof nullable_decoder>;
  const nullable_decoder = nullable(boolean);

  expect<nullable>(nullable_decoder(true)).toEqual(true);
  expect<nullable>(nullable_decoder(false)).toEqual(false);
  expect<nullable>(nullable_decoder(null)).toEqual(null);
  expect(() => nullable_decoder(undefined)).toThrow();
  expect(() => nullable_decoder('')).toThrow();
  expect(() => nullable_decoder([])).toThrow();
  expect(() => nullable_decoder({})).toThrow();
});

test('string decoder', () => {
  type primitve_type = decodeType<typeof decoder>;
  const decoder = string;

  expect<primitve_type>(decoder('')).toEqual('');
  expect<primitve_type>(decoder('test data')).toEqual('test data');
  expect(() => decoder(0)).toThrow();
  expect(() => decoder(false)).toThrow();
  expect(() => decoder(undefined)).toThrow();
  expect(() => decoder(null)).toThrow();
  expect(() => decoder([])).toThrow();
  expect(() => decoder({})).toThrow();
});

test('number decoder', () => {
  type primitve_type = decodeType<typeof decoder>;
  const decoder = number;

  expect<primitve_type>(decoder(0)).toEqual(0);
  expect<primitve_type>(decoder(1)).toEqual(1);
  expect<primitve_type>(decoder(-1)).toEqual(-1);
  expect<primitve_type>(decoder(Infinity)).toEqual(Infinity);
  expect<primitve_type>(decoder(-Infinity)).toEqual(-Infinity);
  expect<primitve_type>(decoder(NaN)).toEqual(NaN);
  expect(() => decoder('')).toThrow();
  expect(() => decoder('0')).toThrow();
  expect(() => decoder('1')).toThrow();
  expect(() => decoder(false)).toThrow();
  expect(() => decoder(undefined)).toThrow();
  expect(() => decoder(null)).toThrow();
  expect(() => decoder([])).toThrow();
  expect(() => decoder({})).toThrow();
});

test('integer decoder', () => {
  type primitve_type = decodeType<typeof decoder>;
  const decoder = integer;

  expect<primitve_type>(decoder(0)).toEqual(0);
  expect<primitve_type>(decoder(1)).toEqual(1);
  expect<primitve_type>(decoder(-1)).toEqual(-1);
  expect<primitve_type>(decoder(42)).toEqual(42);
  expect<primitve_type>(decoder(-100)).toEqual(-100);
  expect(() => decoder(0.5)).toThrow();
  expect(() => decoder(1.1)).toThrow();
  expect(() => decoder(-0.1)).toThrow();
  expect(() => decoder(Infinity)).toThrow();
  expect(() => decoder(-Infinity)).toThrow();
  expect(() => decoder(NaN)).toThrow();
  expect(() => decoder('')).toThrow();
  expect(() => decoder('0')).toThrow();
  expect(() => decoder(false)).toThrow();
  expect(() => decoder(undefined)).toThrow();
  expect(() => decoder(null)).toThrow();
  expect(() => decoder([])).toThrow();
  expect(() => decoder({})).toThrow();
});

test('boolean decoder', () => {
  type primitve_type = decodeType<typeof decoder>;
  const decoder = boolean;

  expect<primitve_type>(decoder(true)).toEqual(true);
  expect<primitve_type>(decoder(false)).toEqual(false);
  expect(() => decoder('')).toThrow();
  expect(() => decoder(0)).toThrow();
  expect(() => decoder(undefined)).toThrow();
  expect(() => decoder(null)).toThrow();
  expect(() => decoder([])).toThrow();
  expect(() => decoder({})).toThrow();
});

test('undefined decoder', () => {
  type primitve_type = decodeType<typeof decoder>;
  const decoder = undef;

  expect<primitve_type>(decoder(undefined)).toEqual(undefined);
  expect(() => decoder('')).toThrow();
  expect(() => decoder(0)).toThrow();
  expect(() => decoder(true)).toThrow();
  expect(() => decoder(null)).toThrow();
  expect(() => decoder([])).toThrow();
  expect(() => decoder({})).toThrow();
});

test('null decoder', () => {
  type primitve_type = decodeType<typeof decoder>;
  const decoder = nil;

  expect<primitve_type>(decoder(null)).toEqual(null);
  expect(() => decoder('')).toThrow();
  expect(() => decoder(0)).toThrow();
  expect(() => decoder(true)).toThrow();
  expect(() => decoder(undefined)).toThrow();
  expect(() => decoder([])).toThrow();
  expect(() => decoder({})).toThrow();
});

test('date decoder', () => {
  type primitve_type = decodeType<typeof decoder>;
  const decoder = date;

  expect<primitve_type>(decoder('2020-02-20')).toEqual(new Date('2020-02-20'));
  expect<primitve_type>(decoder('2020-02-20T23:59')).toEqual(
    new Date('2020-02-20T23:59'),
  );
  expect<primitve_type>(decoder('2222')).toEqual(new Date('2222-01-01'));
  expect(() => decoder('')).toThrow();
  expect(() => decoder(0)).toThrow();
  expect(() => decoder(true)).toThrow();
  expect(() => decoder(null)).toThrow();
  expect(() => decoder(undefined)).toThrow();
  expect(() => decoder([])).toThrow();
  expect(() => decoder({})).toThrow();
});

test('unknown decoder', () => {
  type unknown_type = decodeType<typeof decoder>;
  const decoder = unknown;

  expect(decoder('')).toEqual('');
  expect(decoder('test data')).toEqual('test data');
  expect(decoder(0)).toEqual(0);
  expect(decoder(42)).toEqual(42);
  expect(decoder(true)).toEqual(true);
  expect(decoder(false)).toEqual(false);
  expect(decoder(undefined)).toEqual(undefined);
  expect(decoder(null)).toEqual(null);
  expect(decoder([])).toEqual([]);
  expect(decoder({})).toEqual({});
  expect(decoder([1, 'two', null])).toEqual([1, 'two', null]);
  expect(decoder({ a: 1, b: 'two' })).toEqual({ a: 1, b: 'two' });
  const sym = Symbol('test');
  expect(decoder(sym)).toBe(sym);
  const fn = () => 'hello';
  expect(decoder(fn)).toBe(fn);
  const instance = new Date();
  expect(decoder(instance)).toBe(instance);
  // Should never throw - that's the whole point
});

test('intersection fails to override properties', () => {
  const test_value = { a: 'test' };

  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = intersection({ a: number }, { a: string });

  // expect<intersection>(intersect_decoder(test_value)).toEqual(test_value);
  expect(() => intersect_decoder({ a: '0' })).toThrow();
  expect(() => intersect_decoder({ a: 1 })).toThrow();
});

test('intersection of objects cumulates fields', () => {
  const test_value = { a: 'test', b: 1 };

  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = intersection({ a: string }, { a: string, b: number });

  expect<intersection>(intersect_decoder(test_value)).toEqual(test_value);
  expect(() => intersect_decoder({ a: '' })).toThrow()
  expect(() => intersect_decoder({ b: 0 })).toThrow()
});

test('intersection of objects is mixins/multi-inheritance', () => {
  const test_value = { a: 'test', b: 1 };

  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = intersection({ a: string }, { b: number });

  expect<intersection>(intersect_decoder(test_value)).toEqual(test_value);
  expect(intersect_decoder(test_value).a).toEqual(test_value.a);
  expect(intersect_decoder(test_value).b).toEqual(test_value.b);
  expect(() => intersect_decoder({ a: '' })).toThrow()
  expect(() => intersect_decoder({ b: 0 })).toThrow()
});

test('intersection of empty object', () => {
  const test_value = { a: 'test' };

  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = intersection({}, { a: string });

  expect<intersection>(intersect_decoder(test_value)).toEqual(test_value);
  expect(intersect_decoder(test_value).a).toEqual(test_value.a);
  expect(intersect_decoder({ a: '' })).toEqual({ a: '' })
  expect(() => intersect_decoder({ a: 0 })).toThrow()
  expect(() => intersect_decoder({ b: '' })).toThrow()

});

test('intersection of arrays', () => {
  const test_value = [ 1, 2, 3, ]

  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = intersection(array(number), array(number));

  expect<intersection>(intersect_decoder(test_value)).toEqual(test_value);
  expect<intersection>(intersect_decoder([])).toEqual([]);
  expect(() => intersect_decoder({ a: '' })).toThrow()
  expect(() => intersect_decoder({ b: 0 })).toThrow()
});

test('intersection of objects of objects', () => {
  const test_value = { x: { a: 'a', b: 2 }, y: 'false', z: true }

  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = 
    intersection({ x: { a: string }, y: string }
               , { x: { b: number }, y: string, z: boolean });

  expect<intersection>(intersect_decoder(test_value)).toEqual(test_value);
  expect(() => intersect_decoder({})).toThrow();
});

test('intersection of tuple and array', () => {
  const test_value = [ 1, 2 ]

  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = intersection(tuple(number, number), array(number));

  expect<intersection>(intersect_decoder(test_value)).toEqual(test_value);
  expect(() => intersect_decoder([])).toThrow()
  expect(() => intersect_decoder([ 1, 2, 3, ])).toThrow()
  expect(() => intersect_decoder({ a: '' })).toThrow()
  expect(() => intersect_decoder({ b: 0 })).toThrow()
});

test('intersection of compatible tuples', () => {

  const test_value: [ {a: string; b: number}, number] = [ { a: '1', b: 2 }, 3 ]

  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = intersection([ { a: string }, number ], [ { b: number }, number ]);

  expect<intersection>(intersect_decoder(test_value)).toEqual(test_value)
  expect(intersect_decoder(test_value)['0'].a).toEqual(test_value['0']['a'])
  expect(intersect_decoder(test_value)['0'].b).toEqual(test_value['0']['b'])
  expect(() => intersect_decoder([])).toThrow()
  expect(() => intersect_decoder([ 1, 2 ])).toThrow()
  expect(() => intersect_decoder([ '1', 2 ])).toThrow()
  expect(() => intersect_decoder('')).toThrow()
  expect(() => intersect_decoder(0)).toThrow()
});

test('intersection of incompatible tuples', () => {

  const intersect_decoder = intersection(tuple(number, number), tuple(string, number));

  expect(() => intersect_decoder([])).toThrow()
  expect(() => intersect_decoder([ 1, 2 ])).toThrow()
  expect(() => intersect_decoder([ '1', 2 ])).toThrow()
  expect(() => intersect_decoder('')).toThrow()
  expect(() => intersect_decoder(0)).toThrow()
});

test('intersection with incompatible tuple lengths', () => {

  const tupleA: Decoder<[number, number]> = decoder(((x: unknown) => {
    const arr = array(number)(x);
    return [arr[0], arr[1], ];
  }) as any);
  const tupleB: Decoder<[number, number, number]> = decoder(((x: unknown) => {
    const arr = array(number)(x);
    return [arr[0], arr[1], arr[2], ];
  }) as any);
  const intersect_decoder = intersection(tupleA, tupleB);

  expect(() => intersect_decoder([])).toThrow()
  expect(() => intersect_decoder([ 1, 2 ])).toThrow()
  expect(() => intersect_decoder([ 1, 2, 3 ])).toThrow()
});

test('intersection of primitives and object fail', () => {

  const intersect_decoder = intersection(number, { a: string });

  expect(() => intersect_decoder([])).toThrow()
  expect(() => intersect_decoder({})).toThrow()
  expect(() => intersect_decoder({ a: '' })).toThrow()
  expect(() => intersect_decoder(1)).toThrow()
});

test('intersection of arrays produces array', () => {
  const test_value = [ 1, 2, 3, ];
  type intersection = decodeType<typeof intersect_decoder>;
  const intersect_decoder = intersection(array(number), array(number));
  expect<string>(intersect_decoder(test_value).toString()).toEqual(test_value.toString());
})


test('intersection with null', () => {
  type intersection = decodeType<typeof intersect>;
  const intersect = intersection(nullable(number), nullable(number));

  expect<intersection>(intersect(null)).toEqual(null);
  expect<intersection>(intersect(5)).toEqual(5);
  expect(() => intersect(undefined)).toThrow;
})

test('intersection with undefined', () => {
  type intersection = decodeType<typeof intersect>;
  const intersect = intersection(optional(number), optional(number));

  expect<intersection>(intersect(undefined)).toEqual(undefined);
  expect<intersection>(intersect(5)).toEqual(5);
  expect(() => intersect(null)).toThrow;
})

test('better error for missing key', () => {
  const decoder = record({ name: string, age: number });

  // Key exists but wrong type - original style error
  expect(() => decoder({ name: 123, age: 25 })).toThrow('not of type `string`');

  // Key is completely missing - better error
  expect(() => decoder({ name: 'test' })).toThrow('key `age` is missing');
  expect(() => decoder({})).toThrow('is missing');

  // Optional keys should still work when missing — key is omitted from result
  const optionalDecoder = record({ name: string, nickname: optional(string) });
  const optResult = optionalDecoder({ name: 'test' });
  expect(optResult).toEqual({ name: 'test' });
  expect(optResult.nickname).toBeUndefined();
  expect('nickname' in optResult).toBe(false);
});

test('missing decoder — succeeds when key is absent', () => {
  const decoder = record({ name: string, deleted: missing });
  expect(decoder({ name: 'alice' })).toEqual({ name: 'alice' });
});

test('missing decoder — fails when key is present', () => {
  const decoder = record({ name: string, deleted: missing });
  expect(() => decoder({ name: 'alice', deleted: true })).toThrow('expected to be missing');
  expect(() => decoder({ name: 'alice', deleted: undefined })).toThrow('expected to be missing');
  expect(() => decoder({ name: 'alice', deleted: null })).toThrow('expected to be missing');
});

test('missing decoder — multiple missing keys, extra keys allowed', () => {
  const decoder = record({ name: string, old: missing, deprecated: missing });
  expect(decoder({ name: 'bob' })).toEqual({ name: 'bob' });
  expect(decoder({ name: 'bob', other: 'stuff' })).toEqual({ name: 'bob' });
  expect(() => decoder({ name: 'bob', old: 1 })).toThrow('`old`');
  expect(() => decoder({ name: 'bob', deprecated: 'x' })).toThrow('`deprecated`');
});

test('no intersection for map, set, custom classes', () => {
  const test_value1 = [1, 2, 3, ];
  const test_value2 = 'test';

  type intersection = decodeType<typeof intersect>;
  const intersect = (result: any) => intersection(_ => result, _ => result);

  class A extends Map {}
  class B {}

  expect<intersection>(intersect(test_value1)(null)).toEqual(test_value1);
  expect<intersection>(intersect(test_value2)(null)).toEqual(test_value2);
  expect(() => intersect(new A())(null)).toThrow();
  expect(() => intersect(new B())(null)).toThrow();
  expect(() => intersect(new Set())(null)).toThrow();
})

test('always decoder', () => {
  const always_false = always(false);
  const always_hello = always('hello');
  const always_42 = always(42);
  const always_null = always(null);

  // Always returns the constant value regardless of input
  expect(always_false('anything')).toEqual(false);
  expect(always_false(123)).toEqual(false);
  expect(always_false(null)).toEqual(false);
  expect(always_false(undefined)).toEqual(false);
  expect(always_false({})).toEqual(false);

  expect(always_hello(42)).toEqual('hello');
  expect(always_hello(null)).toEqual('hello');

  expect(always_42('test')).toEqual(42);
  expect(always_null('test')).toEqual(null);
});

test('always as default in union', () => {
  type union_type = decodeType<typeof decoder>;
  const decoder = union(boolean, always(false));

  expect<union_type>(decoder(true)).toEqual(true);
  expect<union_type>(decoder(false)).toEqual(false);
  // Non-booleans get the default value
  expect<union_type>(decoder('anything')).toEqual(false);
  expect<union_type>(decoder(null)).toEqual(false);
  expect<union_type>(decoder(42)).toEqual(false);
});

test('always with string default in union', () => {
  type union_type = decodeType<typeof decoder>;
  const decoder = union(string, always('default'));

  expect<union_type>(decoder('hello')).toEqual('hello');
  // Non-strings get the default value
  expect<union_type>(decoder(42)).toEqual('default');
  expect<union_type>(decoder(null)).toEqual('default');
});

test('safeDecode returns value on success', () => {
  const result = safeDecode(string, 'hello');
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value).toEqual('hello');
  }

  const numResult = safeDecode(number, 42);
  expect(numResult.ok).toBe(true);
  if (numResult.ok) {
    expect(numResult.value).toEqual(42);
  }
});

test('safeDecode returns error on failure', () => {
  const result = safeDecode(string, 42);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.message).toContain('not of type `string`');
  }
});

test('safeDecode with complex decoders', () => {
  const personDecoder = record({ name: string, age: number });

  const success = safeDecode(personDecoder, { name: 'Alice', age: 30 });
  expect(success.ok).toBe(true);
  if (success.ok) {
    expect(success.value).toEqual({ name: 'Alice', age: 30 });
  }

  const failure = safeDecode(personDecoder, { name: 'Alice' });
  expect(failure.ok).toBe(false);

  expect(safeDecode(personDecoder, 'not an object').ok).toBe(false);
  expect(safeDecode(personDecoder, null).ok).toBe(false);
});

test('safeDecode with union and literal forms', () => {
  const decoder = union(string, number);
  expect(safeDecode(decoder, 'hello').ok).toBe(true);
  expect(safeDecode(decoder, 42).ok).toBe(true);
  expect(safeDecode(decoder, true).ok).toBe(false);

  // Literal forms
  expect(safeDecode({ name: string }, { name: 'test' }).ok).toBe(true);
  expect(safeDecode({ name: string }, { name: 42 }).ok).toBe(false);
  expect(safeDecode('hello', 'hello').ok).toBe(true);
  expect(safeDecode('hello', 'world').ok).toBe(false);
});

test('record with literal() wrapper', () => {
  const decoder = record({
    type: literal('admin'),
    level: literal(42),
    active: literal(true),
    name: string,
  });

  expect(
    decoder({ type: 'admin', level: 42, active: true, name: 'Alice' }),
  ).toEqual({ type: 'admin', level: 42, active: true, name: 'Alice' });
  expect(() =>
    decoder({ type: 'user', level: 42, active: true, name: 'Alice' }),
  ).toThrow();
  expect(() =>
    decoder({ type: 'admin', level: 43, active: true, name: 'Alice' }),
  ).toThrow();
  expect(() =>
    decoder({ type: 'admin', level: 42, active: false, name: 'Alice' }),
  ).toThrow();
});

test('record with bare literals', () => {
  const decoder = record({
    type: 'admin',
    level: 42,
    active: true,
    name: string,
    age: number,
  });

  expect(
    decoder({ type: 'admin', level: 42, active: true, name: 'Alice', age: 30 }),
  ).toEqual({ type: 'admin', level: 42, active: true, name: 'Alice', age: 30 });
  expect(() =>
    decoder({ type: 'user', level: 42, active: true, name: 'Alice', age: 30 }),
  ).toThrow();
  expect(() =>
    decoder({ type: 'admin', level: 43, active: true, name: 'Alice', age: 30 }),
  ).toThrow();
  expect(() =>
    decoder({ type: 'admin', level: 42, active: false, name: 'Alice', age: 30 }),
  ).toThrow();
});

test('record with bare literals preserves literal types', () => {
  const decoder = record({ level: 42, active: true, name: string });
  type decoded = decodeType<typeof decoder>;
  const r: decoded = decoder({ level: 42, active: true, name: 'test' });
  expect(r).toEqual({ level: 42, active: true, name: 'test' });

  // rejects wrong values at runtime
  expect(() => decoder({ level: 43, active: true, name: 'test' })).toThrow();
});

test('record with bare literal edge cases: 0, false, -1', () => {
  const decoder = record({ zero: 0, neg: -1, no: false, name: string });

  expect(
    decoder({ zero: 0, neg: -1, no: false, name: 'test' }),
  ).toEqual({ zero: 0, neg: -1, no: false, name: 'test' });
  expect(() => decoder({ zero: 1, neg: -1, no: false, name: 'test' })).toThrow();
  expect(() => decoder({ zero: 0, neg: 1, no: false, name: 'test' })).toThrow();
  expect(() => decoder({ zero: 0, neg: -1, no: true, name: 'test' })).toThrow();
});

test('nested record() with bare literals', () => {
  const decoder = record({
    name: string,
    config: record({ level: 42, active: true }),
  });

  expect(
    decoder({ name: 'test', config: { level: 42, active: true } }),
  ).toEqual({ name: 'test', config: { level: 42, active: true } });
  expect(() =>
    decoder({ name: 'test', config: { level: 43, active: true } }),
  ).toThrow();
});

test('nested bare POJO with literal() wrapper', () => {
  const decoder = record({
    name: string,
    config: { level: literal(42), active: literal(true) },
  });

  expect(
    decoder({ name: 'test', config: { level: 42, active: true } }),
  ).toEqual({ name: 'test', config: { level: 42, active: true } });
  expect(() =>
    decoder({ name: 'test', config: { level: 43, active: true } }),
  ).toThrow();
  expect(() =>
    decoder({ name: 'test', config: { level: 42, active: false } }),
  ).toThrow();
});

test('nested bare POJO with string literals', () => {
  // bare POJOs support string literals and decoder functions
  const decoder = record({
    name: string,
    config: { type: 'admin', city: string },
  });

  expect(
    decoder({ name: 'test', config: { type: 'admin', city: 'Oslo' } }),
  ).toEqual({ name: 'test', config: { type: 'admin', city: 'Oslo' } });
  expect(() =>
    decoder({ name: 'test', config: { type: 'user', city: 'Oslo' } }),
  ).toThrow();
});

test('nested bare POJO with number and boolean literals', () => {
  // bare numbers and booleans work in nested POJOs — no literal() wrapper needed
  const decoder = record({
    name: string,
    config: { level: 42, active: true, type: 'admin' },
  });

  expect(
    decoder({ name: 'test', config: { level: 42, active: true, type: 'admin' } }),
  ).toEqual({ name: 'test', config: { level: 42, active: true, type: 'admin' } });
  expect(() =>
    decoder({ name: 'test', config: { level: 43, active: true, type: 'admin' } }),
  ).toThrow();
  expect(() =>
    decoder({ name: 'test', config: { level: 42, active: false, type: 'admin' } }),
  ).toThrow();
});

test('bare POJO with number/boolean via decoder()', () => {
  const dec = decoder({ level: 42, active: true, name: string });

  expect(
    dec({ level: 42, active: true, name: 'test' }),
  ).toEqual({ level: 42, active: true, name: 'test' });
  expect(() => dec({ level: 43, active: true, name: 'test' })).toThrow();
  expect(() => dec({ level: 42, active: false, name: 'test' })).toThrow();
});

test('optional and nullable with bare literals', () => {
  const opt = record({ level: optional(42) });
  expect(opt({ level: 42 })).toEqual({ level: 42 });
  expect(opt({ level: undefined })).toEqual({ level: undefined });
  expect(opt({})).toEqual({ level: undefined });
  expect(() => opt({ level: 43 })).toThrow();

  const nul = record({ level: nullable(42) });
  expect(nul({ level: 42 })).toEqual({ level: 42 });
  expect(nul({ level: null })).toEqual({ level: null });
  expect(() => nul({ level: 43 })).toThrow();
});

test('intersection with literal() in records', () => {
  const decoder = intersection(record({ type: 42 }), { name: string });
  expect(decoder({ type: 42, name: 'test' })).toEqual({ type: 42, name: 'test' });
  expect(() => decoder({ type: 43, name: 'test' })).toThrow();
});

test('union with bare number literals', () => {
  const decoder = union(1, 2, 3);

  expect(decoder(1)).toEqual(1);
  expect(decoder(2)).toEqual(2);
  expect(decoder(3)).toEqual(3);
  expect(() => decoder(4)).toThrow();
  expect(() => decoder('1')).toThrow();
});

test('union with bare boolean literal', () => {
  const decoder = union(true, string);

  expect(decoder(true)).toEqual(true);
  expect(decoder('hello')).toEqual('hello');
  expect(() => decoder(false)).toThrow();
  expect(() => decoder(42)).toThrow();
});

test('tuple with bare number literal', () => {
  const decoder = tuple(42, string);

  expect(decoder([42, 'hello'])).toEqual([42, 'hello']);
  expect(() => decoder([43, 'hello'])).toThrow();
  expect(() => decoder([42, 123])).toThrow();
});

test('nested bare POJO with optional containing bare literals', () => {
  const decoder = record({
    name: string,
    config: optional({ level: 42, active: true }),
  });

  expect(
    decoder({ name: 'test', config: { level: 42, active: true } }),
  ).toEqual({ name: 'test', config: { level: 42, active: true } });
  expect(decoder({ name: 'test' })).toEqual({ name: 'test', config: undefined });
  expect(() =>
    decoder({ name: 'test', config: { level: 43, active: true } }),
  ).toThrow();
});

test('nested bare POJO with nullable containing bare literals', () => {
  const decoder = record({
    name: string,
    config: nullable({ level: 42, active: true }),
  });

  expect(
    decoder({ name: 'test', config: { level: 42, active: true } }),
  ).toEqual({ name: 'test', config: { level: 42, active: true } });
  expect(decoder({ name: 'test', config: null })).toEqual({ name: 'test', config: null });
  expect(() =>
    decoder({ name: 'test', config: { level: 43, active: true } }),
  ).toThrow();
});

test('union of bare POJOs with number/boolean literals', () => {
  const decoder = union(
    { type: 'a', level: 1 },
    { type: 'b', active: true },
  );

  expect(decoder({ type: 'a', level: 1 })).toEqual({ type: 'a', level: 1 });
  expect(decoder({ type: 'b', active: true })).toEqual({ type: 'b', active: true });
  expect(() => decoder({ type: 'a', level: 2 })).toThrow();
});

test('array of bare POJOs with number/boolean literals', () => {
  const decoder = array({ id: number, active: true });

  expect(decoder([
    { id: 1, active: true },
    { id: 2, active: true },
  ])).toEqual([
    { id: 1, active: true },
    { id: 2, active: true },
  ]);
  expect(() => decoder([{ id: 1, active: false }])).toThrow();
});

test('deeply nested bare POJOs with mixed literal types', () => {
  const decoder = record({
    name: string,
    level1: {
      level2: {
        value: 42,
        flag: true,
        tag: 'deep',
      },
    },
  });

  expect(
    decoder({ name: 'test', level1: { level2: { value: 42, flag: true, tag: 'deep' } } }),
  ).toEqual({ name: 'test', level1: { level2: { value: 42, flag: true, tag: 'deep' } } });
  expect(() =>
    decoder({ name: 'test', level1: { level2: { value: 43, flag: true, tag: 'deep' } } }),
  ).toThrow();
  expect(() =>
    decoder({ name: 'test', level1: { level2: { value: 42, flag: false, tag: 'deep' } } }),
  ).toThrow();
});

test('bare literal tuple with number and boolean', () => {
  const dec = decoder([42, true]);

  expect(dec([42, true])).toEqual([42, true]);
  expect(() => dec([43, true])).toThrow();
  expect(() => dec([42, false])).toThrow();
});

test('record nesting record with optional fields preserves types', () => {
  // This was the regression case: nested record() with optional fields
  const inner = record({ a: optional(string), b: number });
  const outer = record({ x: inner, y: string });

  expect(outer({ x: { b: 1 }, y: 'hi' })).toEqual({ x: { a: undefined, b: 1 }, y: 'hi' });
  expect(outer({ x: { a: 'val', b: 2 }, y: 'hi' })).toEqual({ x: { a: 'val', b: 2 }, y: 'hi' });
  expect(() => outer({ x: { b: 'wrong' }, y: 'hi' })).toThrow();
});

test('intersection of bare POJO with number literals', () => {
  const decoder = intersection(
    { type: 'admin', level: 42 },
    { name: string },
  );

  expect(decoder({ type: 'admin', level: 42, name: 'test' })).toEqual({
    type: 'admin', level: 42, name: 'test',
  });
  expect(() => decoder({ type: 'admin', level: 43, name: 'test' })).toThrow();
});

test('kitchen sink: bare literals across all combinators', () => {
  // set of bare POJOs with number/boolean literals
  const setDecoder = set({ id: number, active: true });
  const setResult = setDecoder([{ id: 1, active: true }, { id: 2, active: true }]);
  expect(setResult).toBeInstanceOf(Set);
  expect(setResult.size).toBe(2);
  expect(() => setDecoder([{ id: 1, active: false }])).toThrow();

  // dict with bare number literal values
  const dictDecoder = dict(42);
  const dictResult = dictDecoder({ a: 42, b: 42 });
  expect(dictResult).toBeInstanceOf(Map);
  expect(dictResult.get('a')).toBe(42);
  expect(() => dictDecoder({ a: 43 })).toThrow();

  // fields with bare number/boolean in schema
  const fieldsDecoder = record({
    combined: fields(
      { level: number, active: true },
    ).map(({ level, active }) => `${level}-${active}`),
  });
  expect(fieldsDecoder({ level: 5, active: true })).toEqual({ combined: '5-true' });
  expect(() => fieldsDecoder({ level: 5, active: false })).toThrow();

  // always as fallback in union with bare literal POJO
  const withDefault = union({ status: 'ok', code: 200 }, always({ status: 'error', code: 0 }));
  expect(withDefault({ status: 'ok', code: 200 })).toEqual({ status: 'ok', code: 200 });
  expect(withDefault('anything')).toEqual({ status: 'error', code: 0 });

  // union mixing bare literals, decoder functions, and POJOs
  const mixedUnion = union(42, string, { tag: true });
  expect(mixedUnion(42)).toBe(42);
  expect(mixedUnion('hello')).toBe('hello');
  expect(mixedUnion({ tag: true })).toEqual({ tag: true });
  expect(() => mixedUnion(43)).toThrow();
  expect(() => mixedUnion({ tag: false })).toThrow();

  // nullable intersection with bare literal POJO
  const nullableIntersect = nullable(intersection(
    { type: 'x', level: 42 },
    { name: string },
  ));
  expect(nullableIntersect(null)).toBe(null);
  expect(nullableIntersect({ type: 'x', level: 42, name: 'hi' })).toEqual({ type: 'x', level: 42, name: 'hi' });
  expect(() => nullableIntersect({ type: 'x', level: 99, name: 'hi' })).toThrow();

  // optional array of bare literal tuples
  const optArrayTuples = optional(array(decoder([number, true])));
  expect(optArrayTuples(undefined)).toBeUndefined();
  expect(optArrayTuples([[1, true], [2, true]])).toEqual([[1, true], [2, true]]);
  expect(() => optArrayTuples([[1, false]])).toThrow();

  // map keyed by a field from bare literal POJO
  const mapDecoder = map({ id: number, active: true }, (x: any) => x.id);
  const mapResult = mapDecoder([{ id: 1, active: true }, { id: 2, active: true }]);
  expect(mapResult).toBeInstanceOf(Map);
  expect(mapResult.get(1)).toEqual({ id: 1, active: true });
  expect(() => mapDecoder([{ id: 1, active: false }])).toThrow();
});

test('README examples: bare literals, unions, and new decoders', () => {
  // Config decoder with mixed bare literals (README "bare literals" section)
  const configDecoder = record({
    version: 2,
    env: 'production',
    debug: false,
    name: string,
    retries: number,
  });
  expect(configDecoder({ version: 2, env: 'production', debug: false, name: 'app', retries: 3 }))
    .toEqual({ version: 2, env: 'production', debug: false, name: 'app', retries: 3 });
  expect(() => configDecoder({ version: 3, env: 'production', debug: false, name: 'app', retries: 3 })).toThrow();
  expect(() => configDecoder({ version: 2, env: 'staging', debug: false, name: 'app', retries: 3 })).toThrow();
  expect(() => configDecoder({ version: 2, env: 'production', debug: true, name: 'app', retries: 3 })).toThrow();

  // literal(42) and bare 42 are equivalent — both decode and auto-default
  const d1 = record({ level: literal(42), name: string });
  const d2 = record({ level: 42, name: string });
  const input = { level: 42, name: 'test' };
  expect(d1(input)).toEqual(input);
  expect(d2(input)).toEqual(input);
  expect(() => d1({ level: 43, name: 'test' })).toThrow();
  expect(() => d2({ level: 43, name: 'test' })).toThrow();

  // union of bare number literals (README "enum-like" example)
  const statusCodeDecoder = union(200, 404, 500);
  expect(statusCodeDecoder(200)).toBe(200);
  expect(statusCodeDecoder(404)).toBe(404);
  expect(statusCodeDecoder(500)).toBe(500);
  expect(() => statusCodeDecoder(201)).toThrow();

  // union of bare string literals, 4 args (README "direction" example)
  const directionDecoder = union('north', 'south', 'east', 'west');
  expect(directionDecoder('north')).toBe('north');
  expect(directionDecoder('west')).toBe('west');
  expect(() => directionDecoder('up')).toThrow();

  // record with unknown field (README "unknown" example)
  const withMetadata = record({ name: string, metadata: unknown });
  expect(withMetadata({ name: 'x', metadata: { anything: [1, 2, 3] } }))
    .toEqual({ name: 'x', metadata: { anything: [1, 2, 3] } });
  expect(withMetadata({ name: 'x', metadata: null }))
    .toEqual({ name: 'x', metadata: null });

  // always as fallback in union of records (README "always" example)
  const withFallback = union(
    record({ status: 'ok', data: string }),
    always({ status: 'error', data: '' }),
  );
  expect(withFallback({ status: 'ok', data: 'hello' })).toEqual({ status: 'ok', data: 'hello' });
  expect(withFallback('garbage')).toEqual({ status: 'error', data: '' });
  expect(withFallback(null)).toEqual({ status: 'error', data: '' });

  // always(null) as fallback — nullable without nullable()
  const nullFallback = union(string, always(null));
  expect(nullFallback('hello')).toBe('hello');
  expect(nullFallback(42)).toBe(null);
  expect(nullFallback(undefined)).toBe(null);

  // always(undefined) as fallback — optional without optional()
  const undefFallback = union(number, always(undefined));
  expect(undefFallback(42)).toBe(42);
  expect(undefFallback('nope')).toBe(undefined);
  expect(undefFallback(null)).toBe(undefined);

  // always with primitive fallback in union of bare literals
  const literalWithDefault = union(200, 404, always(0));
  expect(literalWithDefault(200)).toBe(200);
  expect(literalWithDefault(404)).toBe(404);
  expect(literalWithDefault(999)).toBe(0);
  expect(literalWithDefault('garbage')).toBe(0);

  // always with fallback in union of arrays
  const arrayWithDefault = union(array(number), always([] as number[]));
  expect(arrayWithDefault([1, 2, 3])).toEqual([1, 2, 3]);
  expect(arrayWithDefault('not an array')).toEqual([]);
  expect(arrayWithDefault(null)).toEqual([]);

  // always with fallback in union of tuples
  const tupleWithDefault = union(tuple(string, number), always(['unknown', 0] as [string, number]));
  expect(tupleWithDefault(['hello', 42])).toEqual(['hello', 42]);
  expect(tupleWithDefault('garbage')).toEqual(['unknown', 0]);

  // always with fallback in union of bare POJO
  const pojoWithDefault = union({ level: 42, name: string }, always({ level: 0, name: 'default' }));
  expect(pojoWithDefault({ level: 42, name: 'test' })).toEqual({ level: 42, name: 'test' });
  expect(pojoWithDefault({ level: 99, name: 'test' })).toEqual({ level: 0, name: 'default' });
  expect(pojoWithDefault(null)).toEqual({ level: 0, name: 'default' });

  // tagged union with always fallback — different shapes
  const taggedWithFallback = union(
    record({ tag: 'success', data: string }),
    record({ tag: 'error', code: number }),
    always({ tag: 'unknown' }),
  );
  expect(taggedWithFallback({ tag: 'success', data: 'hi' })).toEqual({ tag: 'success', data: 'hi' });
  expect(taggedWithFallback({ tag: 'error', code: 404 })).toEqual({ tag: 'error', code: 404 });
  expect(taggedWithFallback({ tag: 'other' })).toEqual({ tag: 'unknown' });
  expect(taggedWithFallback(null)).toEqual({ tag: 'unknown' });

  // same-shape fallback — record with always providing defaults for same keys
  const sameShapeFallback = union(
    record({ status: 'active', score: number }),
    always({ status: 'inactive', score: 0 }),
  );
  expect(sameShapeFallback({ status: 'active', score: 99 })).toEqual({ status: 'active', score: 99 });
  expect(sameShapeFallback({ status: 'inactive', score: 'bad' })).toEqual({ status: 'inactive', score: 0 });
  expect(sameShapeFallback(undefined)).toEqual({ status: 'inactive', score: 0 });

  // Discriminated union with bare string literals in records (README "cool/dumb" example)
  const coolDecoder = record({ type: 'cool', somestuff: string });
  const dumbDecoder = record({ type: 'dumb', otherstuff: string });
  const stuffDecoder = union(coolDecoder, dumbDecoder);
  expect(stuffDecoder({ type: 'cool', somestuff: 'yes' })).toEqual({ type: 'cool', somestuff: 'yes' });
  expect(stuffDecoder({ type: 'dumb', otherstuff: 'no' })).toEqual({ type: 'dumb', otherstuff: 'no' });
  expect(() => stuffDecoder({ type: 'other', somestuff: 'x' })).toThrow();

  // Nested bare POJO from README
  const nestedDecoder = record({
    name: string,
    config: {
      level: 42,
      active: true,
      env: 'prod',
    },
  });
  expect(nestedDecoder({ name: 'x', config: { level: 42, active: true, env: 'prod' } }))
    .toEqual({ name: 'x', config: { level: 42, active: true, env: 'prod' } });
  expect(() => nestedDecoder({ name: 'x', config: { level: 42, active: true, env: 'dev' } })).toThrow();
});

test('withDefault returns fallback when decoder fails', () => {
  const decoder = withDefault(string, 'fallback');
  expect(decoder('hello')).toBe('hello');
  expect(decoder(undefined)).toBe('fallback');
  expect(decoder(null)).toBe('fallback');
  expect(decoder(42)).toBe('fallback');
});

test('withDefault with number decoder', () => {
  const decoder = withDefault(number, 0);
  expect(decoder(42)).toBe(42);
  expect(decoder(undefined)).toBe(0);
  expect(decoder(null)).toBe(0);
  expect(decoder('hello')).toBe(0);
});

test('withDefault with record decoder', () => {
  const decoder = withDefault(
    record({ name: string, level: number }),
    { name: 'anonymous', level: 1 },
  );
  expect(decoder({ name: 'alice', level: 5 })).toEqual({ name: 'alice', level: 5 });
  expect(decoder(undefined)).toEqual({ name: 'anonymous', level: 1 });
  expect(decoder(null)).toEqual({ name: 'anonymous', level: 1 });
  // missing key also falls back
  expect(decoder({ name: 'alice' })).toEqual({ name: 'anonymous', level: 1 });
});

test('withDefault in a record schema', () => {
  const decoder = record({
    name: string,
    role: withDefault(string, 'user'),
    retries: withDefault(number, 3),
  });
  expect(decoder({ name: 'alice', role: 'admin', retries: 5 }))
    .toEqual({ name: 'alice', role: 'admin', retries: 5 });
  expect(decoder({ name: 'alice' }))
    .toEqual({ name: 'alice', role: 'user', retries: 3 });
  expect(decoder({ name: 'alice', role: null, retries: undefined }))
    .toEqual({ name: 'alice', role: 'user', retries: 3 });
});

test('withDefault with bare literal decoder', () => {
  const decoder = withDefault(42, 42);
  expect(decoder(42)).toBe(42);
  expect(decoder(undefined)).toBe(42);
  expect(decoder(null)).toBe(42);
  expect(decoder(43)).toBe(42);
});

test('withDefault with array decoder', () => {
  const decoder = withDefault(array(number), []);
  expect(decoder([1, 2, 3])).toEqual([1, 2, 3]);
  expect(decoder(undefined)).toEqual([]);
  expect(decoder(null)).toEqual([]);
  expect(decoder('not an array')).toEqual([]);
});

test('withDefault with nullable — null passes through, fallback on throw', () => {
  const decoder = withDefault(nullable(number), null);
  expect(decoder(42)).toBe(42);
  expect(decoder(null)).toBe(null);     // null is valid, not a fallback
  expect(decoder('bad')).toBe(null);    // throws → fallback
  expect(decoder(undefined)).toBe(null); // throws → fallback
});

test('withDefault with optional — undefined passes through, fallback on throw', () => {
  const decoder = withDefault(optional(string), undefined);
  expect(decoder('hello')).toBe('hello');
  expect(decoder(undefined)).toBeUndefined(); // valid decoded value
  expect(decoder(42)).toBeUndefined();        // throws → fallback
});

test('withDefault with union — fallback only on total failure', () => {
  const decoder = withDefault(union(string, number, nil), null);
  expect(decoder('hello')).toBe('hello');
  expect(decoder(42)).toBe(42);
  expect(decoder(null)).toBe(null);     // valid union case
  expect(decoder(true)).toBe(null);     // no union case matches → fallback
  expect(decoder({})).toBe(null);       // no union case matches → fallback
});

test('withDefault with tagged union — fallback on no match', () => {
  const decoder = withDefault(
    union(
      record({ tag: 'ok', data: string }),
      record({ tag: 'err', code: number }),
    ),
    { tag: 'err', code: 0 },
  );
  expect(decoder({ tag: 'ok', data: 'hi' })).toEqual({ tag: 'ok', data: 'hi' });
  expect(decoder({ tag: 'err', code: 404 })).toEqual({ tag: 'err', code: 404 });
  expect(decoder({ tag: 'unknown' })).toEqual({ tag: 'err', code: 0 });
  expect(decoder(null)).toEqual({ tag: 'err', code: 0 });
});

test('withDefault with nullable in a record — null is valid, missing key falls back', () => {
  const decoder = record({
    name: string,
    data: withDefault(nullable(number), null),
  });
  expect(decoder({ name: 'a', data: 42 })).toEqual({ name: 'a', data: 42 });
  expect(decoder({ name: 'a', data: null })).toEqual({ name: 'a', data: null });
  expect(decoder({ name: 'a' })).toEqual({ name: 'a', data: null });
  expect(decoder({ name: 'a', data: 'bad' })).toEqual({ name: 'a', data: null });
});

test('withDefault in a bare POJO (no record() wrapper)', () => {
  const dec = decoder({ name: string, score: withDefault(number, 0) });
  expect(dec({ name: 'alice', score: 42 })).toEqual({ name: 'alice', score: 42 });
  expect(dec({ name: 'alice' })).toEqual({ name: 'alice', score: 0 });
  expect(dec({ name: 'alice', score: 'bad' })).toEqual({ name: 'alice', score: 0 });
});

test('withDefault in a tuple', () => {
  const decoder = tuple(string, withDefault(number, 0));
  expect(decoder(['hello', 42])).toEqual(['hello', 42]);
  expect(decoder(['hello', 'bad'])).toEqual(['hello', 0]);
  expect(decoder(['hello', null])).toEqual(['hello', 0]);
});

test('withDefault with fallback type different from decoder type', () => {
  // fallback is null, decoder is string → string | null
  const decoder = withDefault(string, null);
  expect(decoder('hello')).toBe('hello');
  expect(decoder(42)).toBe(null);

  // fallback is a different string literal
  const decoder2 = withDefault(number, 'N/A');
  expect(decoder2(42)).toBe(42);
  expect(decoder2('bad')).toBe('N/A');

  // fallback is a completely different shape
  const decoder3 = withDefault(
    record({ name: string }),
    { error: 'not found' },
  );
  expect(decoder3({ name: 'alice' })).toEqual({ name: 'alice' });
  expect(decoder3(null)).toEqual({ error: 'not found' });
});

test('regex decoder matches valid strings', () => {
  const email = regex(/^[^@]+@[^@]+\.[^@]+$/);
  expect(email('user@example.com')).toBe('user@example.com');
  expect(() => email('not-an-email')).toThrow();
  expect(() => email('')).toThrow();
  expect(() => email(42)).toThrow();
});

test('regex decoder with simple patterns', () => {
  const digits = regex(/^\d+$/);
  expect(digits('123')).toBe('123');
  expect(digits('0')).toBe('0');
  expect(() => digits('abc')).toThrow();
  expect(() => digits('12.3')).toThrow();

  const hex = regex(/^#[0-9a-f]{6}$/i);
  expect(hex('#ff00aa')).toBe('#ff00aa');
  expect(hex('#FF00AA')).toBe('#FF00AA');
  expect(() => hex('#xyz')).toThrow();
  expect(() => hex('ff00aa')).toThrow();
});

test('regex decoder in a record', () => {
  const decoder = record({
    name: string,
    email: regex(/^[^@]+@[^@]+$/),
    zip: regex(/^\d{5}$/),
  });
  expect(decoder({ name: 'alice', email: 'a@b', zip: '12345' }))
    .toEqual({ name: 'alice', email: 'a@b', zip: '12345' });
  expect(() => decoder({ name: 'alice', email: 'bad', zip: '12345' })).toThrow();
  expect(() => decoder({ name: 'alice', email: 'a@b', zip: '123' })).toThrow();
});

test('regex decoder with withDefault', () => {
  const decoder = withDefault(regex(/^\d+$/), 'N/A');
  expect(decoder('123')).toBe('123');
  expect(decoder('abc')).toBe('N/A');
  expect(decoder(null)).toBe('N/A');
});

test('objectOf decodes object to Record<string, T>', () => {
  const decoder = objectOf(number);
  const result = decoder({ a: 1, b: 2, c: 3 });
  expect(result).toEqual({ a: 1, b: 2, c: 3 });
  expect(result.a).toBe(1);
  expect(result.b).toBe(2);
});

test('objectOf validates values', () => {
  const decoder = objectOf(number);
  expect(() => decoder({ a: 1, b: 'bad' })).toThrow();
  expect(() => decoder('not an object')).toThrow();
  expect(() => decoder(null)).toThrow();
});

test('objectOf with constrained keys', () => {
  const decoder = objectOf(number, ['small', 'medium', 'large']);
  expect(decoder({ small: 1, medium: 2, large: 3 })).toEqual({ small: 1, medium: 2, large: 3 });
  expect(() => decoder({ small: 1, xl: 4 })).toThrow();
});

test('objectOf with complex value decoder', () => {
  const decoder = objectOf(record({ name: string, score: number }));
  const result = decoder({
    alice: { name: 'alice', score: 10 },
    bob: { name: 'bob', score: 20 },
  });
  expect(result.alice).toEqual({ name: 'alice', score: 10 });
  expect(result.bob).toEqual({ name: 'bob', score: 20 });
});

test('objectOf with bare POJO value decoder', () => {
  const decoder = objectOf({ name: string, score: number });
  const result = decoder({
    alice: { name: 'alice', score: 10 },
    bob: { name: 'bob', score: 20 },
  });
  expect(result.alice).toEqual({ name: 'alice', score: 10 });
  expect(result.bob).toEqual({ name: 'bob', score: 20 });
  expect(() => decoder({ alice: { name: 'alice' } })).toThrow();
});

test('objectOf in a record schema', () => {
  const decoder = record({
    name: string,
    scores: objectOf(number),
  });
  expect(decoder({ name: 'alice', scores: { math: 90, english: 85 } }))
    .toEqual({ name: 'alice', scores: { math: 90, english: 85 } });
});

test('objectOf with empty object', () => {
  const decoder = objectOf(string);
  expect(decoder({})).toEqual({});
});

test('bigint decoder from string', () => {
  expect(bigint('123')).toBe(BigInt(123));
  expect(bigint('0')).toBe(BigInt(0));
  expect(bigint('-42')).toBe(BigInt(-42));
  expect(bigint('9007199254740993')).toBe(BigInt('9007199254740993'));
});

test('bigint decoder from bigint', () => {
  expect(bigint(BigInt(123))).toBe(BigInt(123));
  expect(bigint(BigInt(0))).toBe(BigInt(0));
  expect(bigint(BigInt(-1))).toBe(BigInt(-1));
});

test('bigint decoder from number', () => {
  expect(bigint(42)).toBe(BigInt(42));
  expect(bigint(0)).toBe(BigInt(0));
  expect(bigint(-1)).toBe(BigInt(-1));
  expect(() => bigint(3.14)).toThrow();
});

test('bigint decoder rejects non-numeric types', () => {
  expect(() => bigint(true)).toThrow();
  expect(() => bigint(null)).toThrow();
  expect(() => bigint(undefined)).toThrow();
  expect(() => bigint({})).toThrow();
});

test('bigint decoder rejects invalid strings', () => {
  expect(() => bigint('not a number')).toThrow();
  expect(() => bigint('3.14')).toThrow();
});

test('bigint decoder in a record', () => {
  const decoder = record({
    name: string,
    balance: bigint,
  });
  expect(decoder({ name: 'alice', balance: '9007199254740993' }))
    .toEqual({ name: 'alice', balance: BigInt('9007199254740993') });
});

test('field with .map() — extract and transform', () => {
  const dec = record({
    thing: field('nested', { theThingIWant: string }).map(x => x.theThingIWant),
    foo: string,
  });
  expect(dec({ foo: 'bar', nested: { theThingIWant: 'found it' } }))
    .toEqual({ thing: 'found it', foo: 'bar' });
});

test('field with .map() — numeric transform', () => {
  const dec = record({
    doubled: field('value', number).map(x => x * 2),
  });
  expect(dec({ value: 21 })).toEqual({ doubled: 42 });
});

test('field without .map() — unchanged behavior', () => {
  const dec = record({
    name: field('username', string),
  });
  expect(dec({ username: 'alice' })).toEqual({ name: 'alice' });
});

// --- .map() replaces transform ---

test('.map() — basic usage', () => {
  const dec = number.map(x => x * 2);
  expect(dec(21)).toBe(42);
});

test('.map() — with record decoder', () => {
  const dec = record({ name: string, age: number }).map(
    x => `${x.name} is ${x.age}`,
  );
  expect(dec({ name: 'alice', age: 30 })).toBe('alice is 30');
});

test('.map() — chain with union', () => {
  const dec = union(string, number).map(x => String(x));
  expect(dec('hello')).toBe('hello');
  expect(dec(42)).toBe('42');
});

// --- literal with .map() ---

test('literal with .map() — transform matched value', () => {
  const dec = literal('admin').map(x => x.toUpperCase());
  expect(dec('admin')).toBe('ADMIN');
});

test('literal with .map() — number literal', () => {
  const dec = literal(42).map(x => x + 1);
  expect(dec(42)).toBe(43);
});

test('literal with .map() — boolean literal', () => {
  const dec = literal(true).map(x => (x ? 'yes' : 'no'));
  expect(dec(true)).toBe('yes');
});

test('literal with .map() — still rejects non-matching', () => {
  const dec = literal('admin').map(x => x.toUpperCase());
  expect(() => dec('user')).toThrow();
});

// --- tuple with .map() ---

test('tuple with .map() — destructure and combine', () => {
  const dec = tuple(string, number).map(([name, age]) => ({ name, age }));
  expect(dec(['alice', 30])).toEqual({ name: 'alice', age: 30 });
});

test('tuple with .map() — sum', () => {
  const dec = tuple(number, number).map(([a, b]) => a + b);
  expect(dec([3, 4])).toBe(7);
});

// --- n-ary tuples ---

test('3-tuple', () => {
  const decoder = tuple(string, number, boolean);
  expect(decoder(['hello', 42, true])).toEqual(['hello', 42, true]);
  expect(() => decoder(['hello', 42])).toThrow();
  expect(() => decoder(['hello', 42, true, 'extra'])).toThrow();
});

test('4-tuple', () => {
  const decoder = tuple(string, number, boolean, string);
  expect(decoder(['a', 1, true, 'b'])).toEqual(['a', 1, true, 'b']);
});

test('5-tuple', () => {
  const decoder = tuple(string, number, boolean, string, number);
  expect(decoder(['a', 1, true, 'b', 2])).toEqual(['a', 1, true, 'b', 2]);
});

test('3-tuple with bare literals', () => {
  const decoder = tuple('hello', 42, true);
  expect(decoder(['hello', 42, true])).toEqual(['hello', 42, true]);
  expect(() => decoder(['hello', 43, true])).toThrow();
});

test('3-tuple literal form via decoder()', () => {
  const dec = decoder([string, number, boolean]);
  expect(dec(['hello', 42, true])).toEqual(['hello', 42, true]);
});

test('n-ary tuple in record', () => {
  const decoder = record({
    name: string,
    coords: tuple(number, number, number),
  });
  expect(decoder({ name: 'origin', coords: [0, 0, 0] }))
    .toEqual({ name: 'origin', coords: [0, 0, 0] });
});

test('n-ary tuple with .map()', () => {
  const dec = tuple(string, number, boolean).map(
    ([name, age, active]) => ({ name, age, active }),
  );
  expect(dec(['alice', 30, true])).toEqual({ name: 'alice', age: 30, active: true });
});

test('0-tuple', () => {
  const decoder = tuple();
  expect(decoder([])).toEqual([]);
  expect(() => decoder([1])).toThrow();
  expect(() => decoder('hi')).toThrow();
});

test('0-tuple in record', () => {
  const decoder = record({ unit: tuple(), otherData: string });
  expect(decoder({ unit: [], otherData: 'hello' }))
    .toEqual({ unit: [], otherData: 'hello' });
  expect(() => decoder({ unit: [1], otherData: 'hello' })).toThrow();
});

test('0-tuple literal form in record via decoder()', () => {
  const dec = record({ unit: decoder([]), otherData: string });
  expect(dec({ unit: [], otherData: 'hello' }))
    .toEqual({ unit: [], otherData: 'hello' });
});

test('0-tuple bare literal form in record', () => {
  const decoder = record({ unit: [] as [], otherData: string });
  expect(decoder({ unit: [], otherData: 'hello' }))
    .toEqual({ unit: [], otherData: 'hello' });
});

test('1-tuple', () => {
  const decoder = tuple(string);
  expect(decoder(['hello'])).toEqual(['hello']);
  expect(() => decoder([])).toThrow();
  expect(() => decoder(['a', 'b'])).toThrow();
});

test('1-tuple literal form', () => {
  const dec = decoder([string]);
  expect(dec(['hello'])).toEqual(['hello']);
});

test('tuple with records inside', () => {
  const decoder = tuple(
    { name: string, age: number },
    { city: string },
  );
  expect(decoder([{ name: 'alice', age: 30 }, { city: 'Oslo' }]))
    .toEqual([{ name: 'alice', age: 30 }, { city: 'Oslo' }]);
});

test('tuple with nested decoders', () => {
  const decoder = tuple(
    array(number),
    optional(string),
    nullable(boolean),
  );
  expect(decoder([[1, 2, 3], 'hello', null]))
    .toEqual([[1, 2, 3], 'hello', null]);
  expect(decoder([[1, 2, 3], undefined, true]))
    .toEqual([[1, 2, 3], undefined, true]);
});

test('tuple with union and intersection', () => {
  const decoder = tuple(
    union(string, number),
    intersection({ a: string }, { b: number }),
  );
  expect(decoder(['hello', { a: 'x', b: 1 }]))
    .toEqual(['hello', { a: 'x', b: 1 }]);
  expect(decoder([42, { a: 'x', b: 1 }]))
    .toEqual([42, { a: 'x', b: 1 }]);
});

test('tuple literal form in record', () => {
  const decoder = record({
    name: string,
    point: [number, number, number],
    pair: [string, boolean],
  });
  expect(decoder({ name: 'origin', point: [0, 0, 0], pair: ['yes', true] }))
    .toEqual({ name: 'origin', point: [0, 0, 0], pair: ['yes', true] });
});

test('array of 3-tuples', () => {
  const decoder = array(tuple(string, number, boolean));
  expect(decoder([['a', 1, true], ['b', 2, false]]))
    .toEqual([['a', 1, true], ['b', 2, false]]);
});

test('nested tuple in tuple', () => {
  const decoder = tuple(string, tuple(number, number));
  expect(decoder(['hello', [1, 2]])).toEqual(['hello', [1, 2]]);
});

// --- array with .map() ---

test('array with .map() — map over decoded', () => {
  const dec = array(number).map(xs => xs.map(x => x * 2));
  expect(dec([1, 2, 3])).toEqual([2, 4, 6]);
});

test('array with .map() — reduce', () => {
  const dec = array(number).map(xs => xs.reduce((a, b) => a + b, 0));
  expect(dec([1, 2, 3])).toBe(6);
});

test('array with .map() — still validates elements', () => {
  const dec = array(number).map(xs => xs.length);
  expect(() => dec([1, 'two', 3])).toThrow();
});

// --- nonEmptyArray ---

test('nonEmptyArray decodes non-empty arrays', () => {
  const decoder = nonEmptyArray(number);
  expect(decoder([1, 2, 3])).toEqual([1, 2, 3]);
  expect(decoder([42])).toEqual([42]);
});

test('nonEmptyArray rejects empty arrays', () => {
  const decoder = nonEmptyArray(number);
  expect(() => decoder([])).toThrow('non-empty');
});

test('nonEmptyArray validates elements', () => {
  const decoder = nonEmptyArray(number);
  expect(() => decoder(['a'])).toThrow();
});

test('nonEmptyArray with .map()', () => {
  const dec = nonEmptyArray(number).map(xs => xs[0]);
  expect(dec([10, 20, 30])).toBe(10);
});

test('nonEmptyArray in record', () => {
  const decoder = record({
    tags: nonEmptyArray(string),
  });
  expect(decoder({ tags: ['a', 'b'] })).toEqual({ tags: ['a', 'b'] });
  expect(() => decoder({ tags: [] })).toThrow('non-empty');
});

// --- lazy ---

test('lazy decoder — recursive tree structure', () => {
  type Tree = { value: string; children: Tree[] };
  const treeDecoder: Decoder<Tree> = record({
    value: string,
    children: array(lazy(() => treeDecoder)),
  });
  const input = {
    value: 'root',
    children: [
      { value: 'a', children: [] },
      { value: 'b', children: [
        { value: 'c', children: [] },
      ]},
    ],
  };
  expect(treeDecoder(input)).toEqual(input);
});

test('lazy decoder — rejects invalid nested data', () => {
  type Tree = { value: string; children: Tree[] };
  const treeDecoder: Decoder<Tree> = record({
    value: string,
    children: array(lazy(() => treeDecoder)),
  });
  expect(() => treeDecoder({
    value: 'root',
    children: [{ value: 123, children: [] }],
  })).toThrow();
});

test('lazy decoder — simple deferred evaluation', () => {
  const decoder = lazy(() => string);
  expect(decoder('hello')).toBe('hello');
  expect(() => decoder(42)).toThrow();
});

// --- optional with .map() ---

test('optional with .map() — transforms present value', () => {
  const dec = record({
    name: optional(string).map(s => s?.toUpperCase()),
  });
  expect(dec({ name: 'alice' })).toEqual({ name: 'ALICE' });
});

test('optional with .map() — passes through undefined', () => {
  const dec = record({
    name: optional(string).map(s => s?.toUpperCase()),
  });
  expect(dec({ name: undefined })).toEqual({ name: undefined });
});

// --- nullable with .map() ---

test('nullable with .map() — transforms non-null value', () => {
  const dec = record({
    name: nullable(string).map(s => s?.toUpperCase()),
  });
  expect(dec({ name: 'alice' })).toEqual({ name: 'ALICE' });
});

test('nullable with .map() — maps over null too', () => {
  const dec = record({
    name: nullable(string).map(s => s !== null ? s.toUpperCase() : 'N/A'),
  });
  expect(dec({ name: null })).toEqual({ name: 'N/A' });
});

// --- set with .map() ---

test('set with .map() — transform to array', () => {
  const dec = set(number).map(s => Array.from(s).sort());
  expect(dec([3, 1, 2])).toEqual([1, 2, 3]);
});

test('set with .map() — get size', () => {
  const dec = set(string).map(s => s.size);
  expect(dec(['a', 'b', 'a'])).toBe(2);
});

// --- objectOf with .map() ---

test('objectOf with .map() — transform record', () => {
  const dec = objectOf(number).map(r => Object.values(r).reduce((a, b) => a + b, 0));
  expect(dec({ a: 1, b: 2, c: 3 })).toBe(6);
});

test('objectOf with keys and .map()', () => {
  const dec = objectOf(number, ['x', 'y']).map(r => r.x + r.y);
  expect(dec({ x: 10, y: 20 })).toBe(30);
});

// --- dict with .map() ---

test('dict with .map() — transform map', () => {
  const dec = dict(number).map(m => m.size);
  expect(dec({ a: 1, b: 2 })).toBe(2);
});

test('dict with keys and .map()', () => {
  const dec = dict(string, ['a', 'b']).map(m => Array.from(m.values()).join(','));
  expect(dec({ a: 'hello', b: 'world' })).toBe('hello,world');
});

// --- README examples (verbatim) ---

test('README: User decoder (The idea)', () => {
  const userDecoder = record({
    id: number,
    username: string,
    isBanned: boolean,
  });
  expect(userDecoder({ id: 1, username: 'Fred', isBanned: false }))
    .toEqual({ id: 1, username: 'Fred', isBanned: false });
});

test('README: User with optional/array/union (Usage)', () => {
  const userDecoder = record({
    id: number,
    username: string,
    isBanned: boolean,
    phoneNumbers: array(string),
    ssn: optional(string),
    creditCardNumber: union(string, number),
  });
  expect(userDecoder({
    id: 1, username: 'Fred', isBanned: true,
    phoneNumbers: ['555-1234'], ssn: undefined, creditCardNumber: '1234',
  })).toEqual({
    id: 1, username: 'Fred', isBanned: true,
    phoneNumbers: ['555-1234'], ssn: undefined, creditCardNumber: '1234',
  });
});

test('README: User with nested address (Usage)', () => {
  const userDecoder = record({
    id: number,
    username: string,
    isBanned: boolean,
    phoneNumbers: array(string),
    ssn: optional(string),
    creditCardNumber: union(string, number),
    address: {
      city: string,
      timezones: array({ info: string, optionalInfo: optional(array(number)) }),
    },
  });
  expect(userDecoder({
    id: 1, username: 'Fred', isBanned: true,
    phoneNumbers: ['555-1234'], ssn: undefined, creditCardNumber: 42,
    address: {
      city: 'Oslo',
      timezones: [{ info: 'CET', optionalInfo: [1, 2] }],
    },
  })).toEqual({
    id: 1, username: 'Fred', isBanned: true,
    phoneNumbers: ['555-1234'], ssn: undefined, creditCardNumber: 42,
    address: {
      city: 'Oslo',
      timezones: [{ info: 'CET', optionalInfo: [1, 2] }],
    },
  });
});

test('README: tuple (Advanced usage)', () => {
  const stringAndNumberDecoder = tuple(string, number);
  expect(stringAndNumberDecoder(['user', 2])).toEqual(['user', 2]);
});

test('README: tuple literal syntax', () => {
  const stringAndNumberDecoder = decoder([string, number]);
  expect(stringAndNumberDecoder(['user', 2])).toEqual(['user', 2]);
});

test('README: record with inline tuple literals', () => {
  const myDecoder = record({
    username: string,
    result: [string, number],
    results: array([string, number]),
  });
  expect(myDecoder({
    username: 'alice',
    result: ['ok', 42],
    results: [['a', 1], ['b', 2]],
  })).toEqual({
    username: 'alice',
    result: ['ok', 42],
    results: [['a', 1], ['b', 2]],
  });
});

test('README: dict (Custom decoders)', () => {
  const myDictionary = { one: 1, two: 2, three: 3 };
  const numberDictionaryDecoder = dict(number);
  const myMap = numberDictionaryDecoder(myDictionary);
  expect(myMap.get('two')).toBe(2);
});

test('README: objectOf', () => {
  const scores = objectOf(number);
  const result = scores({ math: 90, english: 85 });
  expect(result.math).toBe(90);
});

test('README: objectOf constrained keys', () => {
  const sizes = objectOf(number, ['small', 'medium', 'large']);
  expect(sizes({ small: 1, medium: 2, large: 3 })).toEqual({ small: 1, medium: 2, large: 3 });
  expect(() => sizes({ small: 1, xl: 4 })).toThrow();
});

test('README: map inline definition', () => {
  const userListDecoder = map({
    id: number,
    username: string,
    isBanned: boolean,
  }, x => x.id);
  const result = userListDecoder([
    { id: 1, username: 'Fred', isBanned: true },
    { id: 2, username: 'Olga', isBanned: false },
  ]);
  expect(result.get(1)).toEqual({ id: 1, username: 'Fred', isBanned: true });
  expect(result.get(2)).toEqual({ id: 2, username: 'Olga', isBanned: false });
});

test('README: field (Low level access)', () => {
  const userDecoder = record({
    month: field('dateOfBirth', date).map(d => d.getMonth() + 1),
    year: field('dateOfBirth', date).map(d => d.getFullYear()),
  });
  expect(userDecoder({ dateOfBirth: '2000-06-15T00:00:00Z' }))
    .toEqual({ month: 6, year: 2000 });
});

test('README: at standalone', () => {
  const userName = at('response', 'data', 'user', 'name').chain(string);
  expect(userName({ response: { data: { user: { name: 'alice' } } } })).toBe('alice');
});

test('README: at inside record via field', () => {
  const dec = record({
    name: field('response').chain(at('data', 'user', 'name')).chain(string),
    score: field('response').chain(at('data', 'user', 'stats', 'score')).chain(number),
  });
  expect(dec({
    response: { data: { user: { name: 'alice', stats: { score: 99 } } } },
  })).toEqual({ name: 'alice', score: 99 });
});

test('README: fields (Low level access)', () => {
  const userDecoder = record({
    identifier: fields({ username: string, userId: number })
      .map(({ username, userId }) => `user:${username}:${userId}`),
  });
  expect(userDecoder({ username: 'hunter2', userId: 3 }))
    .toEqual({ identifier: 'user:hunter2:3' });
});

test('README: integer', () => {
  expect(integer(42)).toBe(42);
  expect(() => integer(3.14)).toThrow();
});

test('README: unknown in record', () => {
  const decoder = record({ name: string, metadata: unknown });
  expect(decoder({ name: 'x', metadata: { anything: true } }))
    .toEqual({ name: 'x', metadata: { anything: true } });
});

test('README: always in union', () => {
  const decoder = union(
    record({ status: 'ok', data: string }),
    always({ status: 'error', data: '' }),
  );
  expect(decoder({ status: 'ok', data: 'hello' }))
    .toEqual({ status: 'ok', data: 'hello' });
  expect(decoder('garbage')).toEqual({ status: 'error', data: '' });
});

test('README: literal', () => {
  const boolDecoder = literal(true);
  expect(boolDecoder(true)).toBe(true);
  expect(() => boolDecoder(false)).toThrow();

  const numDecoder = literal(42);
  expect(numDecoder(42)).toBe(42);
  expect(() => numDecoder(43)).toThrow();

  const levelDecoder = union(literal(1), literal(2), literal(3));
  expect(levelDecoder(1)).toBe(1);
  expect(levelDecoder(2)).toBe(2);
  expect(levelDecoder(3)).toBe(3);
  expect(() => levelDecoder(4)).toThrow();
});

test('README: regex in record', () => {
  const userDecoder = record({
    name: string,
    email: regex(/^[^@]+@[^@]+\.[^@]+$/),
    zip: regex(/^\d{5}$/),
  });
  expect(userDecoder({ name: 'alice', email: 'a@b.c', zip: '12345' }))
    .toEqual({ name: 'alice', email: 'a@b.c', zip: '12345' });
  expect(() => userDecoder({ name: 'alice', email: 'bad', zip: '12345' })).toThrow();
});

test('README: withDefault in record', () => {
  const userDecoder = record({
    name: string,
    role: withDefault(string, 'user'),
    score: withDefault(number, null),
  });
  expect(userDecoder({ name: 'alice', role: 'admin', score: 42 }))
    .toEqual({ name: 'alice', role: 'admin', score: 42 });
  expect(userDecoder({ name: 'alice' }))
    .toEqual({ name: 'alice', role: 'user', score: null });
});

test('README: bigint', () => {
  expect(bigint(BigInt(42))).toBe(BigInt(42));
  expect(bigint(42)).toBe(BigInt(42));
  expect(bigint('123')).toBe(BigInt(123));
  expect(() => bigint(3.14)).toThrow();

  const decoder = record({ name: string, balance: bigint });
  expect(decoder({ name: 'alice', balance: '9007199254740993' }))
    .toEqual({ name: 'alice', balance: BigInt('9007199254740993') });
});

test('README: withDefault + nullable pass-through', () => {
  const decoder = withDefault(nullable(number), null);
  expect(decoder(42)).toBe(42);
  expect(decoder(null)).toBe(null);    // valid decoded value, not fallback
  expect(decoder('bad')).toBe(null);   // decoder threw, fallback
});

test('README: .safeDecode() method', () => {
  const result = string.safeDecode('hello');
  expect(result).toEqual({ ok: true, value: 'hello' });
  if (result.ok) {
    expect(result.value).toBe('hello');
  }

  const failure = string.safeDecode(42);
  expect(failure.ok).toBe(false);
  if (!failure.ok) {
    expect(failure.error).toBeInstanceOf(DecodeError);
  }
});

test('README: .safeDecode() on record', () => {
  const userDecoder = record({ name: string, age: number });
  const result = userDecoder.safeDecode({ name: 'alice', age: 30 });
  expect(result).toEqual({ ok: true, value: { name: 'alice', age: 30 } });
});

test('README: standalone safeDecode', () => {
  const result = safeDecode(string, 'hello');
  expect(result).toEqual({ ok: true, value: 'hello' });
});

test('README: error structure — path through record > array', () => {
  const dec = record({
    users: array({ name: string, age: number }),
  });

  const result = safeDecode(dec, {
    users: [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 'not a number' },
    ],
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    const error = result.error;
    expect(error.message).toBe('The value `not a number` is not of type `number`, but is of type `string`');
    expect(error.path).toEqual(['users', 1, 'age']);
    expect(error.getPathString()).toBe('/users/1/age');
    expect(error.expected).toBe('number');
    expect(error.received).toBe('not a number');
    expect(error.toString()).toBe('at /users/1/age: The value `not a number` is not of type `number`, but is of type `string`');
  }
});

test('README: error structure — union children', () => {
  const result = safeDecode(union('active', 'inactive'), 'unknown');
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.message).toBe('None of the union cases matched');
    expect(result.error.children).toHaveLength(2);
    expect(result.error.toString()).toContain('None of the union cases matched');
    expect(result.error.toString()).toContain('not the literal `active`');
    expect(result.error.toString()).toContain('not the literal `inactive`');
  }
});

test('README: .map() — field extract/transform', () => {
  const dec = record({
    thing: field('nested', { theThingIWant: string }).map(x => x.theThingIWant),
    doubled: field('value', number).map(x => x * 2),
  });
  expect(dec({ nested: { theThingIWant: 'found' }, value: 21 }))
    .toEqual({ thing: 'found', doubled: 42 });
});

test('README: .map() — tuple pointDecoder', () => {
  const pointDecoder = tuple(number, number).map(([x, y]) => ({ x, y }));
  expect(pointDecoder([3, 4])).toEqual({ x: 3, y: 4 });
});

test('README: .map() — array sumDecoder', () => {
  const sumDecoder = array(number).map(xs => xs.reduce((a, b) => a + b, 0));
  expect(sumDecoder([1, 2, 3])).toBe(6);
});

test('README: .map() — literal roleDecoder', () => {
  const roleDecoder = literal('admin').map(x => x.toUpperCase());
  expect(roleDecoder('admin')).toBe('ADMIN');
  expect(() => roleDecoder('user')).toThrow();
});

test('README: .map() — optional upperName', () => {
  const upperName = optional(string).map(s => s?.toUpperCase());
  expect(upperName('alice')).toBe('ALICE');
  expect(upperName(undefined)).toBe(undefined);
});

test('README: .map() — nullable upperOrNull', () => {
  const upperOrNull = nullable(string).map(s => s !== null ? s.toUpperCase() : null);
  expect(upperOrNull('alice')).toBe('ALICE');
  expect(upperOrNull(null)).toBe(null);
});

test('README: .map() — set countUnique', () => {
  const countUnique = set(string).map(s => s.size);
  expect(countUnique(['a', 'b', 'a'])).toBe(2);
});

test('README: .map() — objectOf totalScore', () => {
  const totalScore = objectOf(number).map(r => Object.values(r).reduce((a, b) => a + b, 0));
  expect(totalScore({ a: 1, b: 2, c: 3 })).toBe(6);
});

test('README: .map() — dict joined', () => {
  const joined = dict(string, ['a', 'b']).map(m => Array.from(m.values()).join(','));
  expect(joined({ a: 'hello', b: 'world' })).toBe('hello,world');
});

test('README: .map() with union', () => {
  const dec = union(string, number).map(x => String(x));
  expect(dec('hello')).toBe('hello');
  expect(dec(42)).toBe('42');
});

test('README: .map() with intersection', () => {
  const combined = intersection({ a: string }, { b: number }).map(x => `${x.a}-${x.b}`);
  expect(combined({ a: 'hello', b: 42 })).toBe('hello-42');
});

test('README: .map() chaining', () => {
  const isLong = string.map(s => s.length).map(n => n > 3);
  expect(isLong('hello')).toBe(true);
  expect(isLong('hi')).toBe(false);
});

test('README: nonEmptyArray in record', () => {
  const decoder = record({
    tags: nonEmptyArray(string),
  });
  expect(decoder({ tags: ['a', 'b'] })).toEqual({ tags: ['a', 'b'] });
  expect(() => decoder({ tags: [] })).toThrow();
});

test('README: .chain() — string to bigint', () => {
  const balance = field('balance', string).chain(bigint);
  expect(balance({ balance: '9007199254740993' })).toBe(BigInt('9007199254740993'));
});

test('README: .chain() — unknown to record', () => {
  const payload = field('data', unknown).chain({ name: string, age: number });
  expect(payload({ data: { name: 'alice', age: 30 } }))
    .toEqual({ name: 'alice', age: 30 });
});

test('README: .chain() — string to date to year', () => {
  const yearFromString = string.chain(date).map(d => d.getFullYear());
  expect(yearFromString('2025-01-15T00:00:00Z')).toBe(2025);
});

test('README: missing decoder', () => {
  const decoder = record({
    name: string,
    deletedField: missing,
  });
  expect(decoder({ name: 'alice' })).toEqual({ name: 'alice' });
  expect(() => decoder({ name: 'alice', deletedField: true })).toThrow();
});

test('README: lazy recursive tree', () => {
  type Tree = { value: string; children: Tree[] };
  const treeDecoder: Decoder<Tree> = record({
    value: string,
    children: array(lazy(() => treeDecoder)),
  });
  expect(treeDecoder({
    value: 'root',
    children: [
      { value: 'leaf', children: [] },
    ],
  })).toEqual({
    value: 'root',
    children: [
      { value: 'leaf', children: [] },
    ],
  });
});

// ---------------------------------------------------------------------------
// v2: Callable Decoder objects
// ---------------------------------------------------------------------------

test('Decoder.map chains transformations', () => {
  const length = string.map(s => s.length);
  expect(length('hello')).toBe(5);
  expect(length('')).toBe(0);
  expect(() => length(42)).toThrow();
});

test('Decoder.map chains multiple times', () => {
  const isLong = string.map(s => s.length).map(n => n > 3);
  expect(isLong('hello')).toBe(true);
  expect(isLong('hi')).toBe(false);
});

test('Decoder.map on record decoder', () => {
  const getName = record({ name: string, age: number }).map(x => x.name);
  expect(getName({ name: 'alice', age: 30 })).toBe('alice');
});

test('Decoder.map on array decoder', () => {
  const sum = array(number).map(xs => xs.reduce((a, b) => a + b, 0));
  expect(sum([1, 2, 3])).toBe(6);
});

test('Decoder.map on union decoder', () => {
  const asString = union(string, number).map(x => String(x));
  expect(asString('hello')).toBe('hello');
  expect(asString(42)).toBe('42');
});

test('Decoder.safeDecode returns ok on success', () => {
  const result = string.safeDecode('hello');
  expect(result).toEqual({ ok: true, value: 'hello' });
});

test('Decoder.safeDecode returns error on failure', () => {
  const result = string.safeDecode(42);
  expect(result.ok).toBe(false);
  expect((result as any).error).toBeTruthy();
});

test('Decoder.safeDecode on record', () => {
  const dec = record({ name: string, age: number });
  expect(dec.safeDecode({ name: 'alice', age: 30 })).toEqual({
    ok: true,
    value: { name: 'alice', age: 30 },
  });
  expect(dec.safeDecode({ name: 'alice' }).ok).toBe(false);
});

test('Decoder.safeDecode on mapped decoder', () => {
  const length = string.map(s => s.length);
  expect(length.safeDecode('hello')).toEqual({ ok: true, value: 5 });
  expect(length.safeDecode(42).ok).toBe(false);
});

test('decoder() wraps plain function into Decoder', () => {
  const myDecoder = decoder((input: unknown) => {
    if (typeof input !== 'string') throw 'not a string';
    return input.toUpperCase();
  });
  expect(myDecoder('hello')).toBe('HELLO');
  expect(myDecoder.map(s => s.length)('hello')).toBe(5);
  expect(myDecoder.safeDecode(42).ok).toBe(false);
});

test('decoder() wraps literal forms', () => {
  const dec = decoder({ name: string, age: number });
  expect(dec({ name: 'alice', age: 30 })).toEqual({ name: 'alice', age: 30 });
  expect(dec.map(x => x.name)({ name: 'alice', age: 30 })).toBe('alice');
});

test('primitive decoders have .map and .safeDecode', () => {
  expect(number.map(n => n * 2)(21)).toBe(42);
  expect(boolean.map(b => !b)(true)).toBe(false);
  expect(number.safeDecode('bad').ok).toBe(false);
  expect(number.safeDecode(42)).toEqual({ ok: true, value: 42 });
});

// --- .map() on remaining combinators ---

test('always.map()', () => {
  const dec = always(42).map(n => n * 2);
  expect(dec('anything')).toBe(84);
  expect(dec(null)).toBe(84);
});

test('lazy.map()', () => {
  const dec = lazy(() => string).map(s => s.length);
  expect(dec('hello')).toBe(5);
  expect(() => dec(42)).toThrow();
});

test('withDefault.map()', () => {
  const dec = withDefault(number, 0).map(n => n + 1);
  expect(dec(10)).toBe(11);
  expect(dec('bad')).toBe(1);
});

test('intersection.map()', () => {
  const dec = intersection({ a: string }, { b: number }).map(x => `${x.a}:${x.b}`);
  expect(dec({ a: 'hi', b: 5 })).toBe('hi:5');
});

test('fields.map()', () => {
  const dec = record({ x: number, y: number }).map(
    ({ x, y }) => Math.sqrt(x * x + y * y),
  );
  expect(dec({ x: 3, y: 4 })).toBe(5);
});

test('nullable.map()', () => {
  const dec = nullable(number).map(n => n !== null ? n * 2 : -1);
  expect(dec(5)).toBe(10);
  expect(dec(null)).toBe(-1);
});

test('optional.map()', () => {
  const dec = optional(number).map(n => n !== undefined ? n * 2 : -1);
  expect(dec(5)).toBe(10);
  expect(dec(undefined)).toBe(-1);
});

test('set.map()', () => {
  const dec = set(number).map(s => Array.from(s).sort((a, b) => a - b));
  expect(dec([3, 1, 2, 3, 1])).toEqual([1, 2, 3]);
});

test('map combinator .map()', () => {
  const dec = map(
    record({ id: number, name: string }),
    x => x.id,
  ).map(m => m.size);
  expect(dec([{ id: 1, name: 'a' }, { id: 2, name: 'b' }])).toBe(2);
});

// --- .safeDecode() on combinators ---

test('array.safeDecode()', () => {
  const dec = array(number);
  expect(dec.safeDecode([1, 2, 3])).toEqual({ ok: true, value: [1, 2, 3] });
  expect(dec.safeDecode('bad').ok).toBe(false);
});

test('tuple.safeDecode()', () => {
  const dec = tuple(string, number);
  expect(dec.safeDecode(['a', 1])).toEqual({ ok: true, value: ['a', 1] });
  expect(dec.safeDecode([1, 'a']).ok).toBe(false);
});

test('union.safeDecode()', () => {
  const dec = union(string, number);
  expect(dec.safeDecode('hi')).toEqual({ ok: true, value: 'hi' });
  expect(dec.safeDecode(true).ok).toBe(false);
});

test('literal.safeDecode()', () => {
  const dec = literal('admin');
  expect(dec.safeDecode('admin')).toEqual({ ok: true, value: 'admin' });
  expect(dec.safeDecode('user').ok).toBe(false);
});

// --- .chain() ---

test('chain into a record literal form', () => {
  // decode a "payload" key, then decode its value as a record
  const dec = field('payload', unknown).chain({ name: string, age: number });
  expect(dec({ payload: { name: 'alice', age: 30 } }))
    .toEqual({ name: 'alice', age: 30 });
});

test('chain into a tuple literal form', () => {
  const dec = field('coords', unknown).chain([number, number]);
  expect(dec({ coords: [3, 4] })).toEqual([3, 4]);
});

test('chain string into bigint decoder', () => {
  // parse a JSON field as string, then decode that string as bigint
  const dec = field('balance', string).chain(bigint);
  expect(dec({ balance: '9007199254740993' })).toBe(BigInt('9007199254740993'));
});

test('chain unknown through a decoder pipeline', () => {
  // unknown -> array(number) -> map to sum
  const dec = unknown.chain(array(number)).map(xs => xs.reduce((a, b) => a + b, 0));
  expect(dec([1, 2, 3])).toBe(6);
});

test('chain with a string literal form', () => {
  // decode something as unknown, then assert it's the exact string 'ok'
  const dec = unknown.chain('ok');
  expect(dec('ok')).toBe('ok');
  expect(() => dec('nope')).toThrow();
});

test('chain preserves field tag', () => {
  // field().chain() should still work inside a record
  const dec = record({
    user: field('data', unknown).chain({ name: string, email: string }),
  });
  expect(dec({ data: { name: 'bob', email: 'bob@test.com' } }))
    .toEqual({ user: { name: 'bob', email: 'bob@test.com' } });
});

test('chain multiple steps', () => {
  // string -> date -> map to year
  const yearFromString = string.chain(date).map(d => d.getFullYear());
  expect(yearFromString('2025-01-15T00:00:00Z')).toBe(2025);
});

test('chain deep pipeline — validate, decode, transform', () => {
  // unknown → assert it's a string → validate format with regex → parse as date → extract year
  const yearPipeline = unknown
    .chain(string)
    .chain(regex(/^\d{4}-\d{2}-\d{2}/))
    .chain(date)
    .map(d => d.getFullYear());
  expect(yearPipeline('2025-06-15T00:00:00Z')).toBe(2025);
  expect(() => yearPipeline('not-a-date')).toThrow();
  expect(() => yearPipeline(42)).toThrow();
});

test('chain field decoders to drill into nested objects', () => {
  const dec = unknown
    .chain(field('x'))
    .chain(field('y'))
    .chain(field('z'))
    .chain(string);
  expect(dec({ x: { y: { z: 'hello' } } })).toBe('hello');
  expect(() => dec({ x: { y: { z: 42 } } })).toThrow();
  expect(() => dec({ x: { wrong: 'key' } })).toThrow();
});

test('field without decoder defaults to unknown', () => {
  const dec = field('name');
  expect(dec({ name: 'alice' })).toBe('alice');
  expect(dec({ name: 42 })).toBe(42);
  expect(dec({ name: { nested: true } })).toEqual({ nested: true });
});

// --- at() ---

test('at standalone on deeply nested API response', () => {
  const userName = at('response', 'data', 'user', 'name').chain(string);
  expect(userName({ response: { data: { user: { name: 'alice' } } } })).toBe('alice');
  expect(() => userName({ response: { data: { user: { name: 42 } } } })).toThrow();
  expect(() => userName({ response: { wrong: 'shape' } })).toThrow();
});

test('field + at combo in record — different source and target keys', () => {
  const dec = record({
    name: field('response').chain(at('data', 'user', 'name')).chain(string),
    score: field('response').chain(at('data', 'user', 'stats', 'score')).chain(number),
    city: field('meta').chain(at('location', 'city')).chain(string),
  });
  const input = {
    response: { data: { user: { name: 'alice', stats: { score: 99 } } } },
    meta: { location: { city: 'Oslo' } },
  };
  expect(dec(input)).toEqual({ name: 'alice', score: 99, city: 'Oslo' });
});

test('at drills into nested object', () => {
  const dec = at('x', 'y', 'z').chain(string);
  expect(dec({ x: { y: { z: 'hello' } } })).toBe('hello');
});

test('at single key is equivalent to field', () => {
  const dec = at('name').chain(string);
  expect(dec({ name: 'alice' })).toBe('alice');
});

test('at works inside record via field', () => {
  const dec = record({
    city: field('address').chain(at('city')).chain(string),
    zip: field('address').chain(at('zip')).chain(number),
    deepName: field('users').chain(at('0', 'name')).chain(string),
  });
  expect(dec({ address: { city: 'Oslo', zip: 1234 }, users: { '0': { name: 'alice' } } }))
    .toEqual({ city: 'Oslo', zip: 1234, deepName: 'alice' });
});

test('at with .chain into a record literal', () => {
  const dec = at('response', 'data').chain({ name: string, age: number });
  expect(dec({ response: { data: { name: 'bob', age: 25 } } }))
    .toEqual({ name: 'bob', age: 25 });
});

test('at throws on missing intermediate key', () => {
  const dec = at('x', 'y', 'z');
  expect(() => dec({ x: { wrong: 'key' } })).toThrow();
});

test('at deep drill with map', () => {
  const dec = at('config', 'db', 'port').chain(number).map(p => `localhost:${p}`);
  expect(dec({ config: { db: { port: 5432 } } })).toBe('localhost:5432');
});

test('chain with .map() between steps to unwrap layers', () => {
  // { wrapper: { payload: { value: '42' } } }
  // → extract wrapper → extract payload → extract value string → decode as bigint
  const dec = unknown
    .chain({ wrapper: { payload: { value: string } } })
    .map(x => x.wrapper.payload.value)
    .chain(bigint);
  expect(dec({ wrapper: { payload: { value: '42' } } })).toBe(BigInt(42));
});

test('chain rejects invalid intermediate values', () => {
  const dec = string.chain(bigint);
  expect(() => dec('not-a-number')).toThrow();
});

test('chain with nested record literal', () => {
  const dec = unknown.chain({
    user: { name: string, scores: [number, number] },
    active: boolean,
  });
  const input = { user: { name: 'eve', scores: [90, 85] }, active: true };
  expect(dec(input)).toEqual(input);
});

// .default() and .create() tests

test('create with primitive default', () => {
  expect(string.default('John').create()).toBe('John');
  expect(number.default(42).create()).toBe(42);
  expect(boolean.default(true).create()).toBe(true);
});

test('create with explicit value overrides default', () => {
  expect(string.default('John').create('Alice')).toBe('Alice');
  expect(number.default(42).create(99)).toBe(99);
});

test('create without default throws', () => {
  expect(() => string.create()).toThrow('Decoder has no default value');
  expect(() => number.create()).toThrow('Decoder has no default value');
});

test('create with explicit value and no default', () => {
  expect(string.create('hello')).toBe('hello');
  expect(number.create(7)).toBe(7);
});

test('always has automatic default', () => {
  expect(always('member').create()).toBe('member');
  expect(always(42).create()).toBe(42);
});

test('withDefault has automatic default', () => {
  expect(withDefault(string, 'fallback').create()).toBe('fallback');
});

test('record create with all field defaults', () => {
  const User = record({
    name: string.default('John'),
    role: always('member'),
  });
  expect(User.create()).toEqual({ name: 'John', role: 'member' });
});

test('record create with patch overrides defaults', () => {
  const User = record({
    name: string.default('John'),
    age: integer.default(0),
    role: always('member'),
  });
  expect(User.create({ name: 'Alice', age: 30 })).toEqual({
    name: 'Alice',
    age: 30,
    role: 'member',
  });
});

test('record create throws when field has no default', () => {
  const User = record({
    name: string.default('John'),
    age: integer,
  });
  // @ts-expect-error — intentionally testing runtime error for missing required field
  expect(() => User.create()).toThrow("No default value for field 'age'");
});

test('record create with patch for required fields', () => {
  const User = record({
    name: string.default('John'),
    age: integer,
  });
  expect(User.create({ age: 25 })).toEqual({ name: 'John', age: 25 });
});

test('nested record create recursively constructs', () => {
  const Address = record({
    city: string.default('Unknown'),
    zip: string,
  });
  const User = record({
    name: string.default('John'),
    address: Address,
  });
  expect(User.create({ address: { zip: '10001' } })).toEqual({
    name: 'John',
    address: { city: 'Unknown', zip: '10001' },
  });
});

test('nested record create fully defaulted', () => {
  const Address = record({
    city: string.default('Unknown'),
    zip: string.default('00000'),
  });
  const User = record({
    name: string.default('John'),
    address: Address,
  });
  // address is auto-optional: all its fields have defaults
  expect(User.create()).toEqual({
    name: 'John',
    address: { city: 'Unknown', zip: '00000' },
  });
});

test('record create with .default() on the record itself', () => {
  const User = record({
    name: string,
    age: integer,
  });
  const DefaultUser = User.default({ name: 'John', age: 0 });
  expect(DefaultUser.create()).toEqual({ name: 'John', age: 0 });
});

test('record create with .default() and patch override', () => {
  const User = record({
    name: string,
    age: integer,
  });
  const DefaultUser = User.default({ name: 'John', age: 0 });
  expect(DefaultUser.create({ age: 30 })).toEqual({ name: 'John', age: 30 });
});

test('record create skips missing-tagged fields', () => {
  const Strict = record({
    name: string.default('John'),
    _extra: missing,
  });
  expect(Strict.create()).toEqual({ name: 'John' });
});

test('map applies to default', () => {
  const upper = string.default('John').map(s => s.toUpperCase());
  expect(upper.create()).toBe('JOHN');
});

test('map without default still has no default', () => {
  const upper = string.map(s => s.toUpperCase());
  expect(() => upper.create()).toThrow('Decoder has no default value');
});

test('map then default uses the explicit default', () => {
  const dec = string.map(s => s.toUpperCase()).default('ALICE');
  expect(dec.create()).toBe('ALICE');
});

test('default then map transforms the default', () => {
  const dec = string.default('hello').map(s => s.length);
  expect(dec.create()).toBe(5);
});

test('default then multiple maps chains transforms on default', () => {
  const dec = string.default('hello').map(s => s.toUpperCase()).map(s => s + '!');
  expect(dec.create()).toBe('HELLO!');
});

test('map then default then map applies last map to explicit default', () => {
  const dec = string.map(s => s.trim()).default('bob').map(s => s.toUpperCase());
  expect(dec.create()).toBe('BOB');
});

test('default overrides previous default', () => {
  const dec = string.default('first').default('second');
  expect(dec.create()).toBe('second');
});

test('default then map that changes type', () => {
  const dec = string.default('hello').map(s => ({ value: s, length: s.length }));
  expect(dec.create()).toEqual({ value: 'hello', length: 5 });
});

test('default then map in record field', () => {
  const User = record({
    name: string.default('john').map(s => s.toUpperCase()),
    age: integer.default(0).map(n => n + 1),
  });
  expect(User.create()).toEqual({ name: 'JOHN', age: 1 });
});

test('default still decodes normally', () => {
  const dec = string.default('John');
  expect(dec('hello')).toBe('hello');
  expect(() => dec(42)).toThrow();
});

test('create throws for all primitive decoders without defaults', () => {
  expect(() => integer.create()).toThrow('Decoder has no default value');
  expect(() => date.create()).toThrow('Decoder has no default value');
  expect(() => boolean.create()).toThrow('Decoder has no default value');
  expect(() => unknown.create()).toThrow('Decoder has no default value');
  expect(() => bigint.create()).toThrow('Decoder has no default value');
  expect(() => regex(/.*/).create()).toThrow('Decoder has no default value');
});

test('create throws for combinators without defaults', () => {
  expect(() => array(string).create()).toThrow('Decoder has no default value');
  expect(() => optional(string).create()).toThrow('Decoder has no default value');
  expect(() => nullable(string).create()).toThrow('Decoder has no default value');
  expect(() => union(string, number).create()).toThrow('Decoder has no default value');
  expect(() => set(string).create()).toThrow('Decoder has no default value');
});

test('create with default on all primitive decoders', () => {
  expect(integer.default(7).create()).toBe(7);
  expect(date.default(new Date('2024-01-01')).create()).toEqual(new Date('2024-01-01'));
  expect(boolean.default(false).create()).toBe(false);
  expect(unknown.default('anything').create()).toBe('anything');
  expect(bigint.default(BigInt(99)).create()).toBe(BigInt(99));
  expect(regex(/.*/).default('hello').create()).toBe('hello');
});

test('create with default on combinators', () => {
  expect(array(string).default(['a', 'b']).create()).toEqual(['a', 'b']);
  expect(optional(string).default(undefined).create()).toBe(undefined);
  expect(nullable(string).default(null).create()).toBe(null);
  expect(union(string, number).default('hello').create()).toBe('hello');
  expect(set(string).default(new Set(['x'])).create()).toEqual(new Set(['x']));
  expect(nonEmptyArray(string).default(['a']).create()).toEqual(['a']);
});

test('create with default on tuple', () => {
  expect(tuple(string, number).default(['a', 1]).create()).toEqual(['a', 1]);
});

test('create with default on intersection', () => {
  const dec = intersection({ a: string }, { b: number });
  expect(dec.default({ a: 'x', b: 1 }).create()).toEqual({ a: 'x', b: 1 });
});

test('create with default on dict and objectOf', () => {
  expect(dict(number).default(new Map([['a', 1]])).create()).toEqual(new Map([['a', 1]]));
  expect(objectOf(number).default({ x: 1 }).create()).toEqual({ x: 1 });
});

test('create with default on field and fields', () => {
  expect(field('name', string).default('John').create()).toBe('John');
  expect(fields({ a: string, b: number }).default({ a: 'x', b: 1 }).create()).toEqual({ a: 'x', b: 1 });
});

test('create with default on lazy', () => {
  expect(lazy(() => string).default('lazy').create()).toBe('lazy');
});

test('create with default on decoder()', () => {
  expect(decoder(string).default('wrapped').create()).toBe('wrapped');
});

test('record create error names the missing field', () => {
  const dec = record({ name: string.default('John'), email: string });
  // @ts-expect-error — intentionally testing runtime error for missing required field
  expect(() => dec.create()).toThrow("No default value for field 'email'");
});

test('nested record create error names the immediate missing field', () => {
  const inner = record({ city: string });
  const outer = record({ name: string.default('John'), address: inner });
  // @ts-expect-error — intentionally testing runtime error for missing required field
  expect(() => outer.create()).toThrow("No default value for field 'address'");
});

test('nested record create with partial patch missing inner field', () => {
  const inner = record({ city: string, zip: string });
  const outer = record({ name: string.default('John'), address: inner });
  // @ts-expect-error — intentionally testing runtime error for missing inner field
  expect(() => outer.create({ address: { city: 'NY' } })).toThrow("No default value for field 'address'");
});

// README examples for .default() and .create()

test('README: primitive default and create', () => {
  const name = string.default('John');
  expect(name.create()).toBe('John');
  expect(name.create('Alice')).toBe('Alice');
});

test('README: always and withDefault auto-default', () => {
  expect(always('member').create()).toBe('member');
  expect(withDefault(string, 'fallback').create()).toBe('fallback');
});

test('README: literal auto-default', () => {
  expect(literal('admin').create()).toBe('admin');
  expect(literal(42).create()).toBe(42);
});

test('README: bare literals auto-default in record', () => {
  const eventDecoder = record({
    type: 'click',
    version: literal(2),
    label: string.default('untitled'),
  });

  expect(eventDecoder.create()).toEqual({ type: 'click', version: 2, label: 'untitled' });
});

test('README: tuple auto-default', () => {
  const point = tuple(number.default(0), number.default(0));
  expect(point.create()).toEqual([0, 0]);
  expect(point.create([1, 2])).toEqual([1, 2]);
});

test('README: bare tuple literal form auto-default in record', () => {
  const dec = record({
    origin: [number.default(0), number.default(0)],
    tag: 'point',
  });
  expect(dec.create()).toEqual({ origin: [0, 0], tag: 'point' });
});

test('README: record create with field defaults', () => {
  const userDecoder = record({
    name: string.default('John'),
    age: integer,
    role: always('member'),
  });

  expect(userDecoder.create({ age: 25 })).toEqual({
    name: 'John',
    age: 25,
    role: 'member',
  });
});

test('README: nested record create', () => {
  const addressDecoder = record({
    city: string.default('Unknown'),
    zip: string.default('00000'),
  });
  const userDecoder2 = record({
    name: string.default('John'),
    address: addressDecoder,
  });

  // address is auto-optional: all its fields have defaults
  expect(userDecoder2.create()).toEqual({
    name: 'John',
    address: { city: 'Unknown', zip: '00000' },
  });

  expect(userDecoder2.create({ address: { zip: '10001' } })).toEqual({
    name: 'John',
    address: { city: 'Unknown', zip: '10001' },
  });
});

test('README: default then map', () => {
  const upper = string.default('hello').map(s => s.toUpperCase());
  expect(upper.create()).toBe('HELLO');
});

test('README: map then default', () => {
  const dec = string.map(s => s.toUpperCase()).default('ALICE');
  expect(dec.create()).toBe('ALICE');
});

test('README: record-level default with patch', () => {
  const pointDecoder = record({ x: number, y: number });
  const origin = pointDecoder.default({ x: 0, y: 0 });
  expect(origin.create()).toEqual({ x: 0, y: 0 });
  expect(origin.create({ x: 5 })).toEqual({ x: 5, y: 0 });
});

// Deep combination tests for .default() / .create() type enforcement

test('three levels of nesting, all defaults', () => {
  const Coord = record({ x: number.default(0), y: number.default(0) });
  const Location = record({ name: string.default('here'), coord: Coord });
  const User = record({ id: string.default('anon'), location: Location });
  expect(User.create()).toEqual({
    id: 'anon',
    location: { name: 'here', coord: { x: 0, y: 0 } },
  });
});

test('three levels of nesting, patch at deepest level', () => {
  const Coord = record({ x: number.default(0), y: number });
  const Location = record({ name: string.default('here'), coord: Coord });
  const User = record({ id: string.default('anon'), location: Location });
  expect(User.create({ location: { coord: { y: 42 } } })).toEqual({
    id: 'anon',
    location: { name: 'here', coord: { x: 0, y: 42 } },
  });
});

test('three levels, override at every level', () => {
  const Coord = record({ x: number.default(0), y: number.default(0) });
  const Location = record({ name: string.default('here'), coord: Coord });
  const User = record({ id: string.default('anon'), location: Location });
  expect(User.create({
    id: 'user-1',
    location: { name: 'there', coord: { x: 1, y: 2 } },
  })).toEqual({
    id: 'user-1',
    location: { name: 'there', coord: { x: 1, y: 2 } },
  });
});

test('mix of defaulted and required fields at multiple levels', () => {
  const Address = record({
    street: string,
    city: string.default('Unknown'),
    zip: string,
  });
  const Person = record({
    name: string,
    age: integer.default(0),
    address: Address,
  });
  expect(Person.create({
    name: 'Alice',
    address: { street: '123 Main', zip: '10001' },
  })).toEqual({
    name: 'Alice',
    age: 0,
    address: { street: '123 Main', city: 'Unknown', zip: '10001' },
  });
});

test('nested record with always() fields', () => {
  const Config = record({
    version: always(2),
    debug: always(false),
    name: string,
  });
  const App = record({
    config: Config,
    env: always('production'),
  });
  expect(App.create({ config: { name: 'myapp' } })).toEqual({
    config: { version: 2, debug: false, name: 'myapp' },
    env: 'production',
  });
});

test('nested record with withDefault() fields', () => {
  const Settings = record({
    theme: withDefault(string, 'light'),
    lang: withDefault(string, 'en'),
  });
  const User = record({ name: string.default('anon'), settings: Settings });
  expect(User.create()).toEqual({
    name: 'anon',
    settings: { theme: 'light', lang: 'en' },
  });
  expect(User.create({ settings: { theme: 'dark' } })).toEqual({
    name: 'anon',
    settings: { theme: 'dark', lang: 'en' },
  });
});

test('nested record with .map() on defaulted fields', () => {
  const Inner = record({
    label: string.default('hello').map(s => s.toUpperCase()),
    count: integer.default(1).map(n => n * 10),
  });
  const Outer = record({ tag: always('x'), inner: Inner });
  expect(Outer.create()).toEqual({
    tag: 'x',
    inner: { label: 'HELLO', count: 10 },
  });
});

test('fully-defaulted inner with required outer sibling', () => {
  const Meta = record({ created: always('now'), version: always(1) });
  const Doc = record({ title: string, meta: Meta });
  // meta is auto-optional (fully defaulted), but title is required
  expect(Doc.create({ title: 'My Doc' })).toEqual({
    title: 'My Doc',
    meta: { created: 'now', version: 1 },
  });
});

test('partially-defaulted inner requires inner patch', () => {
  const Size = record({ width: number, height: number.default(100) });
  const Box = record({ color: string.default('red'), size: Size });
  // size is required because width has no default
  expect(Box.create({ size: { width: 50 } })).toEqual({
    color: 'red',
    size: { width: 50, height: 100 },
  });
});

test('record .default() at intermediate level', () => {
  const Inner = record({ a: string, b: number });
  const Outer = record({
    x: always(true),
    inner: Inner.default({ a: 'hi', b: 0 }),
  });
  // inner has an explicit .default(), so it's a DefaultDecoder → optional
  expect(Outer.create()).toEqual({
    x: true,
    inner: { a: 'hi', b: 0 },
  });
  // patch overrides the default
  expect(Outer.create({ inner: { a: 'bye', b: 99 } })).toEqual({
    x: true,
    inner: { a: 'bye', b: 99 },
  });
  // partial patch merges with the record-level default
  expect(Outer.create({ inner: { a: 'bye' } })).toEqual({
    x: true,
    inner: { a: 'bye', b: 0 },
  });
});

test('missing field in nested record is skipped', () => {
  const Strict = record({
    name: string.default('John'),
    _removed: missing,
  });
  const Outer = record({ item: Strict, tag: always('ok') });
  expect(Outer.create()).toEqual({
    item: { name: 'John' },
    tag: 'ok',
  });
});

test('create patch only requires non-default fields', () => {
  const Dec = record({
    a: string,
    b: string.default('B'),
    c: number,
    d: always(true),
    e: withDefault(integer, 0),
  });
  expect(Dec.create({ a: 'A', c: 42 })).toEqual({
    a: 'A', b: 'B', c: 42, d: true, e: 0,
  });
  // override all defaults
  expect(Dec.create({ a: 'X', b: 'Y', c: 1, d: true, e: 99 })).toEqual({
    a: 'X', b: 'Y', c: 1, d: true, e: 99,
  });
});

// ============================================================
// Bug fix: .chain() should not leak recordSchemaTag
// ============================================================

test('.chain() does not leak recordSchemaTag', () => {
  const rec = record({ a: string.default('x') });
  const chained = rec.chain(string);
  // chained is a string decoder, not a record — create should not try record logic
  expect(() => chained.create()).toThrow('Decoder has no default value');
});

// ============================================================
// Bug fix: literal() now returns DefaultDecoder (auto-defaults)
// ============================================================

test('literal() returns DefaultDecoder and auto-creates', () => {
  const lit = literal('admin');
  expect(lit.create()).toBe('admin');

  const litNum = literal(42);
  expect(litNum.create()).toBe(42);

  const litBool = literal(true);
  expect(litBool.create()).toBe(true);
});

test('record with literal field auto-creates', () => {
  const Dec = record({
    type: literal('user'),
    name: string.default('Alice'),
  });
  expect(Dec.create()).toEqual({ type: 'user', name: 'Alice' });
});

// ============================================================
// Bug fix: mutable default reference hazard
// ============================================================

test('array default is not shared between create calls', () => {
  const dec = array(string).default([]);
  const a = dec.create();
  const b = dec.create();
  a.push('mutated');
  expect(b).toEqual([]);
  expect(a).not.toBe(b);
});

test('object default is not shared between create calls', () => {
  const dec = decoder((x: unknown) => x as { n: number }).default({ n: 0 });
  const a = dec.create();
  const b = dec.create();
  a.n = 999;
  expect(b).toEqual({ n: 0 });
  expect(a).not.toBe(b);
});

// ============================================================
// Combinator + .default() tests
// ============================================================

test('union() + .default()', () => {
  const dec = union(string, number).default('hello');
  expect(dec.create()).toBe('hello');
  expect(dec.create(42)).toBe(42);
  expect(dec('world')).toBe('world');
});

test('nullable() + .default()', () => {
  const dec = nullable(string).default(null);
  expect(dec.create()).toBeNull();
  expect(dec.create('hi')).toBe('hi');
  expect(dec(null)).toBeNull();
  expect(dec('test')).toBe('test');
});

test('optional() + .default()', () => {
  const dec = optional(number).default(undefined);
  expect(dec.create()).toBeUndefined();
  expect(dec.create(5)).toBe(5);
});

test('set() + .default()', () => {
  const dec = set(string).default(new Set(['a', 'b']));
  expect(dec.create()).toEqual(new Set(['a', 'b']));
  const custom = new Set(['x']);
  expect(dec.create(custom)).toEqual(new Set(['x']));
});

test('map() + .default()', () => {
  const dec = map(string, (s) => s.length).default(new Map([[5, 'hello']]));
  expect(dec.create()).toEqual(new Map([[5, 'hello']]));
});

test('dict() + .default()', () => {
  const m = new Map<string, number>([['x', 1]]);
  const dec = dict(number).default(m);
  expect(dec.create()).toEqual(new Map([['x', 1]]));
});

test('array() + .default()', () => {
  const dec = array(number).default([1, 2, 3]);
  expect(dec.create()).toEqual([1, 2, 3]);
  expect(dec.create([99])).toEqual([99]);
});

test('nonEmptyArray() + .default()', () => {
  const dec = nonEmptyArray(string).default(['hello']);
  expect(dec.create()).toEqual(['hello']);
});

test('intersection() + .default()', () => {
  const A = record({ a: string.default('A') });
  const B = record({ b: number.default(0) });
  const dec = intersection(A, B).default({ a: 'X', b: 42 });
  expect(dec.create()).toEqual({ a: 'X', b: 42 });
});

test('objectOf() + .default()', () => {
  const dec = objectOf(number).default({ x: 1, y: 2 });
  expect(dec.create()).toEqual({ x: 1, y: 2 });
});

// ============================================================
// lazy() wrapping record decoder
// ============================================================

test('lazy() wrapping record decoder', () => {
  const Inner = record({ x: number.default(0) });
  const dec = lazy(() => Inner);
  expect(dec({ x: 5 })).toEqual({ x: 5 });
});

// ============================================================
// at() + .default()
// ============================================================

test('at() + .default()', () => {
  const dec = at('a', 'b').default('fallback');
  expect(dec.create()).toBe('fallback');
  expect(dec({ a: { b: 'nested' } })).toBe('nested');
});

// ============================================================
// Empty record .create()
// ============================================================

test('empty record .create()', () => {
  const dec = record({});
  expect(dec.create()).toEqual({});
});

// ============================================================
// .chain() + .default() interaction
// ============================================================

test('.chain() drops default from source decoder', () => {
  const dec = string.default('hello').chain(string);
  // .chain() drops defaultTag, so create should fail
  expect(() => dec.create()).toThrow('Decoder has no default value');
});

// ============================================================
// Primitive decoders + .default()
// ============================================================

test('date + .default()', () => {
  const d = new Date('2024-01-01');
  const dec = date.default(d);
  expect(dec.create()).toEqual(d);
});

test('integer + .default()', () => {
  const dec = integer.default(0);
  expect(dec.create()).toBe(0);
});

test('bigint + .default()', () => {
  const dec = bigint.default(BigInt(0));
  expect(dec.create()).toBe(BigInt(0));
});

test('regex() + .default()', () => {
  const dec = regex(/abc/).default('abc');
  expect(dec.create()).toBe('abc');
});

test('boolean + .default()', () => {
  const dec = boolean.default(false);
  expect(dec.create()).toBe(false);
  expect(dec.create(true)).toBe(true);
});

test('nil + .default()', () => {
  const dec = nil.default(null);
  expect(dec.create()).toBeNull();
});

test('undef + .default()', () => {
  const dec = undef.default(undefined);
  expect(dec.create()).toBeUndefined();
});

// ============================================================
// Record with all literal fields auto-creates with no args
// ============================================================

test('record with all literal fields auto-creates', () => {
  const Dec = record({
    type: literal('event'),
    version: literal(2),
    active: literal(true),
  });
  expect(Dec.create()).toEqual({ type: 'event', version: 2, active: true });
});

test('record with bare literal fields auto-creates (no literal() needed)', () => {
  const Dec = record({
    type: 'user',
    name: string.default('Alice'),
  });
  expect(Dec.create()).toEqual({ type: 'user', name: 'Alice' });
});

test('record with all bare literals auto-creates', () => {
  const Dec = record({
    kind: 'event',
    version: 2,
    active: true,
  });
  expect(Dec.create()).toEqual({ kind: 'event', version: 2, active: true });
});

// ============================================================
// Mixed record: literal + always + withDefault + string.default
// ============================================================

test('record with mixed defaulted fields', () => {
  const Dec = record({
    type: literal('item'),
    count: always(0),
    label: string.default('untitled'),
    enabled: withDefault(boolean, true),
  });
  expect(Dec.create()).toEqual({
    type: 'item',
    count: 0,
    label: 'untitled',
    enabled: true,
  });
  expect(Dec.create({ label: 'custom' })).toEqual({
    type: 'item',
    count: 0,
    label: 'custom',
    enabled: true,
  });
});

test('all combinations: required, defaulted-kept, defaulted-overridden, literal, always', () => {
  const Dec = record({
    // required — must provide
    name: string,
    age: number,
    // defaulted — will rely on default
    role: string.default('user'),
    score: withDefault(integer, 0),
    // defaulted — will override
    email: string.default('none@example.com'),
    active: withDefault(boolean, true),
    // literal — auto-defaults
    type: literal('person'),
    version: literal(1),
    // always — auto-defaults
    tag: always('v2'),
  });

  // provide required + override some defaults
  const result = Dec.create({
    name: 'Alice',
    age: 30,
    email: 'alice@example.com',
    active: false,
  });
  expect(result).toEqual({
    name: 'Alice',
    age: 30,
    role: 'user',        // kept default
    score: 0,            // kept default
    email: 'alice@example.com', // overridden
    active: false,       // overridden
    type: 'person',      // literal auto-default
    version: 1,          // literal auto-default
    tag: 'v2',           // always auto-default
  });

  // override everything
  const full = Dec.create({
    name: 'Bob',
    age: 25,
    role: 'admin',
    score: 100,
    email: 'bob@example.com',
    active: true,
    type: 'person',
    version: 1,
    tag: 'v2',
  });
  expect(full).toEqual({
    name: 'Bob',
    age: 25,
    role: 'admin',
    score: 100,
    email: 'bob@example.com',
    active: true,
    type: 'person',
    version: 1,
    tag: 'v2',
  });

  // missing required field throws
  // @ts-expect-error
  expect(() => Dec.create({ name: 'X' })).toThrow("No default value for field 'age'");
  // @ts-expect-error
  expect(() => Dec.create({})).toThrow("No default value for field 'name'");
  // @ts-expect-error
  expect(() => Dec.create()).toThrow("No default value for field 'name'");
});

test('all combinations with bare literals instead of literal()', () => {
  const Dec = record({
    // required — must provide
    name: string,
    age: number,
    // defaulted — will rely on default
    role: string.default('user'),
    score: withDefault(integer, 0),
    // defaulted — will override
    email: string.default('none@example.com'),
    // bare literals — auto-default
    type: 'person',
    version: 2,
    active: true,
    // always — auto-default
    tag: always('v2'),
  });

  const result = Dec.create({
    name: 'Alice',
    age: 30,
    email: 'alice@example.com',
  });
  expect(result).toEqual({
    name: 'Alice',
    age: 30,
    role: 'user',
    score: 0,
    email: 'alice@example.com',
    type: 'person',
    version: 2,
    active: true,
    tag: 'v2',
  });
});

test('bare literal in patch is accepted (only the literal value is allowed)', () => {
  const Dec = record({
    type: 'default',
    name: string,
  });
  // providing the literal value explicitly works
  expect(Dec.create({ name: 'X', type: 'default' })).toEqual({
    type: 'default',
    name: 'X',
  });
  // omitting it also works — it auto-defaults
  expect(Dec.create({ name: 'Y' })).toEqual({
    type: 'default',
    name: 'Y',
  });
});

test('nested record with bare literals auto-creates from outer', () => {
  const Inner = record({ kind: 'leaf', value: number.default(0) });
  const Outer = record({ label: string.default('root'), child: Inner });
  expect(Outer.create()).toEqual({
    label: 'root',
    child: { kind: 'leaf', value: 0 },
  });
});

test('tuple default in record field', () => {
  const Dec = record({
    point: tuple(number, number).default([0, 0]),
    name: string.default('origin'),
  });
  expect(Dec.create()).toEqual({ point: [0, 0], name: 'origin' });
  expect(Dec.create({ point: [1, 2] })).toEqual({ point: [1, 2], name: 'origin' });
});

test('safeDecode still works on DefaultDecoder', () => {
  const dec = string.default('hi');
  expect(dec.safeDecode('hello')).toEqual({ ok: true, value: 'hello' });
  expect(dec.safeDecode(42)).toEqual({
    ok: false,
    error: expect.any(Error),
  });
});

test('decoder() wrapper preserves default', () => {
  const dec = decoder(string.default('wrapped'));
  expect(dec.create()).toBe('wrapped');
});

test('decoder() wrapper preserves record schema', () => {
  const Dec = record({ x: number.default(0) });
  const wrapped = decoder(Dec);
  expect(wrapped.create()).toEqual({ x: 0 });
});

// ============================================================
// Bare literal tuples in .default() / .create()
// ============================================================

test('bare tuple in record: create with patch', () => {
  const Dec = record({ pair: [string, number] });
  expect(Dec.create({ pair: ['hi', 5] })).toEqual({ pair: ['hi', 5] });
});

test('bare tuple in record: no default, create throws', () => {
  const Dec = record({
    pair: [string, number],
    name: string.default('x'),
  });
  // @ts-expect-error — pair is required
  expect(() => Dec.create()).toThrow("No default value for field 'pair'");
});

test('bare tuple with .default() in record auto-creates', () => {
  const Dec = record({
    pair: decoder([string, number]).default(['a', 0]),
    name: string.default('x'),
  });
  expect(Dec.create()).toEqual({ pair: ['a', 0], name: 'x' });
  expect(Dec.create({ pair: ['b', 1] })).toEqual({ pair: ['b', 1], name: 'x' });
});

test('nested record with bare tuple field', () => {
  const Inner = record({
    coords: decoder([number, number]).default([0, 0]),
    label: literal('point'),
  });
  const Outer = record({
    name: string.default('origin'),
    pos: Inner,
  });
  expect(Outer.create()).toEqual({
    name: 'origin',
    pos: { coords: [0, 0], label: 'point' },
  });
  expect(Outer.create({ pos: { coords: [1, 2] } })).toEqual({
    name: 'origin',
    pos: { coords: [1, 2], label: 'point' },
  });
});

test('deeply nested record with bare tuple', () => {
  const Leaf = record({
    values: decoder([number, number]).default([0, 0]),
    tag: 'leaf',
  });
  const Mid = record({
    child: Leaf,
    kind: 'mid',
  });
  const Root = record({
    item: Mid,
    version: literal(1),
  });
  expect(Root.create()).toEqual({
    item: { child: { values: [0, 0], tag: 'leaf' }, kind: 'mid' },
    version: 1,
  });
});

// ============================================================
// Tuple auto-default from element defaults
// ============================================================

test('tuple auto-creates when all elements have defaults', () => {
  const t = tuple(number.default(1), string.default('hi'));
  expect(t.create()).toEqual([1, 'hi']);
});

test('tuple auto-create with literal elements', () => {
  const t = tuple(literal('a'), literal(1));
  expect(t.create()).toEqual(['a', 1]);
});

test('tuple auto-create with bare literal elements', () => {
  const t = decoder(['hello', 42, true]);
  expect(t.create()).toEqual(['hello', 42, true]);
});

test('tuple does NOT auto-create when some elements lack defaults', () => {
  const t = tuple(number.default(1), string);
  expect(() => t.create()).toThrow();
});

test('tuple auto-create with mixed default sources', () => {
  const t = tuple(literal('tag'), always(0), string.default('x'));
  expect(t.create()).toEqual(['tag', 0, 'x']);
});

test('bare tuple with defaulted elements in record auto-creates', () => {
  const Dec = record({
    pair: [number.default(0), string.default('x')],
    name: string.default('test'),
  });
  expect(Dec.create()).toEqual({ pair: [0, 'x'], name: 'test' });
});

test('bare tuple with literals in record auto-creates', () => {
  const Dec = record({
    tag: [literal('a'), literal(1)],
    name: string.default('test'),
  });
  expect(Dec.create()).toEqual({ tag: ['a', 1], name: 'test' });
});

test('nested record with auto-defaulting bare tuple', () => {
  const Inner = record({
    coords: [number.default(0), number.default(0)],
    label: 'point',
  });
  const Outer = record({
    name: string.default('origin'),
    pos: Inner,
  });
  expect(Outer.create()).toEqual({
    name: 'origin',
    pos: { coords: [0, 0], label: 'point' },
  });
});

test('3-level nesting with auto-defaulting tuples', () => {
  const Leaf = record({
    pair: [number.default(1), number.default(2)],
    kind: 'leaf',
  });
  const Mid = record({ child: Leaf, kind: 'mid' });
  const Root = record({ item: Mid, version: literal(1) });
  expect(Root.create()).toEqual({
    item: { child: { pair: [1, 2], kind: 'leaf' }, kind: 'mid' },
    version: 1,
  });
});

test('empty tuple auto-creates to []', () => {
  const t = tuple();
  expect(t.create()).toEqual([]);
});

// ============================================================
// Decoder() class API
// ============================================================

test('Decoder() with record: decode', () => {
  class User extends Decoder(record({ name: string, age: number })) {}
  const user: User = User.decode({ name: 'Alice', age: 30 });
  expect(user).toEqual({ name: 'Alice', age: 30 });
});

test('Decoder() with record: new', () => {
  class User extends Decoder(record({ name: string, age: number })) {}
  const user: User = new User({ name: 'Bob', age: 25 });
  expect(user).toEqual({ name: 'Bob', age: 25 });
});

test('Decoder() with record: safeDecode', () => {
  class User extends Decoder(record({ name: string, age: number })) {}
  const ok = User.safeDecode({ name: 'Alice', age: 30 });
  expect(ok).toEqual({ ok: true, value: { name: 'Alice', age: 30 } });
  const fail = User.safeDecode({ name: 'Alice', age: 'bad' });
  expect(fail.ok).toBe(false);
});

test('Decoder() with record: create with defaults', () => {
  class User extends Decoder(record({
    name: string.default('John'),
    age: integer,
    role: always('member'),
  })) {}
  const user: User = User.create({ age: 25 });
  expect(user).toEqual({ name: 'John', age: 25, role: 'member' });
});

test('Decoder() with record: create all defaults', () => {
  class Config extends Decoder(record({
    type: literal('app'),
    debug: always(false),
    name: string.default('unnamed'),
  })) {}
  const config: Config = Config.create();
  expect(config).toEqual({ type: 'app', debug: false, name: 'unnamed' });
});

test('Decoder() with record: plain object is assignable to type', () => {
  class Point extends Decoder(record({ x: number, y: number })) {}
  // structural typing: a plain object is a valid Point
  const p: Point = { x: 1, y: 2 };
  expect(p).toEqual({ x: 1, y: 2 });
});

test('Decoder() with tuple: decode', () => {
  class Pair extends Decoder(tuple(string, number)) {}
  const pair: Pair = Pair.decode(['hello', 42]);
  expect(pair).toEqual(['hello', 42]);
});

test('Decoder() with tuple: create with defaults', () => {
  class Origin extends Decoder(tuple(number.default(0), number.default(0))) {}
  const origin: Origin = Origin.create();
  expect(origin).toEqual([0, 0]);
});

test('Decoder() with array: decode', () => {
  class Names extends Decoder(array(string)) {}
  const names: Names = Names.decode(['Alice', 'Bob']);
  expect(names).toEqual(['Alice', 'Bob']);
});

// Note: Decoder() only works with class extends when the decoded type is a
// single object type (record, tuple, array). Unions and primitives cause
// TS2509 because class extends requires an object type, not a union or
// primitive. For those, continue using decodeType<typeof decoder>.

test('Decoder() with set: decode', () => {
  class Tags extends Decoder(set(string)) {}
  const tags: Tags = Tags.decode(['a', 'b', 'a']);
  expect(tags).toEqual(new Set(['a', 'b']));
});

test('Decoder() with dict: decode', () => {
  class Scores extends Decoder(dict(number)) {}
  const scores: Scores = Scores.decode({ math: 90, english: 85 });
  expect(scores).toEqual(new Map([['math', 90], ['english', 85]]));
});

test('Decoder() with objectOf: decode', () => {
  class Config extends Decoder(objectOf(string)) {}
  const config: Config = Config.decode({ a: 'x', b: 'y' });
  expect(config).toEqual({ a: 'x', b: 'y' });
});

test('Decoder() nested: Type inside Type record', () => {
  class Address extends Decoder(record({
    city: string.default('Unknown'),
    zip: string.default('00000'),
  })) {}

  // Use the underlying decoder in another Type
  const addressDecoder = record({
    city: string.default('Unknown'),
    zip: string.default('00000'),
  });
  class User extends Decoder(record({
    name: string.default('John'),
    address: addressDecoder,
  })) {}

  const user: User = User.create();
  expect(user).toEqual({
    name: 'John',
    address: { city: 'Unknown', zip: '00000' },
  });
});

// README examples for Decoder()

test('README: Decoder() as type and decoder', () => {
  class User extends Decoder(record({ name: string, age: number })) {}

  // As a type — plain objects are assignable
  const user: User = { name: 'Alice', age: 30 };
  expect(user).toEqual({ name: 'Alice', age: 30 });

  // As a decoder
  const decoded: User = User.decode({ name: 'Bob', age: 25 });
  expect(decoded).toEqual({ name: 'Bob', age: 25 });
});

test('README: Decoder() with schema-aware create', () => {
  class User extends Decoder(record({
    name: string.default('John'),
    age: integer,
    role: always('member'),
  })) {}

  const user: User = User.create({ age: 25 });
  expect(user).toEqual({ name: 'John', age: 25, role: 'member' });
});

test('README: Why — unions just work', () => {
  const eventDecoder = union(
    { type: 'click', x: number, y: number },
    { type: 'keypress', key: string },
    { type: 'scroll', offset: number },
  );
  expect(eventDecoder({ type: 'click', x: 10, y: 20 })).toEqual({ type: 'click', x: 10, y: 20 });
  expect(eventDecoder({ type: 'keypress', key: 'a' })).toEqual({ type: 'keypress', key: 'a' });
  expect(eventDecoder({ type: 'scroll', offset: 100 })).toEqual({ type: 'scroll', offset: 100 });

  const idDecoder = union(string, number);
  expect(idDecoder('abc')).toBe('abc');
  expect(idDecoder(42)).toBe(42);

  const statusDecoder = union('active', 'inactive', 'pending');
  expect(statusDecoder('active')).toBe('active');
  expect(() => statusDecoder('deleted')).toThrow();

  const responseDecoder = union(
    { status: 'ok', data: string },
    always({ status: 'error', data: '' }),
  );
  expect(responseDecoder({ status: 'ok', data: 'hi' })).toEqual({ status: 'ok', data: 'hi' });
  expect(responseDecoder('anything')).toEqual({ status: 'error', data: '' });

  const messageDecoder = union(
    ['text', string],
    ['image', { url: string, width: number }],
  );
  expect(messageDecoder(['text', 'hello'])).toEqual(['text', 'hello']);
  expect(messageDecoder(['image', { url: 'a.png', width: 100 }])).toEqual(['image', { url: 'a.png', width: 100 }]);
});

test('README: Why — map and chain transformations', () => {
  const decoder = record({
    name: string,
    birthday: string.chain(date).map(d => d.getFullYear()),
    score: field('stats', { score: number }).map(s => s.score),
    displayName: fields({ first: string, last: string })
      .map(({ first, last }) => `${first} ${last}`),
  });
  expect(decoder({
    name: 'Alice',
    first: 'Alice',
    last: 'Smith',
    birthday: '1990-01-15',
    stats: { score: 42 },
  })).toEqual({ name: 'Alice', birthday: 1990, score: 42, displayName: 'Alice Smith' });
});

test('README: Why — bare literals with nested records and tuples', () => {
  const decoder = record({
    name: string,
    role: 'admin',
    address: { city: string, zip: string },
    coordinates: [number, number],
  });
  expect(decoder({
    name: 'Alice',
    role: 'admin',
    address: { city: 'Oslo', zip: '0101' },
    coordinates: [59.9, 10.7],
  })).toEqual({
    name: 'Alice',
    role: 'admin',
    address: { city: 'Oslo', zip: '0101' },
    coordinates: [59.9, 10.7],
  });
  expect(() => decoder({ name: 'Alice', role: 'member', address: { city: 'Oslo', zip: '0101' }, coordinates: [0, 0] })).toThrow();
});

test('README: Why — create with required and default fields', () => {
  const userDecoder = record({
    name: string.default('John'),
    age: integer,
    role: always('member'),
  });

  expect(userDecoder.create({ age: 25 })).toEqual({ name: 'John', age: 25, role: 'member' });
  expect(userDecoder.create({ age: 25, name: 'Alice' })).toEqual({ name: 'Alice', age: 25, role: 'member' });
  // userDecoder.create() would be a TS error — age is required (no default)
});

test('README: Why — create with all defaults (record)', () => {
  const configDecoder = record({
    env: 'production',
    debug: always(false),
    retries: integer.default(3),
    name: string.default('app'),
  });

  expect(configDecoder.create()).toEqual({ env: 'production', debug: false, retries: 3, name: 'app' });
  expect(configDecoder.create({ retries: 5 })).toEqual({ env: 'production', debug: false, retries: 5, name: 'app' });
});

test('README: Why — create with all defaults (Decoder class)', () => {
  class Config extends Decoder({
    env: 'production',
    debug: always(false),
    retries: integer.default(3),
    name: string.default('app'),
  }) {}

  expect(Config.create()).toEqual({ env: 'production', debug: false, retries: 3, name: 'app' });
  expect(Config.create({ retries: 5 })).toEqual({ env: 'production', debug: false, retries: 5, name: 'app' });
});

test('README: Decoder() with tuple, array, dict', () => {
  class Pair extends Decoder(tuple(string, number)) {}
  expect(Pair.decode(['a', 1])).toEqual(['a', 1]);

  class Names extends Decoder(array(string)) {}
  expect(Names.decode(['Alice', 'Bob'])).toEqual(['Alice', 'Bob']);

  class Scores extends Decoder(dict(number)) {}
  expect(Scores.decode({ math: 90 })).toEqual(new Map([['math', 90]]));
});

// Decoder() with plain schema (no record() wrapper needed)

test('Decoder() with plain schema: decode', () => {
  class User extends Decoder({ name: string, age: number }) {}
  const user: User = User.decode({ name: 'Alice', age: 30 });
  expect(user).toEqual({ name: 'Alice', age: 30 });
});

test('Decoder() with plain schema: new', () => {
  class User extends Decoder({ name: string, age: number }) {}
  const user: User = new User({ name: 'Bob', age: 25 });
  expect(user).toEqual({ name: 'Bob', age: 25 });
});

test('Decoder() with plain schema: safeDecode', () => {
  class User extends Decoder({ name: string, age: number }) {}
  expect(User.safeDecode({ name: 'A', age: 1 })).toEqual({ ok: true, value: { name: 'A', age: 1 } });
  expect(User.safeDecode('bad').ok).toBe(false);
});

test('Decoder() with plain schema: schema-aware create', () => {
  class User extends Decoder({
    name: string.default('John'),
    age: integer,
    role: always('member'),
  }) {}
  const user: User = User.create({ age: 25 });
  expect(user).toEqual({ name: 'John', age: 25, role: 'member' });
});

test('Decoder() with plain schema: all defaults', () => {
  class Config extends Decoder({
    type: literal('app'),
    debug: always(false),
    name: string.default('unnamed'),
  }) {}
  expect(Config.create()).toEqual({ type: 'app', debug: false, name: 'unnamed' });
});

test('Decoder() with plain schema: plain object assignable', () => {
  class Point extends Decoder({ x: number, y: number }) {}
  const p: Point = { x: 1, y: 2 };
  expect(p).toEqual({ x: 1, y: 2 });
});

// Decoder() with tuple literal form

test('Decoder() with tuple literal: decode', () => {
  class Pair extends Decoder([string, number]) {}
  const pair: Pair = Pair.decode(['hello', 42]);
  expect(pair).toEqual(['hello', 42]);
});

test('Decoder() with tuple literal: new', () => {
  class Pair extends Decoder([string, number]) {}
  const pair: Pair = new Pair(['hello', 42]);
  expect(pair).toEqual(['hello', 42]);
});

test('Decoder() with tuple literal: create with defaults', () => {
  class Origin extends Decoder([number.default(0), number.default(0)]) {}
  expect(Origin.create()).toEqual([0, 0]);
});

test('Decoder() with tagged tuple literal', () => {
  class TextMsg extends Decoder([literal('text'), string]) {}
  const msg: TextMsg = TextMsg.decode(['text', 'hello']);
  expect(msg).toEqual(['text', 'hello']);
});

test('Decoder() with bare literal in tuple', () => {
  class TextMsg extends Decoder(['text', string]) {}
  const msg: TextMsg = TextMsg.decode(['text', 'hello']);
  expect(msg).toEqual(['text', 'hello']);
});

test('Decoder() with bare literals in record schema', () => {
  class Event extends Decoder({ type: 'click', x: number, y: number }) {}
  const event: Event = Event.decode({ type: 'click', x: 10, y: 20 });
  expect(event).toEqual({ type: 'click', x: 10, y: 20 });
  expect(Event.create({ x: 1, y: 2 })).toEqual({ type: 'click', x: 1, y: 2 });
});

test('Decoder is both a type and a value', () => {
  // Decoder as a type annotation (existing usage)
  const dec: Decoder<string> = string;
  expect(dec('hello')).toBe('hello');

  // Decoder as a class-producing function (new usage)
  class User extends Decoder({ name: string, age: number }) {}
  const user: User = User.decode({ name: 'Alice', age: 30 });
  expect(user).toEqual({ name: 'Alice', age: 30 });

  // Both in the same scope
  const strDec: Decoder<string> = string;
  const created: User = User.decode({ name: strDec('Bob'), age: 25 });
  expect(created).toEqual({ name: 'Bob', age: 25 });
});

test('Decoder() plain schema matches record() behavior exactly', () => {
  const viaRecord = record({ name: string, age: number });
  class ViaDecoder extends Decoder({ name: string, age: number }) {}

  const input = { name: 'Alice', age: 30 };
  expect(ViaDecoder.decode(input)).toEqual(viaRecord(input));
  expect(new ViaDecoder(input)).toEqual(viaRecord(input));
});

// ============================================================
// Optional fields omit undefined keys from result
// ============================================================

test('Decoder() with optional field omits key when undefined', () => {
  class User extends Decoder({ name: string, nickname: optional(string) }) {}

  const withValue = User.decode({ name: 'Alice', nickname: 'Ali' });
  expect(withValue).toEqual({ name: 'Alice', nickname: 'Ali' });
  expect(withValue.nickname).toBe('Ali');
  expect('nickname' in withValue).toBe(true);

  const withoutValue = User.decode({ name: 'Alice', nickname: undefined });
  expect(withoutValue).toEqual({ name: 'Alice' });
  expect(withoutValue.nickname).toBeUndefined();
  expect('nickname' in withoutValue).toBe(false);

  const missingKey = User.decode({ name: 'Alice' });
  expect(missingKey).toEqual({ name: 'Alice' });
  expect(missingKey.nickname).toBeUndefined();
  expect('nickname' in missingKey).toBe(false);
});

test('record() with optional field omits key when undefined', () => {
  const dec = record({ name: string, nickname: optional(string) });

  const withValue = dec({ name: 'Alice', nickname: 'Ali' });
  expect(withValue).toEqual({ name: 'Alice', nickname: 'Ali' });
  expect(withValue.nickname).toBe('Ali');
  expect('nickname' in withValue).toBe(true);

  const withoutValue = dec({ name: 'Alice', nickname: undefined });
  expect(withoutValue).toEqual({ name: 'Alice' });
  expect(withoutValue.nickname).toBeUndefined();
  expect('nickname' in withoutValue).toBe(false);
});

test('Decoder() with optional field and create omits key', () => {
  class User extends Decoder({
    name: string.default('John'),
    nickname: optional(string).default(undefined),
  }) {}

  const created = User.create();
  expect(created).toEqual({ name: 'John' });
  expect(created.nickname).toBeUndefined();
  expect('nickname' in created).toBe(false);

  const withPatch = User.create({ nickname: 'JD' });
  expect(withPatch).toEqual({ name: 'John', nickname: 'JD' });
  expect(withPatch.nickname).toBe('JD');
  expect('nickname' in withPatch).toBe(true);
});
