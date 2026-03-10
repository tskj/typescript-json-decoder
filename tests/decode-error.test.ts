import {
  DecodeError,
  safeDecode,
  string,
  number,
  boolean,
  nil,
  undef,
  integer,
  date,
  literal,
  record,
  array,
  field,
  fields,
  at,
  tuple,
  union,
  intersection,
  optional,
  nullable,
  set,
  objectOf,
  dict,
  nonEmptyArray,
  missing,
  regex,
  bigint,
} from '../src';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getError = (dec: any, value: unknown): DecodeError => {
  const result = safeDecode(dec, value);
  if (result.ok) throw new Error(`Expected decode to fail, but got: ${JSON.stringify(result.value)}`);
  return result.error;
};

/** Serialize a DecodeError into a plain object for literal deep-comparison. */
const snap = (e: DecodeError): any => ({
  message: e.message,
  path: e.path,
  expected: e.expected,
  received: e.received,
  children: e.children.map(snap),
  toString: e.toString(),
});

// ---------------------------------------------------------------------------
// DecodeError class
// ---------------------------------------------------------------------------
describe('DecodeError class', () => {
  test('simple() creates error with message and expected', () => {
    const error = DecodeError.simple('test message', 'string');
    expect(error).toBeInstanceOf(DecodeError);
    expect(error.message).toBe('test message');
    expect(error.expected).toBe('string');
    expect(error.path).toEqual([]);
    expect(error.received).toBeUndefined();
    expect(error.children).toEqual([]);
  });

  test('constructor with full parameters', () => {
    const child = DecodeError.simple('child');
    const error = new DecodeError('failed', ['user', 'email'], 'string', 42, [child]);
    expect(error.message).toBe('failed');
    expect(error.path).toEqual(['user', 'email']);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(42);
    expect(error.children).toEqual([child]);
  });

  test('compound() creates error with children', () => {
    const children = [
      DecodeError.simple('branch 1 failed', 'string', 42),
      DecodeError.simple('branch 2 failed', 'number', 'hello'),
    ];
    const error = DecodeError.compound('None matched', children, 42);
    expect(error.message).toBe('None matched');
    expect(error.children).toEqual(children);
    expect(error.received).toBe(42);
    expect(error.path).toEqual([]);
    expect(error.expected).toBeUndefined();
  });

  test('withPath() prepends segment and preserves all properties', () => {
    const child = DecodeError.simple('child');
    const original = new DecodeError('msg', ['b', 'c'], 'string', 42, [child]);
    const withPath = original.withPath('a');
    expect(withPath.path).toEqual(['a', 'b', 'c']);
    expect(withPath.message).toBe('msg');
    expect(withPath.expected).toBe('string');
    expect(withPath.received).toBe(42);
    expect(withPath.children).toEqual([child]);
  });

  test('getPathString() formats path as JSON Pointer', () => {
    expect(new DecodeError('msg', ['user', 'address', 'zipcode']).getPathString())
      .toBe('/user/address/zipcode');
  });

  test('getPathString() returns empty string for empty path', () => {
    expect(new DecodeError('msg', []).getPathString()).toBe('');
  });

  test('getPathString() handles numeric indices', () => {
    expect(new DecodeError('msg', ['items', 0, 'name']).getPathString())
      .toBe('/items/0/name');
  });

  test('toString() with no path returns message', () => {
    const error = DecodeError.simple('test error', 'number');
    expect(String(error)).toBe('test error');
    expect(error.toString()).toBe('test error');
  });

  test('toString() with path includes "at /path:" prefix', () => {
    const error = new DecodeError('bad value', ['user', 'email']);
    expect(error.toString()).toBe('at /user/email: bad value');
  });

  test('toString() with children lists them', () => {
    const error = DecodeError.compound('None matched', [
      DecodeError.simple('not a string'),
      DecodeError.simple('not a number'),
    ]);
    expect(error.toString()).toBe(
      'None matched:\n' +
      '  - not a string\n' +
      '  - not a number'
    );
  });

  test('toString() with path and children', () => {
    const error = DecodeError.compound('None matched', [
      DecodeError.simple('not a string'),
    ]).withPath('status');
    expect(error.toString()).toBe(
      'at /status: None matched:\n' +
      '  - not a string'
    );
  });

  test('DecodeError is instanceof Error', () => {
    const error = DecodeError.simple('test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DecodeError);
  });
});

// ---------------------------------------------------------------------------
// Primitive decoder errors
// ---------------------------------------------------------------------------
describe('Primitive decoder errors', () => {
  test('string decoder', () => {
    const error = getError(string, 42);
    expect(error.message).toBe('The value `42` is not of type `string`, but is of type `number`');
    expect(error.path).toEqual([]);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(42);
  });

  test('string decoder with null', () => {
    const error = getError(string, null);
    expect(error.message).toBe('The value `null` is not of type `string`, but is of type `object`');
    expect(error.expected).toBe('string');
    expect(error.received).toBe(null);
  });

  test('number decoder', () => {
    const error = getError(number, 'hello');
    expect(error.message).toBe('The value `hello` is not of type `number`, but is of type `string`');
    expect(error.expected).toBe('number');
    expect(error.received).toBe('hello');
  });

  test('boolean decoder', () => {
    const error = getError(boolean, null);
    expect(error.message).toBe('The value `null` is not of type `boolean`, but is of type `object`');
    expect(error.expected).toBe('boolean');
    expect(error.received).toBe(null);
  });

  test('nil decoder', () => {
    const error = getError(nil, 42);
    expect(error.message).toBe('The value `42` is not of type `null`, but is of type `number`');
    expect(error.expected).toBe('null');
    expect(error.received).toBe(42);
  });

  test('undef decoder', () => {
    const error = getError(undef, 42);
    expect(error.message).toBe('The value `42` is not of type `undefined`, but is of type `number`');
    expect(error.expected).toBe('undefined');
    expect(error.received).toBe(42);
  });

  test('integer decoder with non-integer', () => {
    const error = getError(integer, 3.5);
    expect(error.message).toBe('The value `3.5` is not an integer');
    expect(error.expected).toBe('integer');
    expect(error.received).toBe(3.5);
  });

  test('integer decoder with string (fails at number first)', () => {
    const error = getError(integer, 'hello');
    expect(error.message).toBe('The value `hello` is not of type `number`, but is of type `string`');
    expect(error.expected).toBe('number');
    expect(error.received).toBe('hello');
  });

  test('date decoder with invalid date string', () => {
    const error = getError(date, 'not-a-date');
    expect(error.message).toBe('String `not-a-date` is not a valid date string');
    expect(error.expected).toBe('Date (ISO 8601 string)');
    expect(error.received).toBe('not-a-date');
  });

  test('literal decoder', () => {
    const error = getError(literal('foo'), 'bar');
    expect(error.message).toBe('The value `bar` is not the literal `foo`');
    expect(error.expected).toBe('"foo"');
    expect(error.received).toBe('bar');
  });

  test('literal decoder with number', () => {
    const error = getError(literal(42), 99);
    expect(error.message).toBe('The value `99` is not the literal `42`');
    expect(error.expected).toBe('42');
    expect(error.received).toBe(99);
  });

  test('regex decoder', () => {
    const error = getError(regex(/^\d+$/), 'abc');
    expect(error.message).toBe('The string `abc` does not match the pattern `/^\\d+$/`');
    expect(error.expected).toBe('string matching /^\\d+$/');
    expect(error.received).toBe('abc');
  });

  test('bigint decoder with non-convertible value', () => {
    const error = getError(bigint, true);
    expect(error.message).toBe('The value `true` cannot be converted to a bigint');
    expect(error.expected).toBe('bigint');
    expect(error.received).toBe(true);
  });

  test('decoders throw DecodeError (not string)', () => {
    expect(() => string(42)).toThrow(DecodeError);
    expect(() => number('x')).toThrow(DecodeError);
    expect(() => boolean(1)).toThrow(DecodeError);
  });
});

// ---------------------------------------------------------------------------
// Record decoder errors
// ---------------------------------------------------------------------------
describe('Record decoder errors', () => {
  test('type mismatch in field: error has path and preserves leaf info', () => {
    const error = getError(record({ name: string, age: number }), {
      name: 'Alice',
      age: '30',
    });
    expect(error.message).toBe(
      'The value `30` is not of type `number`, but is of type `string`',
    );
    expect(error.path).toEqual(['age']);
    expect(error.expected).toBe('number');
    expect(error.received).toBe('30');
  });

  test('fails on first bad field (iteration order)', () => {
    const error = getError(record({ a: string, b: number }), {
      a: 42,
      b: 'hello',
    });
    // Should fail on 'a' first
    expect(error.path).toEqual(['a']);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(42);
  });

  test('missing required field', () => {
    const error = getError(record({ name: string, age: number }), {
      name: 'Alice',
    });
    expect(error.message).toBe('The key `age` is missing');
    expect(error.path).toEqual(['age']);
  });

  test('missing field in empty object', () => {
    const error = getError(record({ x: string }), {});
    expect(error.message).toBe('The key `x` is missing');
    expect(error.path).toEqual(['x']);
  });

  test('non-object input', () => {
    const error = getError(record({ name: string }), 'not an object');
    expect(error.message).toContain('not of type `object`');
    expect(error.path).toEqual([]);
    expect(error.expected).toBe('object');
    expect(error.received).toBe('not an object');
  });

  test('missing marker: key present but expected missing', () => {
    const dec = record({ name: string, deleted: missing });
    const error = getError(dec, { name: 'alice', deleted: true });
    expect(error.message).toContain('expected to be missing');
    expect(error.path).toEqual(['deleted']);
  });
});

// ---------------------------------------------------------------------------
// Nested record errors: path accumulation
// ---------------------------------------------------------------------------
describe('Nested record errors', () => {
  test('two levels deep', () => {
    const inner = record({ street: string, city: string });
    const outer = record({ name: string, address: inner });
    const error = getError(outer, {
      name: 'Bob',
      address: { street: 123, city: 'Portland' },
    });
    expect(error.message).toBe(
      'The value `123` is not of type `string`, but is of type `number`',
    );
    expect(error.path).toEqual(['address', 'street']);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(123);
    expect(error.getPathString()).toBe('/address/street');
  });

  test('three levels deep', () => {
    const dec = record({
      level1: record({
        level2: record({
          level3: number,
        }),
      }),
    });
    const error = getError(dec, {
      level1: { level2: { level3: 'not a number' } },
    });
    expect(error.path).toEqual(['level1', 'level2', 'level3']);
    expect(error.expected).toBe('number');
    expect(error.received).toBe('not a number');
    expect(error.getPathString()).toBe('/level1/level2/level3');
  });

  test('missing key in nested record', () => {
    const dec = record({
      user: record({
        profile: record({
          email: string,
        }),
      }),
    });
    const error = getError(dec, {
      user: { profile: {} },
    });
    expect(error.message).toBe('The key `email` is missing');
    expect(error.path).toEqual(['user', 'profile', 'email']);
    expect(error.getPathString()).toBe('/user/profile/email');
  });

  test('non-object nested value', () => {
    const dec = record({ user: record({ name: string }) });
    const error = getError(dec, { user: 'not an object' });
    expect(error.message).toContain('not of type `object`');
    expect(error.path).toEqual(['user']);
  });
});

// ---------------------------------------------------------------------------
// Array decoder errors
// ---------------------------------------------------------------------------
describe('Array decoder errors', () => {
  test('element type mismatch: path includes index', () => {
    const error = getError(array(string), ['a', 'b', 42, 'd']);
    expect(error.message).toBe(
      'The value `42` is not of type `string`, but is of type `number`',
    );
    expect(error.path).toEqual([2]);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(42);
  });

  test('first element failure', () => {
    const error = getError(array(number), [true, 1, 2]);
    expect(error.path).toEqual([0]);
    expect(error.expected).toBe('number');
    expect(error.received).toBe(true);
  });

  test('non-array input', () => {
    const error = getError(array(string), 'not an array');
    expect(error.message).toContain('not of type `array`');
    expect(error.path).toEqual([]);
    expect(error.expected).toBe('array');
    expect(error.received).toBe('not an array');
  });

  test('nonEmptyArray with empty array', () => {
    const error = getError(nonEmptyArray(string), []);
    expect(error.message).toBe('Expected a non-empty array, but got an empty array');
    expect(error.expected).toBe('non-empty array');
  });
});

// ---------------------------------------------------------------------------
// Array + Record: compound path
// ---------------------------------------------------------------------------
describe('Array + Record compound paths', () => {
  test('record inside array', () => {
    const dec = array(record({ id: number, name: string }));
    const error = getError(dec, [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 3, name: 42 },
    ]);
    expect(error.message).toBe(
      'The value `42` is not of type `string`, but is of type `number`',
    );
    expect(error.path).toEqual([2, 'name']);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(42);
    expect(error.getPathString()).toBe('/2/name');
  });

  test('array inside record', () => {
    const dec = record({ tags: array(string) });
    const error = getError(dec, { tags: ['a', 'b', 42] });
    expect(error.path).toEqual(['tags', 2]);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(42);
    expect(error.getPathString()).toBe('/tags/2');
  });

  test('deeply nested: record > array > record > field', () => {
    const dec = record({
      project: record({
        members: array(record({
          user: record({
            email: string,
          }),
        })),
      }),
    });
    const error = getError(dec, {
      project: {
        members: [
          { user: { email: 'alice@test.com' } },
          { user: { email: 42 } },
        ],
      },
    });
    expect(error.path).toEqual(['project', 'members', 1, 'user', 'email']);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(42);
    expect(error.getPathString()).toBe('/project/members/1/user/email');
  });

  test('missing key deep inside array element', () => {
    const dec = array(record({ id: number, name: string }));
    const error = getError(dec, [
      { id: 1, name: 'A' },
      { id: 2 }, // missing 'name'
    ]);
    expect(error.message).toBe('The key `name` is missing');
    expect(error.path).toEqual([1, 'name']);
    expect(error.getPathString()).toBe('/1/name');
  });
});

