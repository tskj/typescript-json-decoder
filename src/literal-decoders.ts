import { isPojoObject, Pojo } from './pojo';
import {
  decodeType,
  decode,
  Decoder,
  DecoderFunction,
  JsonLiteralForm,
} from './types';
import { tag } from './utils';

export const literal =
  <p extends JsonLiteralForm>(literal: p): DecoderFunction<p> =>
  (value: Pojo) => {
    if (literal !== value) {
      throw `The value \`${JSON.stringify(
        value,
      )}\` is not the literal \`${JSON.stringify(literal)}\``;
    }
    return literal;
  };

export const tuple =
  <A extends Decoder<unknown>, B extends Decoder<unknown>>(
    decoderA: A,
    decoderB: B,
  ): DecoderFunction<[decodeType<A>, decodeType<B>]> =>
  (value: Pojo) => {
    if (!Array.isArray(value)) {
      throw `The value \`${JSON.stringify(
        value,
      )}\` is not a list and can therefore not be parsed as a tuple`;
    }
    if (value.length !== 2) {
      throw `The array \`${JSON.stringify(
        value,
      )}\` is not the proper length for a tuple`;
    }
    const [a, b] = value;
    return [decode(decoderA as any)(a), decode(decoderB as any)(b)];
  };

export const fieldDecoder: unique symbol = Symbol('field-decoder');
export const fields = <T extends { [key: string]: Decoder<unknown> }, U>(
  decoder: T,
  continuation: (x: decodeType<T>) => U,
): DecoderFunction<U> => {
  const dec = (value: Pojo) => {
    const decoded = decode(decoder)(value);
    return continuation(decoded);
  };
  tag(dec, fieldDecoder);
  return dec;
};

export const field = <T>(
  key: string,
  decoder: Decoder<T>,
): DecoderFunction<T> => {
  return fields({ [key]: decoder }, (x: any) => x[key]);
};

export const record =
  <schema extends { [key: string]: Decoder<unknown> }>(
    s: schema,
  ): DecoderFunction<decodeType<schema>> =>
  (value: Pojo) => {
    if (!isPojoObject(value)) {
      throw `Value \`${value}\` is not of type \`object\` but rather \`${typeof value}\``;
    }
    return Object.entries(s)
      .map(([key, decoder]: [string, any]) => {
        if (decoder[fieldDecoder] === true) {
          return [key, decode(decoder)(value)];
        }
        try {
          const jsonvalue = value[key];
          return [key, decode(decoder)(jsonvalue)];
        } catch (message) {
          throw (
            message +
            `\nwhen trying to decode the key \`${key}\` in \`${JSON.stringify(
              value,
            )}\``
          );
        }
      })
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  };
