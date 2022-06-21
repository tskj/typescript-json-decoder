import { assert_is_pojo } from './pojo';
import { DecoderFunction } from './types';

export const string: DecoderFunction<string> = (s: unknown) => {
  assert_is_pojo(s);
  if (typeof s !== 'string') {
    throw `The value \`${JSON.stringify(
      s,
    )}\` is not of type \`string\`, but is of type \`${typeof s}\``;
  }
  return s;
};

export const number: DecoderFunction<number> = (n: unknown) => {
  assert_is_pojo(n);
  if (typeof n !== 'number') {
    throw `The value \`${JSON.stringify(
      n,
    )}\` is not of type \`number\`, but is of type \`${typeof n}\``;
  }
  return n;
};

export const boolean: DecoderFunction<boolean> = (b: unknown) => {
  assert_is_pojo(b);
  if (typeof b !== 'boolean') {
    throw `The value \`${JSON.stringify(
      b,
    )}\` is not of type \`boolean\`, but is of type \`${typeof b}\``;
  }
  return b;
};

export const undef: DecoderFunction<undefined> = ((u: unknown) => {
  assert_is_pojo(u);
  if (typeof u !== 'undefined') {
    throw `The value \`${JSON.stringify(
      u,
    )}\` is not of type \`undefined\`, but is of type \`${typeof u}\``;
  }
  return u;
}) as any;

export const nil: DecoderFunction<null> = ((u: unknown) => {
  assert_is_pojo(u);
  if (u !== null) {
    throw `The value \`${JSON.stringify(
      u,
    )}\` is not of type \`null\`, but is of type \`${typeof u}\``;
  }
  return u as null;
}) as any;

export const date: DecoderFunction<Date> = (value: unknown) => {
  assert_is_pojo(value);
  const dateString = string(value);
  const timeStampSinceEpoch = Date.parse(dateString);
  if (isNaN(timeStampSinceEpoch)) {
    throw `String \`${dateString}\` is not a valid date string`;
  }
  return new Date(timeStampSinceEpoch);
};