// ---------------------------------------------------------------------------
// Tuple decoder errors
// ---------------------------------------------------------------------------
describe('Tuple decoder errors', () => {
  test('element type mismatch with index in path', () => {
    const error = getError([string, number], ['hello', 'not a number']);
    expect(error.path).toEqual([1]);
    expect(error.expected).toBe('number');
    expect(error.received).toBe('not a number');
  });

  test('first element failure', () => {
    const error = getError([number, string], ['x', 'y']);
    expect(error.path).toEqual([0]);
    expect(error.expected).toBe('number');
  });

  test('wrong length', () => {
    const error = getError([string, number], ['hello']);
    expect(error.message).toContain('not the proper length');
    expect(error.expected).toBe('tuple of length 2');
  });

  test('non-array input', () => {
    const error = getError([string], 'not a list');
    expect(error.message).toContain('not a list');
    expect(error.expected).toBe('tuple of length 1');
  });

  test('tuple inside record gets path', () => {
    const dec = record({ coord: [number, number] });
    const error = getError(dec, { coord: [1, 'bad'] });
    expect(error.path).toEqual(['coord', 1]);
    expect(error.expected).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// Union decoder errors
// ---------------------------------------------------------------------------
describe('Union decoder errors', () => {
  test('simple union: all branches fail → compound error', () => {
    const error = getError(union(string, number), true);
    expect(error.message).toBe('None of the union cases matched');
    expect(error.received).toBe(true);
    expect(error.children).toHaveLength(2);
    expect(error.children[0].expected).toBe('string');
    expect(error.children[0].received).toBe(true);
    expect(error.children[1].expected).toBe('number');
    expect(error.children[1].received).toBe(true);
  });

  test('union toString() lists children', () => {
    const error = getError(union(string, number), true);
    const str = error.toString();
    expect(str).toContain('None of the union cases matched');
    expect(str).toContain('not of type `string`');
    expect(str).toContain('not of type `number`');
  });

  test('union inside record: path is set on the compound error', () => {
    const dec = record({ status: union(literal('active'), literal('inactive')) });
    const error = getError(dec, { status: 'unknown' });
    expect(error.path).toEqual(['status']);
    expect(error.message).toBe('None of the union cases matched');
    expect(error.children).toHaveLength(2);
    expect(error.children[0].message).toContain('not the literal `active`');
    expect(error.children[1].message).toContain('not the literal `inactive`');
  });

  test('discriminated union: children have meaningful errors', () => {
    const dec = union(
      record({ type: literal('a'), value: string }),
      record({ type: literal('b'), count: number }),
    );
    const error = getError(dec, { type: 'c', value: 'test' });
    expect(error.message).toBe('None of the union cases matched');
    expect(error.children).toHaveLength(2);
    // Both branches fail on the 'type' field
    expect(error.children[0].path).toEqual(['type']);
    expect(error.children[1].path).toEqual(['type']);
  });

  test('optional(string) with wrong type: union(undef, string) fails', () => {
    const error = getError(optional(string), 42);
    expect(error.message).toBe('None of the union cases matched');
    expect(error.children).toHaveLength(2);
    expect(error.children[0].expected).toBe('undefined');
    expect(error.children[1].expected).toBe('string');
  });

  test('nullable(number) with wrong type', () => {
    const error = getError(nullable(number), 'hello');
    expect(error.message).toBe('None of the union cases matched');
    expect(error.children).toHaveLength(2);
    expect(error.children[0].expected).toBe('null');
    expect(error.children[1].expected).toBe('number');
  });

  test('optional field in record: missing key succeeds, wrong type fails', () => {
    const dec = record({ name: string, nick: optional(string) });
    // missing key → undefined → matches undef branch → OK
    expect(safeDecode(dec, { name: 'Alice' }).ok).toBe(true);
    // wrong type → union(undef, string) both fail
    const error = getError(dec, { name: 'Alice', nick: 42 });
    expect(error.path).toEqual(['nick']);
    expect(error.message).toBe('None of the union cases matched');
  });
});

// ---------------------------------------------------------------------------
// Intersection decoder errors
// ---------------------------------------------------------------------------
describe('Intersection decoder errors', () => {
  test('intersection failure: compound error with children', () => {
    const dec = intersection(
      record({ a: string }),
      record({ b: number }),
    );
    const error = getError(dec, { a: 42, b: 'hello' });
    expect(error.message).toBe('Could not match all of the intersection cases');
    expect(error.children.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// field() and fields() errors
// ---------------------------------------------------------------------------
describe('field() and fields() errors', () => {
  test('field() with type mismatch', () => {
    const dec = record({ email: field('emailAddress', string) });
    const error = getError(dec, { emailAddress: 123 });
    expect(error.path).toContain('email');
    expect(error.expected).toBe('string');
    expect(error.received).toBe(123);
  });

  test('field() with missing key', () => {
    const dec = record({ email: field('emailAddress', string) });
    const error = getError(dec, { wrongKey: 'test' });
    expect(error.message).toContain('missing');
  });

  test('fields() with type mismatch', () => {
    const dec = fields({ x: string, y: number });
    const error = getError(dec, { x: 1, y: 2 });
    // fields wraps record, error should reference the key
    expect(error).toBeInstanceOf(DecodeError);
    expect(error.path.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// at() errors
// ---------------------------------------------------------------------------
describe('at() errors', () => {
  test('missing key at first level', () => {
    const dec = at('a', 'b');
    const error = getError(dec, { wrong: 'key' });
    expect(error.message).toContain('`a` is missing');
  });

  test('missing key at deeper level', () => {
    const dec = at('a', 'b');
    const error = getError(dec, { a: { wrong: 'key' } });
    expect(error.message).toContain('`b` is missing');
  });
});

// ---------------------------------------------------------------------------
// objectOf and dict errors
// ---------------------------------------------------------------------------
describe('objectOf and dict errors', () => {
  test('objectOf: value type mismatch includes key in path', () => {
    const dec = objectOf(number);
    const error = getError(dec, { a: 1, b: 'not a number' });
    expect(error.path).toEqual(['b']);
    expect(error.expected).toBe('number');
    expect(error.received).toBe('not a number');
  });

  test('objectOf: non-object input', () => {
    const error = getError(objectOf(string), 42);
    expect(error.message).toContain('not an object');
    expect(error.expected).toBe('object');
  });

  test('objectOf with typed keys: invalid key', () => {
    const dec = objectOf(number, ['small', 'medium', 'large'] as const);
    const error = getError(dec, { small: 1, xl: 4 });
    expect(error.path).toEqual(['xl']);
    expect(error.message).toContain('not in given keys');
  });

  test('dict: value type mismatch includes key in path', () => {
    const dec = dict(number);
    const error = getError(dec, { a: 1, b: 'bad' });
    expect(error.path).toEqual(['b']);
    expect(error.expected).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// set and map errors pass through from array
// ---------------------------------------------------------------------------
describe('set and map decoder errors', () => {
  test('set: element error has index in path', () => {
    const dec = set(string);
    const error = getError(dec, ['ok', 42]);
    expect(error.path).toEqual([1]);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// Complex integration scenarios
// ---------------------------------------------------------------------------
describe('Complex integration error scenarios', () => {
  test('API response structure: users list with nested address', () => {
    const addressDecoder = record({
      street: string,
      city: string,
      zipcode: string,
    });
    const userDecoder = record({
      id: number,
      name: string,
      address: addressDecoder,
    });
    const responseDecoder = record({
      status: string,
      users: array(userDecoder),
    });

    const error = getError(responseDecoder, {
      status: 'ok',
      users: [
        { id: 1, name: 'Alice', address: { street: '123 Main', city: 'Portland', zipcode: '97201' } },
        { id: 2, name: 'Bob', address: { street: '456 Oak', city: 'Seattle', zipcode: 98101 } }, // zipcode is number
      ],
    });

    expect(error.path).toEqual(['users', 1, 'address', 'zipcode']);
    expect(error.expected).toBe('string');
    expect(error.received).toBe(98101);
    expect(error.getPathString()).toBe('/users/1/address/zipcode');
    expect(error.toString()).toBe(
      'at /users/1/address/zipcode: The value `98101` is not of type `string`, but is of type `number`',
    );
  });

  test('Configuration object: deeply nested literal failure', () => {
    const configDecoder = record({
      app: record({
        env: union(literal('dev'), literal('staging'), literal('prod')),
        debug: boolean,
      }),
      db: record({
        host: string,
        port: number,
      }),
    });

    const error = getError(configDecoder, {
      app: { env: 'production', debug: false }, // 'production' not in union
      db: { host: 'localhost', port: 5432 },
    });

    expect(error.path).toEqual(['app', 'env']);
    expect(error.message).toBe('None of the union cases matched');
    expect(error.children).toHaveLength(3);
    expect(error.children[0].message).toContain('not the literal `dev`');
    expect(error.children[1].message).toContain('not the literal `staging`');
    expect(error.children[2].message).toContain('not the literal `prod`');
    expect(error.getPathString()).toBe('/app/env');
    expect(error.toString()).toContain('at /app/env: None of the union cases matched');
  });

  test('Mixed nesting: record > array > tuple', () => {
    const dec = record({
      data: array([string, number]),
    });
    const error = getError(dec, {
      data: [['a', 1], ['b', 'not a number']],
    });
    expect(error.path).toEqual(['data', 1, 1]);
    expect(error.expected).toBe('number');
    expect(error.received).toBe('not a number');
    expect(error.getPathString()).toBe('/data/1/1');
  });

  test('Full project-like decoder: multiple levels of nesting', () => {
    const memberDecoder = record({
      name: string,
      role: union(literal('admin'), literal('member'), literal('viewer')),
    });
    const teamDecoder = record({
      name: string,
      members: array(memberDecoder),
    });
    const projectDecoder = record({
      name: string,
      teams: array(teamDecoder),
    });

    const error = getError(projectDecoder, {
      name: 'My Project',
      teams: [
        {
          name: 'Frontend',
          members: [
            { name: 'Alice', role: 'admin' },
            { name: 'Bob', role: 'contributor' }, // invalid role
          ],
        },
      ],
    });

    expect(error.path).toEqual(['teams', 0, 'members', 1, 'role']);
    expect(error.message).toBe('None of the union cases matched');
    expect(error.getPathString()).toBe('/teams/0/members/1/role');
  });

  test('Discriminated union inside array inside record', () => {
    const eventDecoder = union(
      record({ type: literal('click'), x: number, y: number }),
      record({ type: literal('keypress'), key: string }),
    );
    const logDecoder = record({
      events: array(eventDecoder),
    });

    const error = getError(logDecoder, {
      events: [
        { type: 'click', x: 10, y: 20 },
        { type: 'hover', x: 30, y: 40 }, // 'hover' is not a valid event type
      ],
    });

    expect(error.path).toEqual(['events', 1]);
    expect(error.message).toBe('None of the union cases matched');
    // Each child tried to match a different union branch
    expect(error.children).toHaveLength(2);
    // First branch (click): type literal 'click' doesn't match 'hover'
    expect(error.children[0].path).toEqual(['type']);
    expect(error.children[0].message).toContain('not the literal `click`');
    // Second branch (keypress): type literal 'keypress' doesn't match 'hover'
    expect(error.children[1].path).toEqual(['type']);
    expect(error.children[1].message).toContain('not the literal `keypress`');
  });

  test('toString formats deep nested error nicely', () => {
    const dec = record({ a: record({ b: record({ c: string }) }) });
    const error = getError(dec, { a: { b: { c: 42 } } });
    expect(error.toString()).toBe(
      'at /a/b/c: The value `42` is not of type `string`, but is of type `number`',
    );
  });

  test('toString formats union-in-record error nicely', () => {
    const dec = record({ x: union(string, number) });
    const error = getError(dec, { x: true });
    const str = error.toString();
    expect(str).toMatch(/^at \/x: None of the union cases matched:/);
    expect(str).toContain('  - The value `true` is not of type `string`');
    expect(str).toContain('  - The value `true` is not of type `number`');
  });
});

// ===========================================================================
// Full error structure literals
//
// Each test compares the ENTIRE DecodeError tree as a plain object.
// If you change error messages or structure, update these literals.
// ===========================================================================
describe('Error structure snapshots', () => {
  // --- primitive at top level ---
  test('string(42)', () => {
    expect(snap(getError(string, 42))).toEqual({
      message:  'The value `42` is not of type `string`, but is of type `number`',
      path:     [],
      expected: 'string',
      received: 42,
      children: [],
      toString: 'The value `42` is not of type `string`, but is of type `number`',
    });
  });

  test('number(null)', () => {
    expect(snap(getError(number, null))).toEqual({
      message:  'The value `null` is not of type `number`, but is of type `object`',
      path:     [],
      expected: 'number',
      received: null,
      children: [],
      toString: 'The value `null` is not of type `number`, but is of type `object`',
    });
  });

  test('literal("on")("off")', () => {
    expect(snap(getError(literal('on'), 'off'))).toEqual({
      message:  'The value `off` is not the literal `on`',
      path:     [],
      expected: '"on"',
      received: 'off',
      children: [],
      toString: 'The value `off` is not the literal `on`',
    });
  });

  // --- record: wrong type in field ---
  test('{ name: string, age: number } with wrong type', () => {
    expect(snap(getError(
      { name: string, age: number },
      { name: 'Alice', age: '30' },
    ))).toEqual({
      message:  'The value `30` is not of type `number`, but is of type `string`',
      path:     ['age'],
      expected: 'number',
      received: '30',
      children: [],
      toString: 'at /age: The value `30` is not of type `number`, but is of type `string`',
    });
  });

  // --- record: missing key ---
  test('{ x: string } on empty object', () => {
    expect(snap(getError(
      { x: string },
      {},
    ))).toEqual({
      message:  'The key `x` is missing',
      path:     ['x'],
      expected: undefined,
      received: undefined,
      children: [],
      toString: 'at /x: The key `x` is missing',
    });
  });

  // --- two-level nested record ---
  test('nested record: address.street is number', () => {
    expect(snap(getError(
      { name: string, address: { street: string, city: string } },
      {
      name: 'Bob',
      address: { street: 123, city: 'Portland' },
    },
    ))).toEqual({
      message:  'The value `123` is not of type `string`, but is of type `number`',
      path:     ['address', 'street'],
      expected: 'string',
      received: 123,
      children: [],
      toString: 'at /address/street: The value `123` is not of type `string`, but is of type `number`',
    });
  });

  // --- three-level nested record: missing key ---
  test('three-level nested missing key', () => {
    expect(snap(getError(
      { a: { b: { c: number } } },
      { a: { b: {} } },
    ))).toEqual({
      message:  'The key `c` is missing',
      path:     ['a', 'b', 'c'],
      expected: undefined,
      received: undefined,
      children: [],
      toString: 'at /a/b/c: The key `c` is missing',
    });
  });

  // --- array element failure ---
  test('array(string) with bad element at index 2', () => {
    expect(snap(getError(
      array(string),
      ['a', 'b', 42, 'd'],
    ))).toEqual({
      message:  'The value `42` is not of type `string`, but is of type `number`',
      path:     [2],
      expected: 'string',
      received: 42,
      children: [],
      toString: 'at /2: The value `42` is not of type `string`, but is of type `number`',
    });
  });

  // --- array of records: compound path ---
  test('array > record: bad field in second element', () => {
    expect(snap(getError(array({ id: number, name: string }), [
      { id: 1, name: 'A' },
      { id: 2, name: 42 },
    ]))).toEqual({
      message:  'The value `42` is not of type `string`, but is of type `number`',
      path:     [1, 'name'],
      expected: 'string',
      received: 42,
      children: [],
      toString: 'at /1/name: The value `42` is not of type `string`, but is of type `number`',
    });
  });

  // --- record > array: compound path ---
  test('record > array: bad element', () => {
    expect(snap(getError(
      { tags: array(number) },
      { tags: [1, 2, 'three'] },
    ))).toEqual({
      message:  'The value `three` is not of type `number`, but is of type `string`',
      path:     ['tags', 2],
      expected: 'number',
      received: 'three',
      children: [],
      toString: 'at /tags/2: The value `three` is not of type `number`, but is of type `string`',
    });
  });

  // --- deeply nested: record > array > record > record ---
  test('five-segment path: project.members[1].user.email', () => {
    expect(snap(getError(
      { project: { members: array({ user: { email: string } }) } },
      {
      project: {
        members: [
          { user: { email: 'ok@ok.com' } },
          { user: { email: false } },
        ],
      },
    },
    ))).toEqual({
      message:  'The value `false` is not of type `string`, but is of type `boolean`',
      path:     ['project', 'members', 1, 'user', 'email'],
      expected: 'string',
      received: false,
      children: [],
      toString: 'at /project/members/1/user/email: The value `false` is not of type `string`, but is of type `boolean`',
    });
  });

  // --- tuple element failure ---
  test('[string, number]: second element wrong', () => {
    expect(snap(getError(
      [string, number],
      ['hello', true],
    ))).toEqual({
      message:  'The value `true` is not of type `number`, but is of type `boolean`',
      path:     [1],
      expected: 'number',
      received: true,
      children: [],
      toString: 'at /1: The value `true` is not of type `number`, but is of type `boolean`',
    });
  });

  // --- record > tuple: compound path ---
  test('record > tuple: coord[0] is wrong', () => {
    expect(snap(getError(
      { coord: [number, number] },
      { coord: ['x', 1] },
    ))).toEqual({
      message:  'The value `x` is not of type `number`, but is of type `string`',
      path:     ['coord', 0],
      expected: 'number',
      received: 'x',
      children: [],
      toString: 'at /coord/0: The value `x` is not of type `number`, but is of type `string`',
    });
  });

  // --- union: all branches fail ---
  test('union(string, number) given boolean', () => {
    expect(snap(getError(
      union(string, number),
      true,
    ))).toEqual({
      message:  'None of the union cases matched',
      path:     [],
      expected: undefined,
      received: true,
      children: [
        {
          message:  'The value `true` is not of type `string`, but is of type `boolean`',
          path:     [],
          expected: 'string',
          received: true,
          children: [],
          toString: 'The value `true` is not of type `string`, but is of type `boolean`',
        },
        {
          message:  'The value `true` is not of type `number`, but is of type `boolean`',
          path:     [],
          expected: 'number',
          received: true,
          children: [],
          toString: 'The value `true` is not of type `number`, but is of type `boolean`',
        },
      ],
      toString:
        'None of the union cases matched:\n' +
        '  - The value `true` is not of type `string`, but is of type `boolean`\n' +
        '  - The value `true` is not of type `number`, but is of type `boolean`',
    });
  });

  // --- union of literals inside record ---
  test('record > union(literal, literal): invalid variant', () => {
    expect(snap(getError(
      { status: union('active', 'inactive') },
      { status: 'unknown' },
    ))).toEqual({
      message:  'None of the union cases matched',
      path:     ['status'],
      expected: undefined,
      received: 'unknown',
      children: [
        {
          message:  'The value `unknown` is not the literal `active`',
          path:     [],
          expected: '"active"',
          received: 'unknown',
          children: [],
          toString: 'The value `unknown` is not the literal `active`',
        },
        {
          message:  'The value `unknown` is not the literal `inactive`',
          path:     [],
          expected: '"inactive"',
          received: 'unknown',
          children: [],
          toString: 'The value `unknown` is not the literal `inactive`',
        },
      ],
      toString:
        'at /status: None of the union cases matched:\n' +
        '  - The value `unknown` is not the literal `active`\n' +
        '  - The value `unknown` is not the literal `inactive`',
    });
  });

  // --- discriminated union: each branch fails on a different field ---
  test('discriminated union: type mismatch in both branches', () => {
    expect(snap(getError(
      union({ type: 'a' as const, value: string }, { type: 'b' as const, count: number }),
      { type: 'c', value: 'hello' },
    ))).toEqual({
      message:  'None of the union cases matched',
      path:     [],
      expected: undefined,
      received: { type: 'c', value: 'hello' },
      children: [
        {
          message:  'The value `c` is not the literal `a`',
          path:     ['type'],
          expected: '"a"',
          received: 'c',
          children: [],
          toString: 'at /type: The value `c` is not the literal `a`',
        },
        {
          message:  'The value `c` is not the literal `b`',
          path:     ['type'],
          expected: '"b"',
          received: 'c',
          children: [],
          toString: 'at /type: The value `c` is not the literal `b`',
        },
      ],
      toString:
        'None of the union cases matched:\n' +
        '  - at /type: The value `c` is not the literal `a`\n' +
        '  - at /type: The value `c` is not the literal `b`',
    });
  });

  // --- optional(string) given a number ---
  test('optional(string) with number: union(undef, string) both fail', () => {
    expect(snap(getError(optional(string), 42))).toEqual({
      message:  'None of the union cases matched',
      path:     [],
      expected: undefined,
      received: 42,
      children: [
        {
          message:  'The value `42` is not of type `undefined`, but is of type `number`',
          path:     [],
          expected: 'undefined',
          received: 42,
          children: [],
          toString: 'The value `42` is not of type `undefined`, but is of type `number`',
        },
        {
          message:  'The value `42` is not of type `string`, but is of type `number`',
          path:     [],
          expected: 'string',
          received: 42,
          children: [],
          toString: 'The value `42` is not of type `string`, but is of type `number`',
        },
      ],
      toString:
        'None of the union cases matched:\n' +
        '  - The value `42` is not of type `undefined`, but is of type `number`\n' +
        '  - The value `42` is not of type `string`, but is of type `number`',
    });
  });

  // --- objectOf: key path ---
  test('objectOf(number) with bad value', () => {
    expect(snap(getError(
      objectOf(number),
      { a: 1, b: 'bad' },
    ))).toEqual({
      message:  'The value `bad` is not of type `number`, but is of type `string`',
      path:     ['b'],
      expected: 'number',
      received: 'bad',
      children: [],
      toString: 'at /b: The value `bad` is not of type `number`, but is of type `string`',
    });
  });

  // --- complex: API response with discriminated union events in array ---
  test('events log: discriminated union failure inside array inside record', () => {
    const eventDec = union(
      { type: 'click' as const, x: number },
      { type: 'key' as const, key: string },
    );

    expect(snap(getError({ events: array(eventDec) }, {
      events: [
        { type: 'click', x: 10 },
        { type: 'scroll', amount: 5 },
      ],
    }))).toEqual({
      message:  'None of the union cases matched',
      path:     ['events', 1],
      expected: undefined,
      received: { type: 'scroll', amount: 5 },
      children: [
        {
          message:  'The value `scroll` is not the literal `click`',
          path:     ['type'],
          expected: '"click"',
          received: 'scroll',
          children: [],
          toString: 'at /type: The value `scroll` is not the literal `click`',
        },
        {
          message:  'The value `scroll` is not the literal `key`',
          path:     ['type'],
          expected: '"key"',
          received: 'scroll',
          children: [],
          toString: 'at /type: The value `scroll` is not the literal `key`',
        },
      ],
      toString:
        'at /events/1: None of the union cases matched:\n' +
        '  - at /type: The value `scroll` is not the literal `click`\n' +
        '  - at /type: The value `scroll` is not the literal `key`',
    });
  });

  // --- complex: config with nested union of 3 literals ---
  test('config with triple-literal union at app.env', () => {
    expect(snap(getError(
      { app: { env: union('dev', 'staging', 'prod'), port: number } },
      {
      app: { env: 'production', port: 3000 },
    },
    ))).toEqual({
      message:  'None of the union cases matched',
      path:     ['app', 'env'],
      expected: undefined,
      received: 'production',
      children: [
        {
          message:  'The value `production` is not the literal `dev`',
          path:     [],
          expected: '"dev"',
          received: 'production',
          children: [],
          toString: 'The value `production` is not the literal `dev`',
        },
        {
          message:  'The value `production` is not the literal `staging`',
          path:     [],
          expected: '"staging"',
          received: 'production',
          children: [],
          toString: 'The value `production` is not the literal `staging`',
        },
        {
          message:  'The value `production` is not the literal `prod`',
          path:     [],
          expected: '"prod"',
          received: 'production',
          children: [],
          toString: 'The value `production` is not the literal `prod`',
        },
      ],
      toString:
        'at /app/env: None of the union cases matched:\n' +
        '  - The value `production` is not the literal `dev`\n' +
        '  - The value `production` is not the literal `staging`\n' +
        '  - The value `production` is not the literal `prod`',
    });
  });

  // --- record > array > tuple: three-segment numeric path ---
  test('record > array > tuple: data[1][1] is wrong type', () => {
    expect(snap(getError({ data: array([string, number]) }, {
      data: [['a', 1], ['b', 'nope']],
    }))).toEqual({
      message:  'The value `nope` is not of type `number`, but is of type `string`',
      path:     ['data', 1, 1],
      expected: 'number',
      received: 'nope',
      children: [],
      toString: 'at /data/1/1: The value `nope` is not of type `number`, but is of type `string`',
    });
  });

  // --- array of arrays: double numeric index ---
  test('array(array(number)): nested array double index path', () => {
    expect(snap(getError(
      array(array(number)),
      [[1, 2], [3, 'four']],
    ))).toEqual({
      message:  'The value `four` is not of type `number`, but is of type `string`',
      path:     [1, 1],
      expected: 'number',
      received: 'four',
      children: [],
      toString: 'at /1/1: The value `four` is not of type `number`, but is of type `string`',
    });
  });

  // --- intersection failure: full literal ---
  test('intersection: both branches fail', () => {
    expect(snap(getError(
      intersection({ a: string }, { b: number }),
      { a: 42, b: 'hello' },
    ))).toEqual({
      message:  'Could not match all of the intersection cases',
      path:     [],
      expected: undefined,
      received: { a: 42, b: 'hello' },
      children: [
        {
          message:  'The value `42` is not of type `string`, but is of type `number`',
          path:     ['a'],
          expected: 'string',
          received: 42,
          children: [],
          toString: 'at /a: The value `42` is not of type `string`, but is of type `number`',
        },
        {
          message:  'The value `hello` is not of type `number`, but is of type `string`',
          path:     ['b'],
          expected: 'number',
          received: 'hello',
          children: [],
          toString: 'at /b: The value `hello` is not of type `number`, but is of type `string`',
        },
      ],
      toString:
        'Could not match all of the intersection cases:\n' +
        '  - at /a: The value `42` is not of type `string`, but is of type `number`\n' +
        '  - at /b: The value `hello` is not of type `number`, but is of type `string`',
    });
  });

  // --- deeply nested union with children that themselves have paths ---
  test('record > array > record > union(literal, literal): full tree', () => {
    const dec = record({
      teams: array({ members: array({ role: union('admin', 'viewer') }) }),
    });
    expect(snap(getError(dec, {
      teams: [
        { members: [{ role: 'admin' }] },
        { members: [{ role: 'viewer' }, { role: 'editor' }] },
      ],
    }))).toEqual({
      message:  'None of the union cases matched',
      path:     ['teams', 1, 'members', 1, 'role'],
      expected: undefined,
      received: 'editor',
      children: [
        {
          message:  'The value `editor` is not the literal `admin`',
          path:     [],
          expected: '"admin"',
          received: 'editor',
          children: [],
          toString: 'The value `editor` is not the literal `admin`',
        },
        {
          message:  'The value `editor` is not the literal `viewer`',
          path:     [],
          expected: '"viewer"',
          received: 'editor',
          children: [],
          toString: 'The value `editor` is not the literal `viewer`',
        },
      ],
      toString:
        'at /teams/1/members/1/role: None of the union cases matched:\n' +
        '  - The value `editor` is not the literal `admin`\n' +
        '  - The value `editor` is not the literal `viewer`',
    });
  });

  // --- discriminated union where branches fail at different depths ---
  test('discriminated union: branch 1 fails at /type, branch 2 fails at /data/value', () => {
    expect(snap(getError(
      union(
        { type: 'simple' as const, data: string },
        { type: 'complex' as const, data: { value: number } },
      ),
      {
      type: 'complex',
      data: { value: 'not a number' },
    },
    ))).toEqual({
      message:  'None of the union cases matched',
      path:     [],
      expected: undefined,
      received: { type: 'complex', data: { value: 'not a number' } },
      children: [
        {
          message:  'The value `complex` is not the literal `simple`',
          path:     ['type'],
          expected: '"simple"',
          received: 'complex',
          children: [],
          toString: 'at /type: The value `complex` is not the literal `simple`',
        },
        {
          message:  'The value `not a number` is not of type `number`, but is of type `string`',
          path:     ['data', 'value'],
          expected: 'number',
          received: 'not a number',
          children: [],
          toString: 'at /data/value: The value `not a number` is not of type `number`, but is of type `string`',
        },
      ],
      toString:
        'None of the union cases matched:\n' +
        '  - at /type: The value `complex` is not the literal `simple`\n' +
        '  - at /data/value: The value `not a number` is not of type `number`, but is of type `string`',
    });
  });

  // --- nullable inside array inside record: union children nested deep ---
  test('record > array > nullable(number): full compound error at depth', () => {
    expect(snap(getError({ scores: array(nullable(number)) }, {
      scores: [10, null, 'bad'],
    }))).toEqual({
      message:  'None of the union cases matched',
      path:     ['scores', 2],
      expected: undefined,
      received: 'bad',
      children: [
        {
          message:  'The value `bad` is not of type `null`, but is of type `string`',
          path:     [],
          expected: 'null',
          received: 'bad',
          children: [],
          toString: 'The value `bad` is not of type `null`, but is of type `string`',
        },
        {
          message:  'The value `bad` is not of type `number`, but is of type `string`',
          path:     [],
          expected: 'number',
          received: 'bad',
          children: [],
          toString: 'The value `bad` is not of type `number`, but is of type `string`',
        },
      ],
      toString:
        'at /scores/2: None of the union cases matched:\n' +
        '  - The value `bad` is not of type `null`, but is of type `string`\n' +
        '  - The value `bad` is not of type `number`, but is of type `string`',
    });
  });

  // --- the big one: realistic API with nested unions, arrays, missing keys ---
  test('full API response: users[1].preferences.theme fails union', () => {
    const apiDec = {
      ok: boolean,
      users: array({
        name: string,
        prefs: { theme: union('light', 'dark', 'system'), fontSize: number },
      }),
    };

    expect(snap(getError(apiDec, {
      ok: true,
      users: [
        { name: 'Alice', prefs: { theme: 'dark', fontSize: 14 } },
        { name: 'Bob', prefs: { theme: 'blue', fontSize: 16 } },
      ],
    }))).toEqual({
      message:  'None of the union cases matched',
      path:     ['users', 1, 'prefs', 'theme'],
      expected: undefined,
      received: 'blue',
      children: [
        {
          message:  'The value `blue` is not the literal `light`',
          path:     [],
          expected: '"light"',
          received: 'blue',
          children: [],
          toString: 'The value `blue` is not the literal `light`',
        },
        {
          message:  'The value `blue` is not the literal `dark`',
          path:     [],
          expected: '"dark"',
          received: 'blue',
          children: [],
          toString: 'The value `blue` is not the literal `dark`',
        },
        {
          message:  'The value `blue` is not the literal `system`',
          path:     [],
          expected: '"system"',
          received: 'blue',
          children: [],
          toString: 'The value `blue` is not the literal `system`',
        },
      ],
      toString:
        'at /users/1/prefs/theme: None of the union cases matched:\n' +
        '  - The value `blue` is not the literal `light`\n' +
        '  - The value `blue` is not the literal `dark`\n' +
        '  - The value `blue` is not the literal `system`',
    });
  });
});
