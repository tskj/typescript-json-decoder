import {
  decode,
  boolean,
  decodeType,
  safeDecode,
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
  Decoder,
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
  const tuple_decoder = decode([string, string]);

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('heterogeneous tuple literal', () => {
  const t: [string, number] = ['a', 1];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = decode([string, number]);

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('nested tuple', () => {
  const t: [string, [string, string]] = ['a', ['b', 'c']];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = decode(tuple(string, tuple(string, string)));

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('nested tuple literal', () => {
  const t: [string, [string, string]] = ['a', ['b', 'c']];

  type tuple = decodeType<typeof tuple_decoder>;
  const tuple_decoder = decode([string, [string, string]]);

  expect<tuple>(tuple_decoder(t)).toEqual(t);
});

test('literal string', () => {
  const l1: 'a' = 'a' as const;

  type literal = decodeType<typeof literal_decoder>;
  const literal_decoder = literal(l1);

  expect<literal>(literal_decoder(l1)).toEqual(l1);
  expect(() => literal_decoder('b')).toThrow();
});

test('literal number', () => {
  const l1: 1 = 1 as const;

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
  const l1: 'a' = 'a' as const;

  type literal = decodeType<typeof literal_decoder>;
  const literal_decoder = decode(l1);

  expect<literal>(literal_decoder(l1)).toEqual(l1);
  expect(() => literal_decoder('b')).toThrow();
});

test('decode record', () => {
  const l1: {} = {} as const;

  type literal = decodeType<typeof literal_decoder>;
  const literal_decoder = decode({});

  expect<literal>(literal_decoder(l1)).toEqual(l1);
  expect(() => literal_decoder(null)).toThrow();
});

test('record decoder', () => {
  const l1: {} = {} as const;

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
    h: fields({ f: string, g: number }, ({ f, g }) => f + g),
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

  const SizeValues = ['small', 'medium', 'large'] as const;

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

  const tupleA: Decoder<[number, number]> = (x => {
    const arr = array(number)(x);
    return [arr[0], arr[1], ];
  });
  const tupleB: Decoder<[number, number, number]> = (x => {
    const arr = array(number)(x);
    return [arr[0], arr[1], arr[2], ];
  });
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

  // Optional keys should still work when missing
  const optionalDecoder = record({ name: string, nickname: optional(string) });
  expect(optionalDecoder({ name: 'test' })).toEqual({ name: 'test', nickname: undefined });
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
    expect(result.error).toContain('not of type `string`');
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
  expect(safeDecode('hello' as const, 'hello').ok).toBe(true);
  expect(safeDecode('hello' as const, 'world').ok).toBe(false);
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
    type: 'admin' as const,
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

test('record with as const preserves literal types', () => {
  // per-property as const
  const decoder1 = record({ level: 42 as const, name: string });
  type decoded1 = decodeType<typeof decoder1>;
  const r1: decoded1 = decoder1({ level: 42, name: 'test' });
  expect(r1).toEqual({ level: 42, name: 'test' });

  // whole-object as const
  const decoder2 = record({ level: 42, active: true, name: string } as const);
  type decoded2 = decodeType<typeof decoder2>;
  const r2: decoded2 = decoder2({ level: 42, active: true, name: 'test' });
  expect(r2).toEqual({ level: 42, active: true, name: 'test' });

  // all approaches reject wrong values the same way at runtime
  expect(() => decoder1({ level: 43, name: 'test' })).toThrow();
  expect(() => decoder2({ level: 43, active: true, name: 'test' })).toThrow();
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
    config: { type: 'admin' as const, city: string },
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
    config: { level: 42, active: true, type: 'admin' as const },
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

test('bare POJO with number/boolean via decode()', () => {
  const decoder = decode({ level: 42, active: true, name: string });

  expect(
    decoder({ level: 42, active: true, name: 'test' }),
  ).toEqual({ level: 42, active: true, name: 'test' });
  expect(() => decoder({ level: 43, active: true, name: 'test' })).toThrow();
  expect(() => decoder({ level: 42, active: false, name: 'test' })).toThrow();
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
    { type: 'a' as const, level: 1 },
    { type: 'b' as const, active: true },
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
        tag: 'deep' as const,
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
  const decoder = decode([42, true]);

  expect(decoder([42, true])).toEqual([42, true]);
  expect(() => decoder([43, true])).toThrow();
  expect(() => decoder([42, false])).toThrow();
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
    { type: 'admin' as const, level: 42 },
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
      ({ level, active }) => `${level}-${active}`,
    ),
  });
  expect(fieldsDecoder({ level: 5, active: true })).toEqual({ combined: '5-true' });
  expect(() => fieldsDecoder({ level: 5, active: false })).toThrow();

  // always as fallback in union with bare literal POJO
  const withDefault = union({ status: 'ok' as const, code: 200 }, always({ status: 'error' as const, code: 0 }));
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
    { type: 'x' as const, level: 42 },
    { name: string },
  ));
  expect(nullableIntersect(null)).toBe(null);
  expect(nullableIntersect({ type: 'x', level: 42, name: 'hi' })).toEqual({ type: 'x', level: 42, name: 'hi' });
  expect(() => nullableIntersect({ type: 'x', level: 99, name: 'hi' })).toThrow();

  // optional array of bare literal tuples
  const optArrayTuples = optional(array(decode([number, true])));
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
