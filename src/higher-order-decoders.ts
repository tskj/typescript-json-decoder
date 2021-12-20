import { nil, undef } from './primitive-decoders';
import { isPojoObject, Pojo } from './pojo';
import { decodeType, decode, Decoder, DecoderFunction } from './types';
import { tag } from './utils';

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
