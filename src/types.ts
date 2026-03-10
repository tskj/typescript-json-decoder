import { literal, tuple, record } from './literal-decoders';
import { err, defaultTag, recordSchemaTag, fieldDecoder, missingKey } from './utils';
import { DecodeError } from './decode-error';

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
  [P in undefinedKeys<R>]?: Exclude<R[P], undefined> | typeof a;
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

type DeepPartial<T> =
  T extends Date | RegExp | Map<any, any> | Set<any> ? T :
  T extends Array<infer U> ? Array<DeepPartial<U>> :
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } :
  T;

export interface Decoder<T> {
  (input: unknown): T;
  map<U>(k: (x: T) => U): Decoder<U>;
  chain<D extends DecoderInput<unknown>>(dec: D): Decoder<decodeType<D>>;
  safeDecode(input: unknown): { ok: true; value: T } | { ok: false; error: DecodeError };
  default(value: T): DefaultDecoder<T>;
  create(patch?: DeepPartial<T>): T;
}

/**
 * A decoder that carries a default value for use with .create().
 */
export interface DefaultDecoder<T> extends Decoder<T> {
  readonly _hasDefault: true;
  map<U>(k: (x: T) => U): DefaultDecoder<U>;
}

/**
 * Type-level helpers for schema-aware .create() on record decoders.
 */
// An element that auto-defaults: DefaultDecoder, bare literal, or defaulted tuple
type _DefaultedInput = DefaultDecoder<any> | PrimitiveJsonLiteralForm;
type _DefaultedTuple =
  | []
  | [_DefaultedInput]
  | [_DefaultedInput, _DefaultedInput]
  | [_DefaultedInput, _DefaultedInput, _DefaultedInput]
  | [_DefaultedInput, _DefaultedInput, _DefaultedInput, _DefaultedInput]
  | [_DefaultedInput, _DefaultedInput, _DefaultedInput, _DefaultedInput, _DefaultedInput];

// A key is "defaulted" if its decoder has a default, OR if it's a record
// where all fields recursively have defaults (auto-constructible with no args),
// OR if it's a bare primitive literal, OR if it's a tuple where all elements are defaulted.
type _DefaultKeys<S> = {
  [K in keyof S]:
    S[K] extends DefaultDecoder<any> ? K :
    S[K] extends PrimitiveJsonLiteralForm ? K :
    S[K] extends _DefaultedTuple ? K :
    S[K] extends { readonly _schema: infer NS }
      ? [_RequiredCreateKeys<NS>] extends [never] ? K : never
      : never;
}[keyof S];

type _RequiredCreateKeys<S> = Exclude<keyof S, _DefaultKeys<S>>;

// Recursively compute the patch type for a field:
// - defaulted record (.default() on record): all patch fields become optional
// - non-defaulted record: schema-aware patch with required/optional fields
// - other decoder: use decodeType
type _FieldPatchType<D> =
  D extends DefaultDecoder<any> & { readonly _schema: infer NS }
    ? { [K in keyof _CreatePatch<NS>]?: _CreatePatch<NS>[K] }
    : D extends { readonly _schema: infer NS }
      ? _CreatePatch<NS>
      : decodeType<D>;

type _CreatePatch<S> =
  { [K in _RequiredCreateKeys<S>]: _FieldPatchType<S[K]> } &
  { [K in _DefaultKeys<S>]?: _FieldPatchType<S[K]> } extends infer P
  ? { [K in keyof P]: P[K] }
  : never;

type _RecordCreateFn<S, T> =
  [_RequiredCreateKeys<S>] extends [never]
    ? (patch?: _CreatePatch<S>) => T
    : (patch: _CreatePatch<S>) => T;

/**
 * A record decoder with schema-aware .create() that enforces
 * required fields (those without defaults) at the type level.
 * The _schema phantom property enables recursive patch type computation.
 */
