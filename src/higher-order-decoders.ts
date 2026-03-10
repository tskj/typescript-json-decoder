import { nil, undef } from './primitive-decoders';
import { assert_is_pojo, isPojoObject } from './pojo';
import { decodeType, decoder, Decoder, DecoderInput, makeDecoder, isKey } from './types';
import { err } from './utils';

export const always = <const T>(value: T): Decoder<T> =>
  makeDecoder((_input: unknown) => value);

export const lazy = <const T>(thunk: () => DecoderInput<T>): Decoder<T> =>
  makeDecoder((value: unknown) => decoder(thunk())(value) as T);

type evalOver<t> = t extends unknown ? decodeType<t> : never;
type getSumOfArray<arr> = arr extends (infer elements)[] ? elements : never;

const unionImpl = (decoders: DecoderInput<unknown>[], value: unknown): any => {
  assert_is_pojo(value);
  if (decoders.length === 0) {
    throw err`Could not match any of the union cases`;
  }
  const [dec, ...rest] = decoders;
  try {
    return decoder(dec as any)(value);
  } catch (messageFromThisDecoder) {
    try {
      return unionImpl(rest, value);
    } catch (message) {
      throw `${messageFromThisDecoder}\n${message}`;
    }
  }
};

export const union =
  <const decoders extends DecoderInput<unknown>[]>(...decoders: decoders): Decoder<evalOver<getSumOfArray<decoders>>> =>
  makeDecoder((value: unknown) => unionImpl(decoders, value));

export { intersection } from './intersection';

export function nullable<const T extends DecoderInput<unknown>>(
  dec: T,
): Decoder<decodeType<T> | null> {
  return union(nil, dec) as any;
}

export function optional<const T extends DecoderInput<unknown>>(
  dec: T,
): Decoder<decodeType<T> | undefined> {
  return union(undef, dec) as any;
}

export function withDefault<T extends DecoderInput<unknown>>(
  dec: T,
  fallback: decodeType<T>,
): Decoder<decodeType<T>>;
export function withDefault<T extends DecoderInput<unknown>, const F>(
  dec: T,
  fallback: F,
): Decoder<decodeType<T> | F>;
export function withDefault(dec: any, fallback: any) {
  const d = decoder(dec);
  return makeDecoder((value: unknown) => {
    try {
      return d(value);
    } catch {
      return fallback;
    }
  });
}

export function array<const D extends DecoderInput<unknown>>(
  dec: D,
): Decoder<decodeType<D>[]> {
  const d = decoder(dec);
  return makeDecoder((xs: unknown): any => {
    assert_is_pojo(xs);
    if (!Array.isArray(xs)) {
      throw err`The value ${xs} is not of type ${'array'}, but is of type ${typeof xs}`;
    }
    let index = 0;
    try {
      return xs.map((x, i) => {
        index = i;
        return d(x);
      });
    } catch (message) {
      throw (
        message +
        err`\nwhen trying to decode the array (at index ${index}) ${xs}`
      );
    }
  });
}

export function nonEmptyArray<const D extends DecoderInput<unknown>>(
  dec: D,
): Decoder<[decodeType<D>, ...decodeType<D>[]]> {
  const arr = array(dec);
  return makeDecoder((xs: unknown): any => {
    const result = arr(xs);
    if (result.length === 0) {
      throw err`Expected a non-empty array, but got an empty array`;
    }
    return result;
  });
}

export function set<const D extends DecoderInput<unknown>>(
  dec: D,
): Decoder<Set<decodeType<D>>> {
  const arr = array(dec);
  return makeDecoder((list: unknown) => {
    assert_is_pojo(list);
    try {
      return new Set(arr(list));
    } catch (message) {
      throw message + err`\nand can therefore not be parsed as a set`;
    }
  });
}

export const map =
  <K, D extends DecoderInput<unknown>>(
    dec: D,
    key: (x: decodeType<D>) => K,
  ): Decoder<Map<K, decodeType<D>>> => {
  const arr = array(dec);
  return makeDecoder((listOfObjects: unknown) => {
    assert_is_pojo(listOfObjects);
    try {
      const parsedObjects = arr(listOfObjects);
      const resultMap = new Map(parsedObjects.map((value) => [key(value), value]));
      if (parsedObjects.length !== resultMap.size) {
        console.warn(
          `Probable duplicate key in map: List \`${parsedObjects}\` isn't the same size as the parsed \`${resultMap}\``,
        );
      }
      return resultMap;
    } catch (message) {
      throw message + err`\nand can therefore not be parsed as a map`;
    }
  });
};

export function objectOf<D extends DecoderInput<unknown>, const K extends string = string>(
  dec: D,
  keys?: ReadonlyArray<K>,
): Decoder<Record<K, decodeType<D>>>;
export function objectOf(dec: any, keys?: any) {
  const d = decoder(dec);
  return makeDecoder((obj: unknown) => {
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
        result[key] = d(value);
      } catch (message) {
        throw message + err`\nwhen decoding the key ${key} in record ${obj}`;
      }
    }
    return result;
  });
}

export function dict<D extends DecoderInput<unknown>, const K extends string = string>(
  dec: D,
  keys?: ReadonlyArray<K>,
): Decoder<Map<K, decodeType<D>>>;
export function dict(dec: any, keys?: any) {
  const d = decoder(dec);
  return makeDecoder((obj: unknown) => {
    assert_is_pojo(obj);
    if (!isPojoObject(obj)) {
      throw err`Value ${obj} is not an object and can therefore not be parsed as a map`;
    }
    const decodedPairs = Object.entries(obj).map(([key, value]) => {
      try {
        if (keys && !isKey(key, keys)) {
          throw err`Key ${key} is not in given keys`;
        }
        return [key, d(value)] as [any, any];
      } catch (message) {
        throw message + err`\nwhen decoding the key ${key} in map ${obj}`;
      }
    });
    return new Map(decodedPairs);
  });
}
