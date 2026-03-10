import { assert_is_pojo } from './pojo';
import { Decoder, makeDecoder } from './types';
import { DecodeError } from './decode-error';
import { err } from './utils';

export const string: Decoder<string> = makeDecoder((s: unknown) => {
  assert_is_pojo(s);
  if (typeof s !== 'string') {
    throw DecodeError.simple(
      err`The value ${s} is not of type ${'string'}, but is of type ${typeof s}`,
      'string',
      s,
    );
  }
  return s;
});

export const number: Decoder<number> = makeDecoder((n: unknown) => {
  assert_is_pojo(n);
  if (typeof n !== 'number') {
    throw DecodeError.simple(
      err`The value ${n} is not of type ${'number'}, but is of type ${typeof n}`,
      'number',
      n,
    );
  }
  return n;
});

export const boolean: Decoder<boolean> = makeDecoder((b: unknown) => {
  assert_is_pojo(b);
  if (typeof b !== 'boolean') {
    throw DecodeError.simple(
      err`The value ${b} is not of type ${'boolean'}, but is of type ${typeof b}`,
      'boolean',
      b,
    );
  }
  return b;
});

export const undef: Decoder<undefined> = makeDecoder(((u: unknown) => {
  assert_is_pojo(u);
  if (typeof u !== 'undefined') {
    throw DecodeError.simple(
      err`The value ${u} is not of type ${'undefined'}, but is of type ${typeof u}`,
      'undefined',
      u,
    );
  }
  return u;
}) as any);

export const nil: Decoder<null> = makeDecoder(((u: unknown) => {
  assert_is_pojo(u);
  if (u !== null) {
    throw DecodeError.simple(
      err`The value ${u} is not of type ${'null'}, but is of type ${typeof u}`,
      'null',
      u,
    );
  }
  return u as null;
}) as any);

export const integer: Decoder<number> = makeDecoder((n: unknown) => {
  const num = number(n);
  if (!Number.isInteger(num)) {
    throw DecodeError.simple(err`The value ${n} is not an integer`, 'integer', n);
  }
  return num;
});

export const date: Decoder<Date> = makeDecoder((value: unknown) => {
  assert_is_pojo(value);
  const dateString = string(value);
  const timeStampSinceEpoch = Date.parse(dateString);
  if (isNaN(timeStampSinceEpoch)) {
    throw DecodeError.simple(
      err`String ${dateString} is not a valid date string`,
      'Date (ISO 8601 string)',
      value,
    );
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
      throw DecodeError.simple(
        err`The number ${value} is not an integer and cannot be converted to a bigint`,
        'bigint',
        value,
      );
    }
    return BigInt(value);
  }
  if (typeof value === 'string') {
    try {
      return BigInt(value);
    } catch {
      throw DecodeError.simple(
        err`The string ${value} cannot be parsed as a bigint`,
        'bigint',
        value,
      );
    }
  }
  throw DecodeError.simple(
    err`The value ${value} cannot be converted to a bigint`,
    'bigint',
    value,
  );
});

export const regex =
  (pattern: RegExp): Decoder<string> =>
  makeDecoder((value: unknown) => {
    const str = string(value);
    if (!pattern.test(str)) {
      throw DecodeError.simple(
        err`The string ${str} does not match the pattern ${pattern}`,
        `string matching ${pattern}`,
        value,
      );
    }
    return str;
  });

export const unknown: Decoder<unknown> = makeDecoder((value: unknown) => {
  return value;
});
