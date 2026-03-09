import { assert_is_pojo, isPojoObject } from './pojo';
import {
  decodeType,
  decode,
  Decoder,
  DecoderFunction,
  PrimitiveJsonLiteralForm,
  addQuestionmarksToRecordFields,
} from './types';
import { tag } from './utils';

export const literal =
  <p extends PrimitiveJsonLiteralForm>(literal: p): DecoderFunction<p> =>
  (value: unknown) => {
    assert_is_pojo(value);
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
  (value: unknown) => {
    assert_is_pojo(value);
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
  continuation: (x: evalRecordSchema<T>) => U,
): DecoderFunction<U> => {
  const dec = (value: unknown) => {
    assert_is_pojo(value);
    const decoded = record(decoder)(value);
    return continuation(decoded as any);
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

type evalRecordSchema<schema> = addQuestionmarksToRecordFields<{
  [key in keyof schema]: decodeType<schema[key]>;
}>;

export const record =
  <schema extends { [key: string]: Decoder<unknown> }>(
    s: schema,
  ): DecoderFunction<evalRecordSchema<schema>> =>
  (value: unknown): any => {
    assert_is_pojo(value);
    if (!isPojoObject(value)) {
      throw `Value \`${value}\` is not of type \`object\` but rather \`${typeof value}\``;
    }
    return Object.entries(s)
      .map(([key, decoder]: [string, any]) => {
        if (decoder[fieldDecoder] === true) {
          return [key, decode(decoder)(value)];
        }
        try {
          const jsonvalue = (value as any)[key];
          return [key, decode(decoder)(jsonvalue)];
        } catch (message) {
          if (!(key in (value as any))) {
            throw `The key \`${key}\` is missing in \`${JSON.stringify(
              value,
            )}\``;
          }
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
