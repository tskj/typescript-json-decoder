import { nil, undef } from './primitive-decoders';
import { assert_is_pojo, isPojoObject } from './pojo';
import { decodeType, decoder, Decoder, DefaultDecoder, DecoderInput, makeDecoder, isKey } from './types';
import { DecodeError, asDecodeError } from './decode-error';
import { err, defaultTag } from './utils';

export const always = <const T>(value: T): DefaultDecoder<T> => {
  const dec = makeDecoder((_input: unknown) => value);
  (dec as any)[defaultTag] = value;
  return dec as unknown as DefaultDecoder<T>;
};

export const lazy = <const T>(thunk: () => DecoderInput<T>): Decoder<T> =>
  makeDecoder((value: unknown) => decoder(thunk())(value) as T);

type evalOver<t> = t extends unknown ? decodeType<t> : never;
type getSumOfArray<arr> = arr extends (infer elements)[] ? elements : never;

const unionImpl = (decoders: DecoderInput<unknown>[], value: unknown): any => {
  assert_is_pojo(value);
  const errors: DecodeError[] = [];
  for (const dec of decoders) {
    try {
      return decoder(dec as any)(value);
    } catch (error) {
      errors.push(asDecodeError(error));
    }
  }
  throw DecodeError.compound(
    'None of the union cases matched',
    errors,
    value,
  );
};

export const union =
  <const decoders extends DecoderInput<unknown>[]>(...decoders: decoders): Decoder<evalOver<getSumOfArray<decoders>>> =>
  makeDecoder((value: unknown) => unionImpl(decoders, value));

export { intersection } from './intersection';

export function nullable<const T extends DecoderInput<unknown>>(
  dec: T,
): DefaultDecoder<decodeType<T> | null> {
  const d = union(nil, dec);
  (d as any)[defaultTag] = null;
  return d as unknown as DefaultDecoder<decodeType<T> | null>;
}

export function optional<const T extends DecoderInput<unknown>>(
  dec: T,
): DefaultDecoder<decodeType<T> | undefined> {
  const d = union(undef, dec);
  (d as any)[defaultTag] = undefined;
  return d as unknown as DefaultDecoder<decodeType<T> | undefined>;
}

export function withDefault<T extends DecoderInput<unknown>>(
  dec: T,
  fallback: decodeType<T>,
): DefaultDecoder<decodeType<T>>;
export function withDefault<T extends DecoderInput<unknown>, const F>(
  dec: T,
  fallback: F,
): DefaultDecoder<decodeType<T> | F>;
export function withDefault(dec: any, fallback: any) {
  const d = decoder(dec);
  const result = makeDecoder((value: unknown) => {
    try {
      return d(value);
    } catch {
      return fallback;
    }
  });
  (result as any)[defaultTag] = fallback;
  return result;
}

export function array<const D extends DecoderInput<unknown>>(
  dec: D,
): Decoder<decodeType<D>[]> {
  const d = decoder(dec);
  return makeDecoder((xs: unknown): any => {
    assert_is_pojo(xs);
    if (!Array.isArray(xs)) {
      throw DecodeError.simple(
        err`The value ${xs} is not of type ${'array'}, but is of type ${typeof xs}`,
        'array',
        xs,
      );
    }
    return xs.map((x, i) => {
      try {
        return d(x);
      } catch (error) {
        throw asDecodeError(error).withPath(i);
      }
    });
  });
}

export function nonEmptyArray<const D extends DecoderInput<unknown>>(
  dec: D,
): Decoder<[decodeType<D>, ...decodeType<D>[]]> {
  const arr = array(dec);
  return makeDecoder((xs: unknown): any => {
    const result = arr(xs);
    if (result.length === 0) {
      throw DecodeError.simple(
        'Expected a non-empty array, but got an empty array',
        'non-empty array',
        xs,
      );
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
    return new Set(arr(list));
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
    const parsedObjects = arr(listOfObjects);
    const resultMap = new Map(parsedObjects.map((value) => [key(value), value]));
    if (parsedObjects.length !== resultMap.size) {
      console.warn(
        `Probable duplicate key in map: List \`${parsedObjects}\` isn't the same size as the parsed \`${resultMap}\``,
      );
    }
    return resultMap;
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
      throw DecodeError.simple(
        err`Value ${obj} is not an object and can therefore not be parsed as a record`,
        'object',
        obj,
      );
    }
    const result = {} as any;
    for (const [key, value] of Object.entries(obj)) {
      try {
        if (keys && !isKey(key, keys)) {
          throw DecodeError.simple(
            err`Key ${key} is not in given keys`,
            `one of [${keys.join(', ')}]`,
            key,
          );
        }
        result[key] = d(value);
      } catch (error) {
        throw asDecodeError(error).withPath(key);
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
      throw DecodeError.simple(
        err`Value ${obj} is not an object and can therefore not be parsed as a map`,
        'object',
        obj,
      );
    }
    const decodedPairs = Object.entries(obj).map(([key, value]) => {
      try {
        if (keys && !isKey(key, keys)) {
          throw DecodeError.simple(
            err`Key ${key} is not in given keys`,
            `one of [${keys.join(', ')}]`,
            key,
          );
        }
        return [key, d(value)] as [any, any];
      } catch (error) {
        throw asDecodeError(error).withPath(key);
      }
    });
    return new Map(decodedPairs);
  });
}
