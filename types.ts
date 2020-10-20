import { Pojo } from './pojo';
import { literal, tuple, record } from './literal-decoders';

/**
 * Json Literal Decoder
 * literal javascript objects used as if they were decoders
 * of themselves
 */

type PrimitiveJsonLiteralForm = string;
const isPrimitiveJsonLiteralForm = (
  v: unknown
): v is PrimitiveJsonLiteralForm => typeof v === 'string';

type TupleJsonLiteralForm = [Decoder<unknown>, Decoder<unknown>];
const isTupleJsonLiteralForm = (v: unknown): v is TupleJsonLiteralForm =>
  Array.isArray(v) && v.length === 2 && v.every(isDecoder);

type RecordJsonLiteralForm = { [key: string]: Decoder<unknown> };
const isRecordJsonLiteralForm = (v: unknown): v is RecordJsonLiteralForm =>
  typeof v === 'object' && v !== null && Object.values(v).every(isDecoder);

export type JsonLiteralForm =
  | PrimitiveJsonLiteralForm
  | [Decoder<unknown>, Decoder<unknown>]
  | { [key: string]: Decoder<unknown> };
const isJsonLiteralForm = (decoder: unknown): decoder is JsonLiteralForm => {
  return (
    isPrimitiveJsonLiteralForm(decoder) ||
    isTupleJsonLiteralForm(decoder) ||
    isRecordJsonLiteralForm(decoder)
  );
};

/**
 * Run json literal decoder evaluation both at
 * type level and runtime level
 */

// prettier-ignore
type evalJsonLiteralForm<decoder> =
  [decoder] extends [PrimitiveJsonLiteralForm] ?
    decoder :
  [decoder] extends [[infer decoderA, infer decoderB]] ?
    [ eval<decoderA>, eval<decoderB> ] :

    {
      [key in keyof decoder]: eval<decoder[key]>;
    }
const decodeJsonLiteralForm = <json extends JsonLiteralForm>(
  decoder: json
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

export type DecoderFunction<T> = (input: Pojo) => T;
const isDecoderFunction = (f: unknown): f is DecoderFunction<unknown> =>
  typeof f === 'function';

export type Decoder<T> = JsonLiteralForm | DecoderFunction<T>;
const isDecoder = <T>(decoder: unknown): decoder is Decoder<T> =>
  isJsonLiteralForm(decoder) || isDecoderFunction(decoder);

/**
 * Run evaluation of decoder at both type and
 * runtime level
 */

export type primitive = string | boolean | number | null | undefined;
// prettier-ignore
export type eval<decoder> =
  (decoder extends DecoderFunction<infer T> ?
    [eval<T>] :
  decoder extends JsonLiteralForm ?
    [evalJsonLiteralForm<decoder>]:

    [decoder] 
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
