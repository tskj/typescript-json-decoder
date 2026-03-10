import { nil, undef } from './primitive-decoders';
import { assert_is_pojo, isPojoObject } from './pojo';
import { decodeType, decode, Decoder, DecoderFunction, isKey } from './types';
import { err } from './utils';

const apply = (k: any, x: any) => k ? k(x) : x;

export const always = <T>(value: T): DecoderFunction<T> =>
  (_input: unknown) => value;

export const transform = <D extends Decoder<unknown>, U>(
  decoder: D,
  k: (x: decodeType<D>) => U,
): DecoderFunction<U> =>
  (value: unknown) => k(decode(decoder)(value) as any);

export const lazy = <T>(thunk: () => Decoder<T>): DecoderFunction<T> =>
  (value: unknown) => decode(thunk())(value) as T;

type evalOver<t> = t extends unknown ? decodeType<t> : never;
type getSumOfArray<arr> = arr extends (infer elements)[] ? elements : never;

export const union =
  <decoders extends Decoder<unknown>[]>(...decoders: decoders) =>
  (value: unknown): evalOver<getSumOfArray<decoders>> => {
    assert_is_pojo(value);
    if (decoders.length === 0) {
      throw err`Could not match any of the union cases`;
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

export { intersection } from './intersection';

export function nullable<T extends Decoder<unknown>>(
  decoder: T,
): DecoderFunction<decodeType<T> | null>;
export function nullable<T extends Decoder<unknown>, U>(
  decoder: T,
  k: (x: decodeType<T>) => U,
): DecoderFunction<U | null>;
export function nullable(decoder: any, k?: (x: any) => any) {
  const base = union(nil, decoder);
  return (value: unknown) => {
    const result = base(value);
    return result === null ? result : apply(k, result);
  };
}

export function optional<T extends Decoder<unknown>>(
  decoder: T,
): DecoderFunction<decodeType<T> | undefined>;
export function optional<T extends Decoder<unknown>, U>(
  decoder: T,
  k: (x: decodeType<T>) => U,
): DecoderFunction<U | undefined>;
export function optional(decoder: any, k?: (x: any) => any) {
  const base = union(undef, decoder);
  return (value: unknown) => {
    const result = base(value);
    return result === undefined ? result : apply(k, result);
  };
}

export function fallback<T extends Decoder<unknown>>(
  decoder: T,
  fallbackValue: decodeType<T>,
): DecoderFunction<decodeType<T>>;
export function fallback<T extends Decoder<unknown>, F>(
  decoder: T,
  fallbackValue: F,
): DecoderFunction<decodeType<T> | F>;
export function fallback(decoder: any, fallbackValue: any) {
  return (value: unknown) => {
    try {
      return decode(decoder)(value);
    } catch {
      return fallbackValue;
    }
  };
}

export function array<D extends Decoder<unknown>>(
  decoder: D,
): DecoderFunction<decodeType<D>[]>;
export function array<D extends Decoder<unknown>, U>(
  decoder: D,
  k: (x: decodeType<D>[]) => U,
): DecoderFunction<U>;
export function array(decoder: any, k?: (x: any) => any) {
  return (xs: unknown): any => {
    assert_is_pojo(xs);
    if (!Array.isArray(xs)) {
      throw err`The value ${xs} is not of type ${'array'}, but is of type ${typeof xs}`;
    }
    let index = 0;
    try {
      const result = xs.map((x, i) => {
        index = i;
        return decode(decoder)(x);
      });
      return apply(k, result);
    } catch (message) {
      throw (
        message +
        err`\nwhen trying to decode the array (at index ${index}) ${xs}`
      );
    }
  };
}

export function nonEmptyArray<D extends Decoder<unknown>>(
  decoder: D,
): DecoderFunction<[decodeType<D>, ...decodeType<D>[]]>;
export function nonEmptyArray<D extends Decoder<unknown>, U>(
  decoder: D,
  k: (x: [decodeType<D>, ...decodeType<D>[]]) => U,
): DecoderFunction<U>;
export function nonEmptyArray(decoder: any, k?: (x: any) => any) {
  const base = array(decoder);
  return (xs: unknown): any => {
    const result = base(xs);
    if (result.length === 0) {
      throw err`Expected a non-empty array, but got an empty array`;
    }
    return apply(k, result);
  };
}

export function set<D extends Decoder<unknown>>(
  decoder: D,
): DecoderFunction<Set<decodeType<D>>>;
export function set<D extends Decoder<unknown>, U>(
  decoder: D,
  k: (x: Set<decodeType<D>>) => U,
): DecoderFunction<U>;
export function set(decoder: any, k?: (x: any) => any) {
  return (list: unknown) => {
    assert_is_pojo(list);
    try {
      return apply(k, new Set(decode(array(decoder))(list)));
    } catch (message) {
      throw message + err`\nand can therefore not be parsed as a set`;
    }
  };
}

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
      throw message + err`\nand can therefore not be parsed as a map`;
    }
  };

