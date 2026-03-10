import { Decoder as DecoderInterface, RecordDecoder, DecoderInput, decodeType, decoder } from './types';
import { DecodeError } from './decode-error';

/**
 * Decoder() wraps any decoder or literal form into a class that can be extended,
 * giving you a single name that serves as both type and decoder.
 *
 *   class User extends Decoder({ name: string, age: number }) {}
 *   class Pair extends Decoder([string, number]) {}
 *
 *   // User is a type:
 *   const u: User = { name: 'Alice', age: 30 };
 *
 *   // User is a decoder:
 *   const u2: User = User.decode(json);
 *
 * The decoded values are plain objects — no class instances, no prototype chain.
 * TypeScript's structural typing makes this work.
 */

// For plain record schema (literal form) — the cleanest usage
export function Decoder<const S extends { [key: string]: DecoderInput<unknown> }>(
  schema: S,
): {
  new(input: unknown): decodeType<S>;
  decode(input: unknown): decodeType<S>;
  safeDecode(input: unknown): { ok: true; value: decodeType<S> } | { ok: false; error: DecodeError };
  create: RecordDecoder<S, decodeType<S>>['create'];
};
// For tuple literal forms
export function Decoder<const T extends DecoderInput<unknown>[]>(
  schema: [...T],
): {
  new(input: unknown): { [K in keyof T]: decodeType<T[K]> };
  decode(input: unknown): { [K in keyof T]: decodeType<T[K]> };
  safeDecode(input: unknown): { ok: true; value: { [K in keyof T]: decodeType<T[K]> } } | { ok: false; error: DecodeError };
  create(patch?: Partial<{ [K in keyof T]: decodeType<T[K]> }>): { [K in keyof T]: decodeType<T[K]> };
};
// For record decoders: preserve schema-aware .create()
export function Decoder<S, T>(dec: RecordDecoder<S, T>): {
  new(input: unknown): T;
  decode(input: unknown): T;
  safeDecode(input: unknown): { ok: true; value: T } | { ok: false; error: DecodeError };
  create: RecordDecoder<S, T>['create'];
};
// For any decoder
export function Decoder<T>(dec: DecoderInterface<T>): {
  new(input: unknown): T;
  decode(input: unknown): T;
  safeDecode(input: unknown): { ok: true; value: T } | { ok: false; error: DecodeError };
  create(patch?: Partial<T>): T;
};
export function Decoder(d: DecoderInput<unknown> | DecoderInput<unknown>[]) {
  const dec: DecoderInterface<any> = decoder(d as any);
  return class {
    constructor(input: unknown) {
      return dec(input) as any;
    }
    static decode(input: unknown) {
      return dec(input);
    }
    static safeDecode(input: unknown) {
      return dec.safeDecode(input);
    }
    static create(patch?: any) {
      return (dec as any).create(patch);
    }
  } as any;
}
