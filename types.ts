import { Json } from './json-types';

export type Decoder<T> = (input: Json) => T;

export type primitive = string | boolean | number | null | undefined;

type eval<decoder> =
  ([decoder] extends [primitive]
    ? [decoder]
    : // recur
    [decoder] extends [Decoder<infer T>]
    ? [eval<T>]
    : // objects are special because we use the literal syntax
    // to describe them, which is the point of the library
    [
      {
        [key in keyof decoder]: eval<decoder[key]>;
      }
    ]
  )[0]

export type decoded<decoder> = eval<decoder>;