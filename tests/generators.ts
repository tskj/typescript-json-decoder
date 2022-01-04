import fc from 'fast-check';
import * as d from '../src';

type DecoderArbitrary<T> = fc.Arbitrary<{
  value: T;
  decoder: d.Decoder<T>;
}>;

export const string = () =>
  fc.string().map((s) => ({
    value: s,
    decoder: d.string,
  }));

export const number = () =>
  fc.float().map((n) => ({
    value: n,
    decoder: d.number,
  }));

export const boolean = () =>
  fc.boolean().map((b) => ({
    value: b,
    decoder: d.boolean,
  }));

export const undef = () =>
  fc.constant(undefined).map((u) => ({
    value: u,
    decoder: d.undef,
  }));

export const nil = () =>
  fc.constant(null).map((u) => ({
    value: u,
    decoder: d.nil,
  }));
