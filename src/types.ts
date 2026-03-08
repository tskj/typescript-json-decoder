import { literal, tuple, record } from './literal-decoders';

/**
 * Json Literal Decoder
 * literal javascript objects used as if they were decoders
 * of themselves
 */

type PrimitiveJsonLiteralForm = string;
const isPrimitiveJsonLiteralForm = (
  v: unknown,
): v is PrimitiveJsonLiteralForm => typeof v === 'string';

type TupleJsonLiteralForm = [BaseDecoder<unknown>, BaseDecoder<unknown>];
const isTupleJsonLiteralForm = (v: unknown): v is TupleJsonLiteralForm =>
  Array.isArray(v) && v.length === 2 && v.every(isBaseDecoder);

type RecordJsonLiteralForm = { [key: string]: BaseDecoder<unknown> };
const isRecordJsonLiteralForm = (v: unknown): v is RecordJsonLiteralForm =>
  typeof v === 'object' && v !== null && Object.values(v).every(isBaseDecoder);

export type JsonLiteralForm =
  | PrimitiveJsonLiteralForm
  | TupleJsonLiteralForm
  | RecordJsonLiteralForm;
const isJsonLiteralForm = (decoder: unknown): decoder is JsonLiteralForm => {
  return (
    isPrimitiveJsonLiteralForm(decoder) ||
    isTupleJsonLiteralForm(decoder) ||
    isRecordJsonLiteralForm(decoder)
  );
};

/**
 * Partialify record fields which can be `undefined`
 * helper functions
 */

const a: unique symbol = Symbol();
type rem<t> = t extends typeof a ? never : t;

type undefinedKeys<T> = {
  [P in keyof T]: [undefined] extends [T[P]] ? P : never;
}[keyof T];
export type addQuestionmarksToRecordFields<R extends { [s: string]: unknown }> = {
  [P in Exclude<keyof R, undefinedKeys<R>>]: R[P];
} & {
  [P in undefinedKeys<R>]?: R[P] | typeof a;
} extends infer P
  ? // this last part is just to flatten the intersection (&)
    // { [K in keyof P]: [string | symbol] extends [P[K]] ? string | undefined | symbol : Exclude<P[K], symbol> }
    { [K in keyof P]: rem<P[K]> }
  : never;

/**
 * Run json literal decoder evaluation both at
 * type level and runtime level
 */

// prettier-ignore
type evalJsonLiteralForm<decoder> =
  [decoder] extends [PrimitiveJsonLiteralForm] ?
    decoder :
  [decoder] extends [[infer decoderA, infer decoderB]] ?
    [ decodeTypeRecur<decoderA>, decodeTypeRecur<decoderB> ] :

    addQuestionmarksToRecordFields<
    {
      [key in keyof decoder]: decodeTypeRecur<decoder[key]>;
    }
    >
const decodeJsonLiteralForm = <json extends JsonLiteralForm>(
  decoder: json,
): DecoderFunction<evalJsonLiteralForm<json>> => {
  if (isPrimitiveJsonLiteralForm(decoder)) {
    return literal(decoder) as any;
  }
  if (isTupleJsonLiteralForm(decoder)) {
    return tuple(decoder[0] as any, decoder[1] as any) as any;
  }
  if (isRecordJsonLiteralForm(decoder)) {
    return record(decoder as any) as any;
  }
  throw `shouldn't happen`;
};

/**
 * General decoder definition
 */

export type DecoderFunction<T> = (input: unknown) => T;
const isDecoderFunction = (f: unknown): f is DecoderFunction<unknown> =>
  typeof f === 'function';

type BaseDecoder<T> = JsonLiteralForm | DecoderFunction<T>;
const isBaseDecoder = <T>(decoder: unknown): decoder is BaseDecoder<T> =>
  isJsonLiteralForm(decoder) || isDecoderFunction(decoder);

export type Decoder<T> = BaseDecoder<T> | string | number | boolean;

/**
 * Run evaluation of decoder at both type and
 * runtime level
 */

export type primitive = string | boolean | number | null | undefined;
// prettier-ignore
type decodeTypeRecur<decoder> =
  (decoder extends DecoderFunction<infer T> ?
    [decodeTypeRecur<T>] :
  decoder extends string ? [decoder] :
  decoder extends number ? [decoder] :
  decoder extends boolean ? [decoder] :
  decoder extends JsonLiteralForm ?
    // only tuples and records reach here now
    [evalJsonLiteralForm<decoder>]:

    [decoder]
  // needs a bit of indirection to avoid
  // circular type reference compiler error
  )[0];
// export type decodeType<decoder> =
// decodeTypeRecur<decoder>;

export type decodeType<T> =
  // removeA<
  decodeTypeRecur<T>;
// >

export const decode = <D extends Decoder<unknown>>(
  decoder: D,
): DecoderFunction<decodeType<D>> => {
  if (typeof decoder === 'number' || typeof decoder === 'boolean') {
    return literal(decoder) as any;
  }
  if (!isDecoderFunction(decoder)) {
    return decodeJsonLiteralForm(decoder as any);
  }
  return decoder as any;
};

export const safeDecode = <D extends Decoder<unknown>>(
  decoder: D,
  value: unknown,
): { ok: true; value: decodeType<D> } | { ok: false; error: string } => {
  try {
    return { ok: true, value: decode(decoder)(value) };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
};

export function isKey<K>(value: unknown, keys: ReadonlyArray<K>): value is K {
  return keys.includes(value as any);
}
