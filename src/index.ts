export { decoder, decodeType, DefaultDecoder, RecordDecoder, DecoderInput, DecoderFunction, safeDecode } from './types';
import type { Decoder as _DecoderType } from './types';
import { Decoder as _DecoderValue } from './class-api';
// Merge the Decoder interface (type) and Decoder function (value) under one name.
// TypeScript allows a single export to occupy both the type and value namespace.
export const Decoder: typeof _DecoderValue = _DecoderValue;
export type Decoder<T> = _DecoderType<T>;
export { DecodeError, asDecodeError } from './decode-error';
export { tuple, literal, record, field, fields, at, missing } from './literal-decoders';
export {
  union,
  intersection,
  optional,
  array,
  nonEmptyArray,
  set,
  map,
  dict,
  nullable,
  always,
  fallback,
  withDefault,
  objectOf,
  lazy,
} from './higher-order-decoders';
export {
  string,
  number,
  boolean,
  undef,
  nil,
  date,
  integer,
  bigint,
  regex,
  unknown,
} from './primitive-decoders';
export { Pojo } from './pojo';
