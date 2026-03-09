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

const apply = (k: any, x: any) => k ? k(x) : x;

export function literal<p extends PrimitiveJsonLiteralForm>(lit: p): DecoderFunction<p>;
export function literal<p extends PrimitiveJsonLiteralForm, U>(lit: p, k: (x: p) => U): DecoderFunction<U>;
export function literal(lit: PrimitiveJsonLiteralForm, k?: (x: any) => any) {
  return (value: unknown) => {
    assert_is_pojo(value);
    if (lit !== value) {
      throw `The value \`${JSON.stringify(
        value,
      )}\` is not the literal \`${JSON.stringify(lit)}\``;
    }
    return apply(k, lit);
  };
}

export function tuple(): DecoderFunction<[]>;
export function tuple<A extends Decoder<unknown>>(a: A): DecoderFunction<[decodeType<A>]>;
export function tuple<A extends Decoder<unknown>, B extends Decoder<unknown>>(a: A, b: B): DecoderFunction<[decodeType<A>, decodeType<B>]>;
export function tuple<A extends Decoder<unknown>, B extends Decoder<unknown>, C extends Decoder<unknown>>(a: A, b: B, c: C): DecoderFunction<[decodeType<A>, decodeType<B>, decodeType<C>]>;
export function tuple<A extends Decoder<unknown>, B extends Decoder<unknown>, C extends Decoder<unknown>, D extends Decoder<unknown>>(a: A, b: B, c: C, d: D): DecoderFunction<[decodeType<A>, decodeType<B>, decodeType<C>, decodeType<D>]>;
export function tuple<A extends Decoder<unknown>, B extends Decoder<unknown>, C extends Decoder<unknown>, D extends Decoder<unknown>, E extends Decoder<unknown>>(a: A, b: B, c: C, d: D, e: E): DecoderFunction<[decodeType<A>, decodeType<B>, decodeType<C>, decodeType<D>, decodeType<E>]>;
export function tuple(...decoders: any[]) {
  return (value: unknown) => {
    assert_is_pojo(value);
    if (!Array.isArray(value)) {
      throw `The value \`${JSON.stringify(
        value,
      )}\` is not a list and can therefore not be parsed as a tuple`;
    }
    if (value.length !== decoders.length) {
      throw `The array \`${JSON.stringify(
        value,
      )}\` is not the proper length for a ${decoders.length}-tuple`;
    }
    return decoders.map((d, i) => decode(d)(value[i]));
  };
}

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

export function field<D extends Decoder<unknown>>(
  key: string,
  decoder: D,
): DecoderFunction<decodeType<D>>;
export function field<D extends Decoder<unknown>, U>(
  key: string,
  decoder: D,
  k: (x: decodeType<D>) => U,
): DecoderFunction<U>;
export function field(
  key: string,
  decoder: Decoder<unknown>,
  k?: (x: any) => any,
) {
  return fields({ [key]: decoder }, (x: any) => apply(k, x[key]));
}

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
