import { assert_is_pojo } from './pojo';
import { Decoder, makeDecoder } from './types';
import { err } from './utils';

export const string: Decoder<string> = makeDecoder((s: unknown) => {
  assert_is_pojo(s);
  if (typeof s !== 'string') {
    throw err`The value ${s} is not of type ${'string'}, but is of type ${typeof s}`;
  }
  return s;
});

export const number: Decoder<number> = makeDecoder((n: unknown) => {
  assert_is_pojo(n);
  if (typeof n !== 'number') {
    throw err`The value ${n} is not of type ${'number'}, but is of type ${typeof n}`;
  }
  return n;
});

export const boolean: Decoder<boolean> = makeDecoder((b: unknown) => {
  assert_is_pojo(b);
  if (typeof b !== 'boolean') {
    throw err`The value ${b} is not of type ${'boolean'}, but is of type ${typeof b}`;
  }
  return b;
});

export const undef: Decoder<undefined> = makeDecoder(((u: unknown) => {
  assert_is_pojo(u);
  if (typeof u !== 'undefined') {
    throw err`The value ${u} is not of type ${'undefined'}, but is of type ${typeof u}`;
  }
  return u;
}) as any);

export const nil: Decoder<null> = makeDecoder(((u: unknown) => {
  assert_is_pojo(u);
  if (u !== null) {
    throw err`The value ${u} is not of type ${'null'}, but is of type ${typeof u}`;
  }
  return u as null;
}) as any);

export const integer: Decoder<number> = makeDecoder((n: unknown) => {
  const num = number(n);
  if (!Number.isInteger(num)) {
    throw err`The value ${n} is not an integer`;
  }
  return num;
});

export const date: Decoder<Date> = makeDecoder((value: unknown) => {
  assert_is_pojo(value);
  const dateString = string(value);
  const timeStampSinceEpoch = Date.parse(dateString);
  if (isNaN(timeStampSinceEpoch)) {
    throw err`String ${dateString} is not a valid date string`;
  }
  return new Date(timeStampSinceEpoch);
});

export const bigint: Decoder<bigint> = makeDecoder((value: unknown) => {
  assert_is_pojo(value);
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw err`The number ${value} is not an integer and cannot be converted to a bigint`;
    }
    return BigInt(value);
  }
  if (typeof value === 'string') {
    try {
      return BigInt(value);
    } catch {
      throw err`The string ${value} cannot be parsed as a bigint`;
    }
  }
  throw err`The value ${value} cannot be converted to a bigint`;
});

export const regex =
  (pattern: RegExp): Decoder<string> =>
  makeDecoder((value: unknown) => {
    const str = string(value);
    if (!pattern.test(str)) {
      throw err`The string ${str} does not match the pattern ${pattern}`;
    }
    return str;
  });

export const unknown: Decoder<unknown> = makeDecoder((value: unknown) => {
  return value;
});
