import { optionDecoder } from './higher-order-decoders';
import { isPojoObject, Pojo, PojoObject } from './pojo';
import {
  decode,
  decoder,
  Decoder,
  DecoderFunction,
  JsonLiteralForm,
} from './types';

export const literal = <p extends JsonLiteralForm>(
  literal: p
): DecoderFunction<p> => (value: Pojo) => {
  if (literal !== value) {
    throw `The value \`${JSON.stringify(
      value
    )}\` is not the literal \`${JSON.stringify(literal)}\``;
  }
  return literal;
};

export const tuple = <A extends Decoder<unknown>, B extends Decoder<unknown>>(
  decoderA: A,
  decoderB: B
): DecoderFunction<[decode<A>, decode<B>]> => (value: Pojo) => {
  if (!Array.isArray(value)) {
    throw `The value \`${JSON.stringify(
      value
    )}\` is not a list and can therefore not be parsed as a tuple`;
  }
  if (value.length !== 2) {
    throw `The array \`${JSON.stringify(
      value
    )}\` is not the proper length for a tuple`;
  }
  const [a, b] = value;
  return [decoder(decoderA as any)(a), decoder(decoderB as any)(b)];
};

export const fieldDecoder: unique symbol = Symbol('field-decoder');
export const field = <T>(
  key: string,
  _decoder: Decoder<T>
): DecoderFunction<T> => {
  const dec = (value: PojoObject) => {
    const objectToString = (obj: any) =>
      Object.keys(obj).length === 0 ? `{}` : `${JSON.stringify(obj)}`;
    if (!value.hasOwnProperty(key)) {
      if ((_decoder as any)[optionDecoder]) {
        return undefined;
      }
      throw `Cannot find key \`${key}\` in \`${objectToString(value)}\``;
    }
    try {
      const jsonvalue = value[key];
      return decoder(_decoder)(jsonvalue);
    } catch (message) {
      throw (
        message +
        `\nwhen trying to decode the key \`${key}\` in \`${objectToString(
          value
        )}\``
      );
    }
  };
  (dec as any)[fieldDecoder] = true;
  return dec as any;
};

export function fields<T extends { [key: string]: Decoder<unknown> }, U>(
  _decoder: T,
  f: (x: decode<T>) => U
): DecoderFunction<U> {
  const dec = (value: Pojo) => {
    const decoded = decoder(_decoder)(value);
    return f(decoded);
  };
  (dec as any)[fieldDecoder] = true;
  return dec;
}

export const record = <schema extends { [key: string]: Decoder<unknown> }>(
  s: schema
): DecoderFunction<decode<schema>> => (value: Pojo) => {
  if (!isPojoObject(value)) {
    throw `Value \`${value}\` is not of type \`object\` but rather \`${typeof value}\``;
  }
  return Object.entries(s)
    .map(([key, _decoder]: [string, any]) => {
      const _fieldDecoder = _decoder[fieldDecoder]
        ? _decoder
        : field(key, _decoder);
      return [key, _fieldDecoder(value)] as [string, any];
    })
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};
