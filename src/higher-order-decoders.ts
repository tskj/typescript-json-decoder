import { string, undef } from './primitive-decoders';
import { isPojoObject, Pojo } from './pojo';
import { decode, decoder, Decoder, DecoderFunction } from './types';

type evalOver<t> = t extends unknown ? decode<t> : never;
type getSumOfArray<arr> = arr extends (infer elements)[] ? elements : never;

export const union = <decoders extends Decoder<unknown>[]>(
  ...decoders: decoders
) => (value: Pojo): evalOver<getSumOfArray<decoders>> => {
  if (decoders.length === 0) {
    throw `Could not match any of the union cases`;
  }
  const [_decoder, ...rest] = decoders;
  try {
    return decoder(_decoder as any)(value) as any;
  } catch (messageFromThisDecoder) {
    try {
      return union(...(rest as any))(value) as any;
    } catch (message) {
      throw `${messageFromThisDecoder}\n${message}`;
    }
  }
};

export const optionDecoder: unique symbol = Symbol('optional-decoder');
export const option = <T extends Decoder<unknown>>(
  decoder: T
): DecoderFunction<decode<T> | undefined> => {
  let _optionDecoder = union(undef, decoder as any);
  (_optionDecoder as any)[optionDecoder] = true;
  return _optionDecoder;
};

export function array<D extends Decoder<unknown>>(
  _decoder: D
): DecoderFunction<decode<D>[]> {
  return (xs: Pojo): D[] => {
    const arrayToString = (arr: any) => `${JSON.stringify(arr)}`;
    if (!Array.isArray(xs)) {
      throw `The value \`${arrayToString(
        xs
      )}\` is not of type \`array\`, but is of type \`${typeof xs}\``;
    }
    let index = 0;
    try {
      return xs.map((x, i) => {
        index = i;
        return decoder(_decoder as any)(x);
      }) as any;
    } catch (message) {
      throw (
        message +
        `\nwhen trying to decode the array (at index ${index}) \`${arrayToString(
          xs
        )}\``
      );
    }
  };
}

export const set = <D extends Decoder<unknown>>(
  _decoder: D
): DecoderFunction<Set<decode<D>>> => (list: Pojo) => {
  try {
    return new Set(decoder(array(_decoder))(list));
  } catch (message) {
    throw message + `\nand can therefore not be parsed as a set`;
  }
};

export const map = <K, D extends Decoder<unknown>>(
  _decoder: D,
  key: (x: decode<D>) => K
): DecoderFunction<Map<K, decode<D>>> => (listOfObjects: Pojo) => {
  try {
    const parsedObjects = decoder(array(_decoder))(listOfObjects);
    const map = new Map(parsedObjects.map((value) => [key(value), value]));
    if (parsedObjects.length !== map.size) {
      console.warn(
        `Probable duplicate key in map: List \`${parsedObjects}\` isn't the same size as the parsed \`${map}\``
      );
    }
    return map;
  } catch (message) {
    throw message + `\nand can therefore not be parsed as a map`;
  }
};

export const dict = <D extends Decoder<unknown>>(
  _decoder: D
): DecoderFunction<Map<string, decode<D>>> => (map: Pojo) => {
  if (!isPojoObject(map)) {
    throw `Value \`${map}\` is not an object and can therefore not be parsed as a map`;
  }
  const decodedPairs = Object.entries(map).map(([key, value]) => {
    try {
      return [key, decoder(_decoder)(value)] as [string, decode<D>];
    } catch (message) {
      throw message + `\nwhen decoding the key \`${key}\` in map \`${map}\``;
    }
  });
  return new Map(decodedPairs);
};
