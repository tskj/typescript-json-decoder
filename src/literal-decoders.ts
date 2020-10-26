import { optionDecoder } from './higher-order-decoders';
import { Pojo } from './pojo';
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

export const record = <schema extends { [key: string]: Decoder<unknown> }>(
  s: schema
): DecoderFunction<decode<schema>> => (value: Pojo) => {
  const objectToString = (obj: any) =>
    Object.keys(obj).length === 0 ? `{}` : `${JSON.stringify(obj)}`;
  return Object.entries(s)
    .map(([key, _decoder]: [string, any]) => {
      if (Array.isArray(value) || typeof value !== 'object' || value === null) {
        throw `Value \`${objectToString(
          value
        )}\` is not of type \`object\` but rather \`${typeof value}\``;
      }

      if (!value.hasOwnProperty(key)) {
        if (_decoder[optionDecoder]) {
          return [key, undefined];
        }
        throw `Cannot find key \`${key}\` in \`${objectToString(value)}\``;
      }

      try {
        const jsonvalue = value[key];
        return [key, decoder(_decoder)(jsonvalue)];
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
