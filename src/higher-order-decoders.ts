import { nil, undef } from './primitive-decoders';
import { isPojoObject, Pojo } from './pojo';
import { decodeType, decode, Decoder, DecoderFunction } from './types';

type evalOver<t> = t extends unknown ? decodeType<t> : never;
type getSumOfArray<arr> = arr extends (infer elements)[] ? elements : never;

export const union =
  <decoders extends Decoder<unknown>[]>(...decoders: decoders) =>
  (value: Pojo): evalOver<getSumOfArray<decoders>> => {
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
type intersectUnion<U> = (U extends unknown ? ((_: U) => void) : never) extends ((_: infer I) => void) ? I : never;

// asObject<[a, b]> = { 0: {_: a}, 1: {_: b} }
type asObject<T extends unknown[]> = {[K in Exclude<keyof T, keyof []>]: {_: decodeType<T[K]>}};

// values<{0: a, 1: b}> = a | b
type values<T> = T[keyof T];

// fromObject {_: a} = a
type fromObject<T> = T extends {_: infer V} ? V : never;

// combine helpers to get an intersection of all the item types
type getProductOfDecoderArray<arr extends Decoder<unknown>[]> = fromObject<intersectUnion<values<asObject<arr>>>>;

// NB: if multiple cases create properties with identical keys, only the last one is kept
export const intersection =
  <decoders extends Decoder<unknown>[]>(...decoders: decoders) =>
    (value: Pojo): getProductOfDecoderArray<decoders> => {
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
        // When not all cases are objects, the static type checking of the
        // intersection should ensure that we can safely return just the
        // result of the last case
        return results.some(res => typeof res !== 'object')
          ? results[results.length - 1]
          : results.reduce((acc, val) => ({...acc, ...val}), {});
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
  return (xs: Pojo): D[] => {
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
  (list: Pojo) => {
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
  (listOfObjects: Pojo) => {
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
  (map: Pojo) => {
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
