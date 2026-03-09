import { literal, tuple, record } from './literal-decoders';
import { err } from './utils';

/**
 * Json Literal Decoder
 * literal javascript objects used as if they were decoders
 * of themselves
 */

export type PrimitiveJsonLiteralForm = string | number | boolean;
const isPrimitiveJsonLiteralForm = (
  v: unknown,
): v is PrimitiveJsonLiteralForm =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

type TupleJsonLiteralForm =
  | []
  | [DecoderInput<unknown>]
  | [DecoderInput<unknown>, DecoderInput<unknown>]
  | [DecoderInput<unknown>, DecoderInput<unknown>, DecoderInput<unknown>]
  | [DecoderInput<unknown>, DecoderInput<unknown>, DecoderInput<unknown>, DecoderInput<unknown>]
  | [DecoderInput<unknown>, DecoderInput<unknown>, DecoderInput<unknown>, DecoderInput<unknown>, DecoderInput<unknown>];
const isTupleJsonLiteralForm = (v: unknown): v is TupleJsonLiteralForm =>
  Array.isArray(v) && v.every(isDecoderInput);

type RecordJsonLiteralForm = { [key: string]: DecoderInput<unknown> };
const isRecordJsonLiteralForm = (v: unknown): v is RecordJsonLiteralForm =>
  typeof v === 'object' && v !== null && Object.values(v).every(isDecoderInput);

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
  [decoder] extends [[infer A, infer B, infer C, infer D, infer E]] ?
    [decodeType<A>, decodeType<B>, decodeType<C>, decodeType<D>, decodeType<E>] :
  [decoder] extends [[infer A, infer B, infer C, infer D]] ?
    [decodeType<A>, decodeType<B>, decodeType<C>, decodeType<D>] :
  [decoder] extends [[infer A, infer B, infer C]] ?
    [decodeType<A>, decodeType<B>, decodeType<C>] :
  [decoder] extends [[infer A, infer B]] ?
    [decodeType<A>, decodeType<B>] :
  [decoder] extends [[infer A]] ?
    [decodeType<A>] :
  [decoder] extends [[]] ?
    [] :

    addQuestionmarksToRecordFields<
    {
      [key in keyof decoder]: decodeType<decoder[key]>;
    }
    >
const decodeJsonLiteralForm = <json extends JsonLiteralForm>(
  decoder: json,
): DecoderFunction<evalJsonLiteralForm<json>> => {
  if (isPrimitiveJsonLiteralForm(decoder)) {
    return literal(decoder) as any;
  }
  if (isTupleJsonLiteralForm(decoder)) {
    return (tuple as any)(...decoder) as any;
  }
  if (isRecordJsonLiteralForm(decoder)) {
    return record(decoder as any) as any;
  }
  throw err`shouldn't happen`;
};

/**
 * General decoder definition
 *
 * A DecoderInput<T> is anything that can be used as a decoder:
 * - a primitive literal (string, number, boolean) — decodes to that exact value
 * - a tuple [Decoder, Decoder, ...] — decodes to a tuple
 * - a record { key: Decoder, ... } — decodes to an object
 * - a decoder function (input: unknown) => T — arbitrary decoding logic
 * - a Decoder<T> object (callable with .map, .safeDecode)
 */

export type DecoderFunction<T> = (input: unknown) => T;
const isDecoderFunction = (f: unknown): f is DecoderFunction<unknown> =>
  typeof f === 'function';

export type DecoderInput<T> = JsonLiteralForm | DecoderFunction<T>;
const isDecoderInput = <T>(decoder: unknown): decoder is DecoderInput<T> =>
  isJsonLiteralForm(decoder) || isDecoderFunction(decoder);

/**
 * A Decoder<T> is a callable object that decodes unknown input to T.
 * It supports chaining via .map() and safe invocation via .safeDecode().
 */
export interface Decoder<T> {
  (input: unknown): T;
  map<U>(k: (x: T) => U): Decoder<U>;
  chain<D extends DecoderInput<unknown>>(dec: D): Decoder<decodeType<D>>;
  safeDecode(input: unknown): { ok: true; value: T } | { ok: false; error: string };
}

/**
 * Run evaluation of decoder at both type and
 * runtime level
 */

export type primitive = string | boolean | number | null | undefined;
// prettier-ignore
// the [X][0] wrapping is needed to avoid a circular type reference error in TS 4.x
export type decodeType<decoder> =
  (decoder extends DecoderFunction<infer T> ?
    // If T is itself a DecoderFunction, recurse to unwrap it.
    // Otherwise T is already a fully decoded type — return as-is.
    // This prevents re-evaluation of decoded output types through
    // evalJsonLiteralForm, which would cause TS to hit recursion limits.
    [T extends DecoderFunction<any> ? decodeType<T> : T] :
  decoder extends string ? [decoder] :
  decoder extends number ? [decoder] :
  decoder extends boolean ? [decoder] :
  decoder extends JsonLiteralForm ?
    [evalJsonLiteralForm<decoder>] :
    [decoder]
  )[0];

/**
 * Create a rich Decoder<T> from a plain decoding function.
 */
export const makeDecoder = <T>(fn: DecoderFunction<T>): Decoder<T> => {
  const dec = Object.assign(
    (input: unknown) => fn(input),
    {
      map: <U>(k: (x: T) => U): Decoder<U> => {
        const mapped = makeDecoder((input: unknown) => k(fn(input)));
        // propagate symbol tags (e.g. fieldDecoder) through .map()
        for (const sym of Object.getOwnPropertySymbols(dec)) {
          (mapped as any)[sym] = (dec as any)[sym];
        }
        return mapped;
      },
      chain: <D extends DecoderInput<unknown>>(d: D): Decoder<decodeType<D>> => {
        const resolved = decoder(d);
        const chained = makeDecoder((input: unknown) => resolved(fn(input) as any));
        for (const sym of Object.getOwnPropertySymbols(dec)) {
          (chained as any)[sym] = (dec as any)[sym];
        }
        return chained as any;
      },
      safeDecode: (input: unknown): { ok: true; value: T } | { ok: false; error: string } => {
        try {
          return { ok: true, value: fn(input) };
        } catch (error) {
          return { ok: false, error: String(error) };
        }
      },
    },
  ) as unknown as Decoder<T>;
  return dec;
};

/**
 * Wrap any decoder input (plain function, literal form, or existing Decoder)
 * into a rich Decoder<T> with .map() and .safeDecode().
 */
export const decoder = <D extends DecoderInput<unknown>>(
  d: D,
): Decoder<decodeType<D>> => {
  if (isDecoderFunction(d)) {
    return makeDecoder(d as any);
  }
  return decodeJsonLiteralForm(d as any) as any;
};

export const safeDecode = <D extends DecoderInput<unknown>>(
  d: D,
  value: unknown,
): { ok: true; value: decodeType<D> } | { ok: false; error: string } => {
  try {
    return { ok: true, value: decoder(d)(value) };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
};

export function isKey<K>(value: unknown, keys: ReadonlyArray<K>): value is K {
  return keys.includes(value as any);
}
