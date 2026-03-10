import { assert_is_pojo, isPojoObject } from './pojo';
import {
  decodeType,
  decoder,
  Decoder,
  DefaultDecoder,
  RecordDecoder,
  DecoderInput,
  makeDecoder,
  PrimitiveJsonLiteralForm,
  addQuestionmarksToRecordFields,
} from './types';
import { DecodeError, asDecodeError } from './decode-error';
import { tag, err, defaultTag, fieldDecoder, missingKey, recordSchemaTag } from './utils';

export function literal<const p extends PrimitiveJsonLiteralForm>(lit: p): DefaultDecoder<p>;
export function literal(lit: PrimitiveJsonLiteralForm) {
  const dec = makeDecoder((value: unknown) => {
    assert_is_pojo(value);
    if (lit !== value) {
      throw DecodeError.simple(
        err`The value ${value} is not the literal ${lit}`,
        JSON.stringify(lit),
        value,
      );
    }
    return lit;
  });
  (dec as any)[defaultTag] = lit;
  return dec;
}

export function tuple(): Decoder<[]>;
export function tuple<A extends DecoderInput<unknown>>(a: A): Decoder<[decodeType<A>]>;
export function tuple<A extends DecoderInput<unknown>, B extends DecoderInput<unknown>>(a: A, b: B): Decoder<[decodeType<A>, decodeType<B>]>;
export function tuple<A extends DecoderInput<unknown>, B extends DecoderInput<unknown>, C extends DecoderInput<unknown>>(a: A, b: B, c: C): Decoder<[decodeType<A>, decodeType<B>, decodeType<C>]>;
export function tuple<A extends DecoderInput<unknown>, B extends DecoderInput<unknown>, C extends DecoderInput<unknown>, D extends DecoderInput<unknown>>(a: A, b: B, c: C, d: D): Decoder<[decodeType<A>, decodeType<B>, decodeType<C>, decodeType<D>]>;
export function tuple<A extends DecoderInput<unknown>, B extends DecoderInput<unknown>, C extends DecoderInput<unknown>, D extends DecoderInput<unknown>, E extends DecoderInput<unknown>>(a: A, b: B, c: C, d: D, e: E): Decoder<[decodeType<A>, decodeType<B>, decodeType<C>, decodeType<D>, decodeType<E>]>;
export function tuple(...decoders: any[]) {
  const resolved = decoders.map((d: any) => decoder(d));
  const dec = makeDecoder((value: unknown) => {
    assert_is_pojo(value);
    if (!Array.isArray(value)) {
      throw DecodeError.simple(
        err`The value ${value} is not a list and can therefore not be parsed as a tuple`,
        `tuple of length ${decoders.length}`,
        value,
      );
    }
    if (value.length !== decoders.length) {
      throw DecodeError.simple(
        err`The array ${value} is not the proper length for a ${decoders.length}-tuple`,
        `tuple of length ${decoders.length}`,
        value,
      );
    }
    return resolved.map((d, i) => {
      try {
        return d(value[i]);
      } catch (error) {
        throw asDecodeError(error).withPath(i);
      }
    });
  });
  // Auto-default: if all elements can create, set the tuple's default
  try {
    (dec as any)[defaultTag] = resolved.map((d: any) => d.create());
  } catch { /* not all elements have defaults */ }
  return dec;
}

export { fieldDecoder, missingKey };
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
    default: () => missing,
    create: () => undefined,
  },
) as unknown as DefaultDecoder<undefined>;

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
      throw new DecodeError(
        err`The key ${key} is missing`,
        [key],
      );
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
  ): RecordDecoder<schema, evalRecordSchema<schema>> => {
  const dec = makeDecoder((value: unknown): any => {
    assert_is_pojo(value);
    if (!isPojoObject(value)) {
      throw DecodeError.simple(
        err`Value ${value} is not of type ${'object'} but rather ${typeof value}`,
        'object',
        value,
      );
    }
    const result: any = {};
    for (const [key, dec] of Object.entries(s) as [string, any][]) {
      if (dec[missingKey] === true) {
        if (key in (value as any)) {
          throw new DecodeError(
            err`The key ${key} is present but was expected to be missing`,
            [key],
            'missing key',
            (value as any)[key],
          );
        }
        continue;
      }
      if (dec[fieldDecoder] === true) {
        try {
          result[key] = decoder(dec)(value);
        } catch (error) {
          throw asDecodeError(error).withPath(key);
        }
        continue;
      }
      try {
        const jsonvalue = (value as any)[key];
        result[key] = decoder(dec)(jsonvalue);
      } catch (error) {
        if (!(key in (value as any))) {
          throw new DecodeError(
            err`The key ${key} is missing`,
            [key],
          );
        }
        throw asDecodeError(error).withPath(key);
      }
    }
    return result;
  });
  (dec as any)[recordSchemaTag] = s;
  return dec as any;
};
