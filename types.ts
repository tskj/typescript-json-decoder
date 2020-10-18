import { Json } from './json-types';
import { literal, tuple, record } from './literal-decoders';

/**
 * Json Literal Decoder
 * literal javascript objects used as if they were decoders
 * of themselves
 */

type JsonLiteralDecoderPrimitive = string;
const isJsonLiteralDecoderPrimitive = (
  v: unknown
): v is JsonLiteralDecoderPrimitive => typeof v === 'string';

export type JsonLiteralDecoder =
  | JsonLiteralDecoderPrimitive
  | [Decoder<unknown>, Decoder<unknown>]
  | { [key: string]: Decoder<unknown> };
const isJsonLiteralDecoder = (
  decoder: unknown
): decoder is JsonLiteralDecoder => {
  return (
    isJsonLiteralDecoderPrimitive(decoder) ||
    (Array.isArray(decoder) &&
      decoder.length === 2 &&
      decoder.every((x) => isJsonLiteralDecoder(x) || isDecoderFunction(x))) ||
    (typeof decoder === 'object' &&
      decoder !== null &&
      Object.values(decoder).every(
        (x) => isJsonLiteralDecoder(x) || isDecoderFunction(x)
      ))
  );
};

/**
 * Run json literal decoder evaluation both at
 * type level and runtime level
 */

// prettier-ignore
type evalJsonLiteralDecoder<decoder> =
  [decoder] extends [JsonLiteralDecoderPrimitive] ?
    decoder :
  [decoder] extends [[infer decoderA, infer decoderB]] ?
    [ eval<decoderA>, eval<decoderB> ] :

    {
      [key in keyof decoder]: eval<decoder[key]>;
    }
const jsonLiteralDecoder = <json extends JsonLiteralDecoder>(
  decoder: json
): DecoderFunction<evalJsonLiteralDecoder<json>> => {
  if (isJsonLiteralDecoderPrimitive(decoder)) {
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

export type DecoderFunction<T> = (input: Json) => T;
const isDecoderFunction = (f: unknown): f is DecoderFunction<unknown> =>
  typeof f === 'function';

export type Decoder<T> = DecoderFunction<T> | JsonLiteralDecoder;

/**
 * Run evaluation of decoder at both type and
 * runtime level
 */

export type primitive = string | boolean | number | null | undefined;
// prettier-ignore
export type eval<decoder> =
  ([decoder] extends [primitive] ?
    [decoder] :
  [decoder] extends [(input: Json) => infer T] ?
    [eval<T>] :

    [evalJsonLiteralDecoder<decoder>]
  )[0];

export type decoded<decoder> = eval<decoder>;

export const decode = <D extends Decoder<unknown>>(
  decoder: D
): DecoderFunction<eval<D>> => {
  if (!isDecoderFunction(decoder)) {
    return jsonLiteralDecoder(decoder as any);
  }
  return decoder as any;
};
