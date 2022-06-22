import { nil, undef } from './primitive-decoders';
import { assert_is_pojo, isPojoObject } from './pojo';
import { decodeType, decode, Decoder, DecoderFunction } from './types';

type evalOver<t> = t extends unknown ? decodeType<t> : never;
type getSumOfArray<arr> = arr extends (infer elements)[] ? elements : never;

export const union =
  <decoders extends Decoder<unknown>[]>(...decoders: decoders) =>
  (value: unknown): evalOver<getSumOfArray<decoders>> => {
    assert_is_pojo(value);
    if (decoders.length === 0) {
      throw `Could not match any of the union cases`;
    }
    const [decoder, ...rest] = decoders;
    try {
      return decode(decoder as any)(value) as any;
    } catch (messageFromThisDecoder) {
      try {
        return union(...(rest as any))(value) as any;
      } catch (message) {
        throw `${messageFromThisDecoder}\n${message}`;
      }
    }
  };

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
type getProductOfDecoderArray<arr extends Decoder<unknown>[]> = fromObject<
  intersectUnion<values<asObject<arr>>>
> extends infer P
  ? // trick to normalize intersection type
    { [K in keyof P]: P[K] }
  : never;

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
  return keys.reduce((acc, key) => {
    const aProp = (a as any)[key];
    const bProp = (b as any)[key];
    return {
      ...acc,
      ...{
        [key]:
          key in a
            ? key in b
              ? (() => {
                  try {
                    return combineResults(aProp, bProp);
                  } catch (message) {
                    throw `${message}\nWhile trying to combine results for field '${String(
                      key,
                    )}'`;
                  }
                })()
              : aProp
            : bProp,
      },
    };
  }, {}) as A & B;
};

// Custom classes aren't allowed do to complications when extracting private
// fields and such
const validatePrototype = (a: unknown): void => {
  const proto = Object.getPrototypeOf(a);
  if (proto !== Object.prototype && proto !== Array.prototype) {
    throw `Only Object, and Array, and the primitive types are allowed in intersections, but got ${proto.constructor.name}`;
  }
};

// For intersections with primitive types, we compare the results to
// make sure they are equal. With objects, recursively combine any properties
const combineResults = <A, B>(a: A, b: B): A & B => {
  const jsType = typeof a;
  if (jsType !== typeof b) {
    throw `Cannot form intersection of ${typeof a} and ${typeof b}, but got ${a} and ${b}`;
  } else if (jsType === 'function') {
    throw `Combining functions in intersections is not supported`;
  } else if (jsType === 'object') {
    if ([a, b].some((x) => x === null)) {
      const nonNull = [a, b].find((x) => x !== null);
      if (nonNull !== undefined) {
        throw `Cannot intersect null with non-null value ${nonNull}`;
      } else {
        return null as any;
      }
    }
    validatePrototype(a);
    validatePrototype(b);

    const result = combineObjectProperties(a, b);
    const base = Array.isArray(a) || Array.isArray(b) ? [] : {};
    return Object.assign(base, result);
  } else {
    if ((a as any) !== (b as any)) {
      throw `Intersections must produce matching values in all branches, but got ${a} and ${b}`;
    }
    return a as A & B;
  }
};

// NB: if multiple cases create properties with identical keys, only the last one is kept
export const intersection =
  <decoders extends Decoder<unknown>[]>(...decoders: decoders) =>
  (value: unknown): getProductOfDecoderArray<decoders> => {
    assert_is_pojo(value);
    const errors: any[] = [];
    const results: any[] = [];
    for (const decoder of decoders) {
      try {
        results.push(decode(decoder)(value));
      } catch (message) {
        errors.push(message);
      }
    }
    if (errors.length === 0) {
      return results.length === 0
        ? ({} as any)
        : results.reduce((acc, result) => combineResults(acc, result));
    } else {
      errors.push(`Could not match all of the intersection cases`);
      throw errors.join('\n');
    }
  };

export const nullable = <T extends Decoder<unknown>>(
  decoder: T,
): DecoderFunction<decodeType<T> | null> => {
  return union(nil, decoder as any);
};

export const optional = <T extends Decoder<unknown>>(
  decoder: T,
): DecoderFunction<decodeType<T> | undefined> => union(undef, decoder as any);

export function array<D extends Decoder<unknown>>(
  decoder: D,
): DecoderFunction<decodeType<D>[]> {
  return (xs: unknown): any => {
    assert_is_pojo(xs);
    const arrayToString = (arr: any) => `${JSON.stringify(arr)}`;
    if (!Array.isArray(xs)) {
      throw `The value \`${arrayToString(
        xs,
      )}\` is not of type \`array\`, but is of type \`${typeof xs}\``;
    }
    let index = 0;
    try {
      return xs.map((x, i) => {
        index = i;
        return decode(decoder as any)(x);
      }) as any;
    } catch (message) {
      throw (
        message +
        `\nwhen trying to decode the array (at index ${index}) \`${arrayToString(
          xs,
        )}\``
      );
    }
  };
}

export const set =
  <D extends Decoder<unknown>>(
    decoder: D,
  ): DecoderFunction<Set<decodeType<D>>> =>
  (list: unknown) => {
    assert_is_pojo(list);
    try {
      return new Set(decode(array(decoder))(list));
    } catch (message) {
      throw message + `\nand can therefore not be parsed as a set`;
    }
  };

export const map =
  <K, D extends Decoder<unknown>>(
    decoder: D,
    key: (x: decodeType<D>) => K,
  ): DecoderFunction<Map<K, decodeType<D>>> =>
  (listOfObjects: unknown) => {
    assert_is_pojo(listOfObjects);
    try {
      const parsedObjects = decode(array(decoder))(listOfObjects);
      const map = new Map(parsedObjects.map((value) => [key(value), value]));
      if (parsedObjects.length !== map.size) {
        console.warn(
          `Probable duplicate key in map: List \`${parsedObjects}\` isn't the same size as the parsed \`${map}\``,
        );
      }
      return map;
    } catch (message) {
      throw message + `\nand can therefore not be parsed as a map`;
    }
  };

export const dict =
  <D extends Decoder<unknown>>(
    decoder: D,
  ): DecoderFunction<Map<string, decodeType<D>>> =>
  (map: unknown) => {
    assert_is_pojo(map);
    if (!isPojoObject(map)) {
      throw `Value \`${map}\` is not an object and can therefore not be parsed as a map`;
    }
    const decodedPairs = Object.entries(map).map(([key, value]) => {
      try {
        return [key, decode(decoder)(value)] as [string, decodeType<D>];
      } catch (message) {
        throw message + `\nwhen decoding the key \`${key}\` in map \`${map}\``;
      }
    });
    return new Map(decodedPairs);
  };