export function objectOf<D extends Decoder<unknown>, K extends string = string>(
  decoder: D,
  keys?: ReadonlyArray<K>,
): DecoderFunction<Record<K, decodeType<D>>>;
export function objectOf<D extends Decoder<unknown>, U>(
  decoder: D,
  k: (x: Record<string, decodeType<D>>) => U,
): DecoderFunction<U>;
export function objectOf<D extends Decoder<unknown>, K extends string, U>(
  decoder: D,
  keys: ReadonlyArray<K>,
  k: (x: Record<K, decodeType<D>>) => U,
): DecoderFunction<U>;
export function objectOf(decoder: any, keysOrK?: any, k?: any) {
  const keys = Array.isArray(keysOrK) ? keysOrK : undefined;
  const cont = typeof keysOrK === 'function' ? keysOrK : k;
  return (obj: unknown) => {
    assert_is_pojo(obj);
    if (!isPojoObject(obj)) {
      throw err`Value ${obj} is not an object and can therefore not be parsed as a record`;
    }
    const result = {} as any;
    for (const [key, value] of Object.entries(obj)) {
      try {
        if (keys && !isKey(key, keys)) {
          throw err`Key ${key} is not in given keys`;
        }
        result[key] = decode(decoder)(value);
      } catch (message) {
        throw message + err`\nwhen decoding the key ${key} in record ${obj}`;
      }
    }
    return apply(cont, result);
  };
}

export function dict<D extends Decoder<unknown>, K extends string = string>(
  decoder: D,
  keys?: ReadonlyArray<K>,
): DecoderFunction<Map<K, decodeType<D>>>;
export function dict<D extends Decoder<unknown>, U>(
  decoder: D,
  k: (x: Map<string, decodeType<D>>) => U,
): DecoderFunction<U>;
export function dict<D extends Decoder<unknown>, K extends string, U>(
  decoder: D,
  keys: ReadonlyArray<K>,
  k: (x: Map<K, decodeType<D>>) => U,
): DecoderFunction<U>;
export function dict(decoder: any, keysOrK?: any, k?: any) {
  const keys = Array.isArray(keysOrK) ? keysOrK : undefined;
  const cont = typeof keysOrK === 'function' ? keysOrK : k;
  return (map: unknown) => {
    assert_is_pojo(map);
    if (!isPojoObject(map)) {
      throw err`Value ${map} is not an object and can therefore not be parsed as a map`;
    }
    const decodedPairs = Object.entries(map).map(([key, value]) => {
      try {
        if (keys && !isKey(key, keys)) {
          throw err`Key ${key} is not in given keys`;
        }
        return [key, decode(decoder)(value)] as [any, any];
      } catch (message) {
        throw message + err`\nwhen decoding the key ${key} in map ${map}`;
      }
    });
    return apply(cont, new Map(decodedPairs));
  };
}
