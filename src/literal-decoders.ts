import { assert_is_pojo, isPojoObject } from './pojo';
import {
  decodeType,
  decoder,
  Decoder,
  DecoderInput,
  makeDecoder,
  PrimitiveJsonLiteralForm,
  addQuestionmarksToRecordFields,
} from './types';
import { tag, err } from './utils';

export function literal<const p extends PrimitiveJsonLiteralForm>(lit: p): Decoder<p>;
export function literal(lit: PrimitiveJsonLiteralForm) {
  return makeDecoder((value: unknown) => {
    assert_is_pojo(value);
    if (lit !== value) {
      throw err`The value ${value} is not the literal ${lit}`;
    }
    return lit;
  });
}

export function tuple(): Decoder<[]>;
export function tuple<A extends DecoderInput<unknown>>(a: A): Decoder<[decodeType<A>]>;
export function tuple<A extends DecoderInput<unknown>, B extends DecoderInput<unknown>>(a: A, b: B): Decoder<[decodeType<A>, decodeType<B>]>;
export function tuple<A extends DecoderInput<unknown>, B extends DecoderInput<unknown>, C extends DecoderInput<unknown>>(a: A, b: B, c: C): Decoder<[decodeType<A>, decodeType<B>, decodeType<C>]>;
export function tuple<A extends DecoderInput<unknown>, B extends DecoderInput<unknown>, C extends DecoderInput<unknown>, D extends DecoderInput<unknown>>(a: A, b: B, c: C, d: D): Decoder<[decodeType<A>, decodeType<B>, decodeType<C>, decodeType<D>]>;
export function tuple<A extends DecoderInput<unknown>, B extends DecoderInput<unknown>, C extends DecoderInput<unknown>, D extends DecoderInput<unknown>, E extends DecoderInput<unknown>>(a: A, b: B, c: C, d: D, e: E): Decoder<[decodeType<A>, decodeType<B>, decodeType<C>, decodeType<D>, decodeType<E>]>;
export function tuple(...decoders: any[]) {
  const resolved = decoders.map((d: any) => decoder(d));
  return makeDecoder((value: unknown) => {
    assert_is_pojo(value);
    if (!Array.isArray(value)) {
      throw err`The value ${value} is not a list and can therefore not be parsed as a tuple`;
    }
    if (value.length !== decoders.length) {
      throw err`The array ${value} is not the proper length for a ${decoders.length}-tuple`;
    }
    return resolved.map((d, i) => d(value[i]));
  });
}

export const fieldDecoder: unique symbol = Symbol('field-decoder');
export const missingKey: unique symbol = Symbol('missing-key');
export const fields = <const T extends { [key: string]: DecoderInput<unknown> }>(
  schema: T,
): Decoder<evalRecordSchema<T>> => {
  const dec = makeDecoder((value: unknown) => {
    assert_is_pojo(value);
    return record(schema)(value) as any;
  });
  tag(dec, fieldDecoder);
  return dec;
};

// missing is hand-assembled to avoid calling makeDecoder at module load time
// (circular dependency: types.ts ↔ literal-decoders.ts)
const _missingFn = (_value: unknown): undefined => {
  throw err`should not be called directly`;
};
export const missing = Object.assign(
  _missingFn,
  {
    [missingKey]: true as const,
    map: () => missing,
    chain: () => missing,
    safeDecode: () => ({ ok: false as const, error: 'missing should not be called directly' }),
  },
) as unknown as Decoder<undefined>;

export function field(key: string): Decoder<unknown>;
export function field<D extends DecoderInput<unknown>>(key: string, d: D): Decoder<decodeType<D>>;
export function field(key: string, d?: any) {
  const dec = d ?? ((x: unknown) => x);
  return fields({ [key]: dec }).map((x: any) => x[key]);
}

const pickKey = (key: string): Decoder<unknown> =>
  makeDecoder((value: unknown) => {
    assert_is_pojo(value);
    if (typeof value !== 'object' || value === null || !((key) in value)) {
      throw err`The key ${key} is missing in ${value}`;
    }
    return (value as any)[key];
  });

export function at(...keys: string[]): Decoder<unknown> {
  const [first, ...rest] = keys;
  return rest.reduce(
    (dec: Decoder<any>, key) => dec.chain(pickKey(key)),
    pickKey(first),
  );
}

type evalRecordSchema<schema> = addQuestionmarksToRecordFields<{
  [key in keyof schema]: decodeType<schema[key]>;
}>;

export const record =
  <const schema extends { [key: string]: DecoderInput<unknown> }>(
    s: schema,
  ): Decoder<evalRecordSchema<schema>> =>
  makeDecoder((value: unknown): any => {
    assert_is_pojo(value);
    if (!isPojoObject(value)) {
      throw err`Value ${value} is not of type ${'object'} but rather ${typeof value}`;
    }
    const result: any = {};
    for (const [key, dec] of Object.entries(s) as [string, any][]) {
      if (dec[missingKey] === true) {
        if (key in (value as any)) {
          throw err`The key ${key} is present in ${value} but was expected to be missing`;
        }
        continue;
      }
      if (dec[fieldDecoder] === true) {
        result[key] = decoder(dec)(value);
        continue;
      }
      try {
        const jsonvalue = (value as any)[key];
        result[key] = decoder(dec)(jsonvalue);
      } catch (message) {
        if (!(key in (value as any))) {
          throw err`The key ${key} is missing in ${value}`;
        }
        throw (
          message +
          err`\nwhen trying to decode the key ${key} in ${value}`
        );
      }
    }
    return result;
  });
