import {
  decode,
  boolean,
  decodeType,
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
  Decoder,
  dictWithTypedKey,
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

// not supported for some reason
// test('literal number', () => {
//   const l1: 1 = 1 as const;

//   type literal = decodeType<typeof literal_decoder>;
//   const literal_decoder = literal(1);

//   expect<literal>(literal_decoder(l1)).toEqual(l1);
// });

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
  const dict_with_typed_keys_decoder = dictWithTypedKey(boolean, SizeValues);

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
