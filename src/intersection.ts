import { assert_is_pojo } from './pojo';
import { decodeType, decoder, Decoder, DecoderInput, makeDecoder } from './types';
import { err } from './utils';

// ---------------------------------------------------------------------------
// Type-level intersection of a decoder array
// ---------------------------------------------------------------------------

// intersectUnion<a | b> = a & b
type intersectUnion<U> = (U extends unknown ? (_: U) => void : never) extends (
  _: infer I,
) => void
  ? I
  : never;

// asObject<[a, b]> = { 0: {_: a}, 1: {_: b} }
type asObject<T extends unknown[]> = {
  [K in Exclude<keyof T, keyof []>]: { _: decodeType<T[K]> };
};

// values<{0: a, 1: b}> = a | b
type values<T> = T[keyof T];

// fromObject {_: a} = a
type fromObject<T> = T extends { _: infer V } ? V : never;

// combine helpers to get an intersection of all the item types
type getProductOfDecoderArray<arr extends DecoderInput<unknown>[]> = fromObject<
  intersectUnion<values<asObject<arr>>>
> extends infer P
  ? // trick to normalize intersection type
    { [K in keyof P]: P[K] }
  : never;

// ---------------------------------------------------------------------------
// Runtime: combining decoded results
// ---------------------------------------------------------------------------

const validatePrototype = (a: unknown): void => {
  const proto = Object.getPrototypeOf(a);
  if (proto !== Object.prototype && proto !== Array.prototype) {
    throw err`Only Object, Array, and primitive types are allowed in intersections, but got ${proto.constructor.name}`;
  }
};

const combineObjectProperties = <A extends Object, B extends Object>(
  a: A,
  b: B,
): A & B => {
  const keys = [
    ...Object.getOwnPropertyNames(a),
    ...Object.getOwnPropertySymbols(a),
    ...Object.getOwnPropertyNames(b),
    ...Object.getOwnPropertySymbols(b),
  ];
  const result = {} as any;
  for (const key of keys) {
    const inA = key in a;
    const inB = key in b;
    if (inA && inB) {
      try {
        result[key] = combineResults((a as any)[key], (b as any)[key]);
      } catch (message) {
        throw `${message}\n` + err`While trying to combine results for field ${String(key)}`;
      }
    } else {
      result[key] = inA ? (a as any)[key] : (b as any)[key];
    }
  }
  return result as A & B;
};

const combineResults = <A, B>(a: A, b: B): A & B => {
  // Type mismatch
  if (typeof a !== typeof b) {
    throw err`Cannot form intersection of ${typeof a} and ${typeof b}, but got ${a} and ${b}`;
  }

  // Functions not supported
  if (typeof a === 'function') {
    throw err`Combining functions in intersections is not supported`;
  }

  // Primitives must be equal
  if (typeof a !== 'object') {
    if ((a as any) !== (b as any)) {
      throw err`Intersections must produce matching values in all branches, but got ${a} and ${b}`;
    }
    return a as A & B;
  }

  // Null handling
  if (a === null && b === null) return null as any;
  if (a === null || b === null) {
    const nonNull = a === null ? b : a;
    throw err`Cannot intersect null with non-null value ${nonNull}`;
  }

  // Objects and arrays
  validatePrototype(a);
  validatePrototype(b);
  const combined = combineObjectProperties(a as Object, b as Object);
  const base = Array.isArray(a) || Array.isArray(b) ? [] : {};
  return Object.assign(base, combined) as A & B;
};

// ---------------------------------------------------------------------------
// The intersection decoder
// ---------------------------------------------------------------------------

export const intersection =
  <const decoders extends DecoderInput<unknown>[]>(...decoders: decoders): Decoder<getProductOfDecoderArray<decoders>> => {
  const resolved = decoders.map((d) => decoder(d as any));
  return makeDecoder((value: unknown): getProductOfDecoderArray<decoders> => {
    assert_is_pojo(value);
    const errors: string[] = [];
    const results: any[] = [];
    for (const dec of resolved) {
      try {
        results.push(dec(value));
      } catch (message) {
        errors.push(String(message));
      }
    }
    if (errors.length > 0) {
      errors.push(err`Could not match all of the intersection cases`);
      throw errors.join('\n');
    }
    return results.length === 0
      ? ({} as any)
      : results.reduce((acc, result) => combineResults(acc, result));
  });
};
