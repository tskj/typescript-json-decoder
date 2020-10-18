import { Json } from './json-types';
import {
  eval,
  decode,
  Decoder,
  DecoderFunction,
  JsonLiteralDecoder,
} from './types';

export const literal = <p extends JsonLiteralDecoder>(
  literal: p
): DecoderFunction<p> => (value: Json) => {
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
): DecoderFunction<[eval<A>, eval<B>]> => (value: Json) => {
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
  return [decode(decoderA as any)(a), decode(decoderB as any)(b)];
};

export const record = <schema extends { [key: string]: Decoder<unknown> }>(
  s: schema
): DecoderFunction<eval<schema>> => (value: Json) => {
  const objectToString = (obj: any) =>
    Object.keys(obj).length === 0 ? `{}` : `${JSON.stringify(obj)}`;
  return Object.entries(s)
    .map(([key, decoder]: [string, any]) => {
      if (Array.isArray(value) || typeof value !== 'object' || value === null) {
        throw `Value \`${objectToString(
          value
        )}\` is not of type \`object\` but rather \`${typeof value}\``;
      }

      if (!value.hasOwnProperty(key)) {
        if (decoder[optionDecoder]) {
          return [key, undefined];
        }
        throw `Cannot find key \`${key}\` in \`${objectToString(value)}\``;
      }

      try {
        const jsonvalue = value[key];
        return [key, decode(decoder)(jsonvalue)];
      } catch (message) {
        throw (
          message +
          `\nwhen trying to decode the key \`${key}\` in \`${objectToString(
            value
          )}\``
        );
      }
    })
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};
