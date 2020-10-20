import { Pojo } from './pojo';
import { literal, tuple, record } from './literal-decoders';

/**
 * Json Literal Decoder
 * literal javascript objects used as if they were decoders
 * of themselves
 */

type JsonLiteralFormPrimitive = string;
const isJsonLiteralFormPrimitive = (
  v: unknown
): v is JsonLiteralFormPrimitive => typeof v === 'string';

export type JsonLiteralForm =
  | JsonLiteralFormPrimitive
  | [Decoder<unknown>, Decoder<unknown>]
  | { [key: string]: Decoder<unknown> };
const isJsonLiteralForm = (decoder: unknown): decoder is JsonLiteralForm => {
  return (
    isJsonLiteralFormPrimitive(decoder) ||
    (Array.isArray(decoder) &&
      decoder.length === 2 &&
      decoder.every((x) => isJsonLiteralForm(x) || isDecoderFunction(x))) ||
    (typeof decoder === 'object' &&
      decoder !== null &&
      Object.values(decoder).every(
        (x) => isJsonLiteralForm(x) || isDecoderFunction(x)
      ))
  );
};

/**
 * Run json literal decoder evaluation both at
 * type level and runtime level
 */

// prettier-ignore
type evalJsonLiteralForm<decoder> =
  [decoder] extends [JsonLiteralFormPrimitive] ?
    decoder :
  [decoder] extends [[infer decoderA, infer decoderB]] ?
    [ eval<decoderA>, eval<decoderB> ] :

    {
      [key in keyof decoder]: eval<decoder[key]>;
    }
const decodeJsonLiteralForm = <json extends JsonLiteralForm>(
  decoder: json
): DecoderFunction<evalJsonLiteralForm<json>> => {
  if (isJsonLiteralFormPrimitive(decoder)) {
    return literal(decoder) as any;
  }
  if (Array.isArray(decoder)) {
    return tuple(decoder[0] as any, decoder[1] as any) as any;
  }
  if (typeof decoder === 'object') {
    return record(decoder as any);
  }
  throw `shouldn't happen`;
};

/**
 * General decoder definition
 */

export type DecoderFunction<T> = (input: Pojo) => T;
const isDecoderFunction = (f: unknown): f is DecoderFunction<unknown> =>
  typeof f === 'function';

export type Decoder<T> = DecoderFunction<T> | JsonLiteralForm;

/**
 * Run evaluation of decoder at both type and
 * runtime level
 */

export type primitive = string | boolean | number | null | undefined;
// prettier-ignore
export type eval<decoder> =
  ([decoder] extends [primitive] ?
    [decoder] :
  [decoder] extends [(input: Pojo) => infer T] ?
    [eval<T>] :

    [evalJsonLiteralForm<decoder>]
  // needs a bit of indirection to avoid
  // circular type reference compiler error
  )[0];

export const decode = <D extends Decoder<unknown>>(
  decoder: D
): DecoderFunction<eval<D>> => {
  if (!isDecoderFunction(decoder)) {
    return decodeJsonLiteralForm(decoder as any);
  }
  return decoder as any;
};