export type RecordDecoder<S, T> = {
  (input: unknown): T;
  readonly _schema: S;
} & Omit<Decoder<T>, 'create' | 'default'> & {
  create: _RecordCreateFn<S, T>;
  default(value: T): DefaultDecoder<T> & { readonly _schema: S };
};

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
          if (sym === defaultTag) {
            (mapped as any)[defaultTag] = k((dec as any)[defaultTag]);
          } else {
            (mapped as any)[sym] = (dec as any)[sym];
          }
        }
        return mapped;
      },
      chain: <D extends DecoderInput<unknown>>(d: D): Decoder<decodeType<D>> => {
        const resolved = decoder(d);
        const chained = makeDecoder((input: unknown) => resolved(fn(input) as any));
        for (const sym of Object.getOwnPropertySymbols(dec)) {
          if (sym === defaultTag || sym === recordSchemaTag) continue;
          (chained as any)[sym] = (dec as any)[sym];
        }
        return chained as any;
      },
      safeDecode: (input: unknown): { ok: true; value: T } | { ok: false; error: DecodeError } => {
        try {
          return { ok: true, value: fn(input) };
        } catch (error) {
          const decodeError = error instanceof DecodeError ? error : new DecodeError(String(error));
          return { ok: false, error: decodeError };
        }
      },
      default: (value: T): DefaultDecoder<T> => {
        const withDef = makeDecoder(fn);
        for (const sym of Object.getOwnPropertySymbols(dec)) {
          (withDef as any)[sym] = (dec as any)[sym];
        }
        (withDef as any)[defaultTag] = value;
        return withDef as unknown as DefaultDecoder<T>;
      },
      create: (patch?: any): T => {
        // Record decoder: recursively construct from schema + patch
        if (recordSchemaTag in dec) {
          const schema = (dec as any)[recordSchemaTag] as Record<string, any>;
          const recordDefault = defaultTag in dec ? (dec as any)[defaultTag] : undefined;
          const effectivePatch = patch && recordDefault
            ? { ...recordDefault, ...patch }
            : patch ?? recordDefault;
          const result: any = {};
          for (const [key, fieldDec] of Object.entries(schema)) {
            if (fieldDec[missingKey] === true) continue;
            const resolved = (typeof fieldDec === 'function' && 'create' in fieldDec)
              ? fieldDec as any
              : decoder(fieldDec as any) as any;
            try {
              let created;
              if (effectivePatch && key in effectivePatch) {
                created = resolved.create(effectivePatch[key]);
              } else {
                created = resolved.create();
              }
              if (created !== undefined) {
                result[key] = created;
              }
            } catch {
              throw new Error(`No default value for field '${key}'`);
            }
          }
          return result;
        }
        // Non-record: use patch or default
        if (patch !== undefined) return patch;
        if (defaultTag in dec) {
          const val = (dec as any)[defaultTag];
          // Clone arrays/plain objects to avoid shared mutable references
          if (Array.isArray(val)) return [...val] as any;
          if (val !== null && typeof val === 'object' && Object.getPrototypeOf(val) === Object.prototype) return { ...val } as any;
          return val;
        }
        throw new Error('Decoder has no default value');
      },
    },
  ) as unknown as Decoder<T>;
  return dec;
};

/**
 * Wrap any decoder input (plain function, literal form, or existing Decoder)
 * into a rich Decoder<T> with .map() and .safeDecode().
 */
export const decoder = <const D extends DecoderInput<unknown>>(
  d: D,
): Decoder<decodeType<D>> => {
  if (isDecoderFunction(d)) {
    // If d is already a Decoder (has .map), return as-is to preserve symbols
    if ('map' in d) return d as any;
    return makeDecoder(d as any);
  }
  return decodeJsonLiteralForm(d as any) as any;
};

export const safeDecode = <const D extends DecoderInput<unknown>>(
  d: D,
  value: unknown,
): { ok: true; value: decodeType<D> } | { ok: false; error: DecodeError } => {
  try {
    return { ok: true, value: decoder(d)(value) };
  } catch (error) {
    const decodeError = error instanceof DecodeError ? error : new DecodeError(String(error));
    return { ok: false, error: decodeError };
  }
};

export function isKey<K>(value: unknown, keys: ReadonlyArray<K>): value is K {
  return keys.includes(value as any);
}
