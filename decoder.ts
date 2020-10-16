import { $, _ } from './hkts';

type getT<A, X> = X extends $<A, [infer T]> ? T : never;
type getTypeofDecoderList<t extends Decoder<unknown>[]> = getT<
  Array<Decoder<_>>,
  t
>;

type Decoder<T> = (input: Json) => T;

type primitive = string | boolean | number | null | undefined;
// TOOD better indirection
type eval<decoder> = [decoder] extends [primitive]
  ? [decoder]
  : // recur
  [decoder] extends [Decoder<infer T>]
  ? [eval<T>[0]]
  : // objects are special because we use the literal syntax
    // to describe them, which is the point of the library
    [
      {
        [key in keyof decoder]: eval<decoder[key]>[0];
      }
    ];

// eval always needs wrapping and unrwapping
// because direct recursion is not allowed in types
type decoded<decoder> = eval<decoder>[0];

type JsonPrimitive = string | boolean | number | null | undefined;
type JsonObject = { [key: string]: Json };
type JsonArray = Json[];
type Json = JsonPrimitive | JsonObject | JsonArray;

type NativeJsonDecoder =
  | string
  | { [key: string]: NativeJsonDecoder | Decoder<unknown> }
  | [
      NativeJsonDecoder | Decoder<unknown>,
      NativeJsonDecoder | Decoder<unknown>
    ];
const isNativeJsonDecoder = (
  decoder: unknown
): decoder is NativeJsonDecoder => {
  return (
    typeof decoder === 'string' ||
    (typeof decoder === 'object' &&
      decoder !== null &&
      Object.values(decoder).every(
        (x) => isNativeJsonDecoder(x) || typeof x === 'function'
      )) ||
    (Array.isArray(decoder) &&
      decoder.length === 2 &&
      decoder.every((x) => isNativeJsonDecoder(x) || typeof x === 'function'))
  );
};
const jsonDecoder = <json extends NativeJsonDecoder>(
  decoder: json
): Decoder<json> => {
  if (typeof decoder === 'string') {
    return literal(decoder);
  }
  if (Array.isArray(decoder)) {
    return tuple(decoder[0] as any, decoder[1] as any) as Decoder<json>;
  }
  if (typeof decoder === 'object') {
    return record(decoder as any);
  }
  throw `shouldn't happen`;
};

const string: Decoder<string> = (s: Json) => {
  if (typeof s !== 'string') {
    throw `The value \`${JSON.stringify(
      s
    )}\` is not of type \`string\`, but is of type \`${typeof s}\``;
  }
  return s;
};

const number: Decoder<number> = (n: Json) => {
  if (typeof n !== 'number') {
    throw `The value \`${JSON.stringify(
      n
    )}\` is not of type \`number\`, but is of type \`${typeof n}\``;
  }
  return n;
};

const boolean: Decoder<boolean> = (b: Json) => {
  if (typeof b !== 'boolean') {
    throw `The value \`${JSON.stringify(
      b
    )}\` is not of type \`boolean\`, but is of type \`${typeof b}\``;
  }
  return b;
};

const undef: Decoder<undefined> = ((u: Json) => {
  if (typeof u !== 'undefined') {
    throw `The value \`${JSON.stringify(
      u
    )}\` is not of type \`undefined\`, but is of type \`${typeof u}\``;
  }
  return u;
}) as any;

const nil: Decoder<null> = ((u: Json) => {
  if (u !== null) {
    throw `The value \`${JSON.stringify(
      u
    )}\` is not of type \`null\`, but is of type \`${typeof u}\``;
  }
  return u as null;
}) as any;

const union = <decoders extends Decoder<unknown>[]>(...decoders: decoders) => (
  value: Json
): getTypeofDecoderList<decoders> => {
  if (decoders.length === 0) {
    throw `Could not match any of the union cases`;
  }
  const [decoder, ...rest] = decoders;
  try {
    return decoder(value) as any;
  } catch (messageFromThisDecoder) {
    try {
      return union(...rest)(value) as any;
    } catch (message) {
      throw `${messageFromThisDecoder}\n${message}`;
    }
  }
};

const optionDecoder: unique symbol = Symbol('optional-decoder');
const option = <T extends unknown>(decoder: Decoder<T>) => {
  let _optionDecoder = union(undef, decoder);
  (_optionDecoder as any)[optionDecoder] = true;
  return _optionDecoder;
};

function array<T extends unknown>(decoder: Decoder<T>): Decoder<T[]>;
function array<T extends NativeJsonDecoder>(decoder: T): Decoder<T[]>;
function array<T extends unknown>(decoder: Decoder<T> | NativeJsonDecoder) {
  if (isNativeJsonDecoder(decoder)) {
    return array(jsonDecoder(decoder));
  }
  return (xs: Json): T[] => {
    const arrayToString = (arr: any) => `${JSON.stringify(arr)}`;
    if (!Array.isArray(xs)) {
      throw `The value \`${arrayToString(
        xs
      )}\` is not of type \`array\`, but is of type \`${typeof xs}\``;
    }
    let index = 0;
    try {
      return xs.map((x, i) => {
        index = i;
        return decoder(x);
      });
    } catch (message) {
      throw (
        message +
        `\nwhen trying to decode the array (at index ${index}) \`${arrayToString(
          xs
        )}\``
      );
    }
  };
}

const record = <
  schema extends { [key: string]: NativeJsonDecoder | Decoder<unknown> }
>(
  s: schema
): Decoder<decoded<schema>> => (value: Json) => {
  const objectToString = (obj: any) =>
    Object.keys(obj).length === 0 ? `{}` : `${JSON.stringify(obj)}`;
  return Object.entries(s)
    .map(([key, decoder]: [string, any]) => {
      if (Array.isArray(value) || typeof value !== 'object' || value === null) {
        throw `Value \`${objectToString(
          value
        )}\` is not of type \`object\` but rather \`${typeof value}\``;
      }

      if (!value.hasOwnProperty(key)) {
        if (decoder[optionDecoder]) {
          return [key, undefined];
        }
        throw `Cannot find key \`${key}\` in \`${objectToString(value)}\``;
      }

      if (isNativeJsonDecoder(decoder)) {
        decoder = jsonDecoder(decoder);
      }

      try {
        const jsonvalue = value[key];
        return [key, decoder(jsonvalue)];
      } catch (message) {
        throw (
          message +
          `\nwhen trying to decode the key \`${key}\` in \`${objectToString(
            value
          )}\``
        );
      }
    })
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};

function tuple<
  jsonA extends NativeJsonDecoder,
  jsonB extends NativeJsonDecoder
>(deocderA: jsonA, decoderB: jsonB): Decoder<[jsonA, jsonB]>;
function tuple<A, jsonB extends NativeJsonDecoder>(
  deocderA: Decoder<A>,
  decoderB: jsonB
): Decoder<[A, jsonB]>;
function tuple<jsonA extends NativeJsonDecoder, B>(
  deocderA: jsonA,
  decoderB: Decoder<B>
): Decoder<[jsonA, B]>;
function tuple<A, B>(
  deocderA: Decoder<A>,
  decoderB: Decoder<B>
): Decoder<[A, B]>;
function tuple(
  decoderA: Decoder<unknown> | NativeJsonDecoder,
  decoderB: Decoder<unknown> | NativeJsonDecoder
) {
  if (isNativeJsonDecoder(decoderA) && isNativeJsonDecoder(decoderB)) {
    return tuple(jsonDecoder(decoderA), jsonDecoder(decoderB));
  }
  if (isNativeJsonDecoder(decoderA) && !isNativeJsonDecoder(decoderB)) {
    return tuple(jsonDecoder(decoderA), decoderB);
  }
  if (!isNativeJsonDecoder(decoderA) && isNativeJsonDecoder(decoderB)) {
    return tuple(decoderA, jsonDecoder(decoderB));
  }
  if (!isNativeJsonDecoder(decoderA) && !isNativeJsonDecoder(decoderB))
    return (value: Json) => {
      if (!Array.isArray(value)) {
        throw `The value \`${JSON.stringify(
          value
        )}\` is not a list and can therefore not be parsed as a tuple`;
      }
      if (value.length !== 2) {
        throw `The array \`${JSON.stringify(
          value
        )}\` is not the proper length for a tuple`;
      }
      const [a, b] = value;
      return [decoderA(a), decoderB(b)];
    };
}

const literal = <p extends primitive>(literal: p): Decoder<p> => (
  value: Json
) => {
  if (literal !== value) {
    throw `The value \`${JSON.stringify(
      value
    )}\` is not the literal \`${JSON.stringify(literal)}\``;
  }
  return literal;
};

const discriminatedUnion = union(
  record({ discriminant: literal('one') }),
  record({ discriminant: literal('two'), data: string })
);

const message = union(
  tuple('message', string),
  tuple('something-else', { somestuff: literal('a') })
);

type IEmployee = decoded<typeof employeeDecoder>;
const employeeDecoder = record({
  employeeId: number,
  name: string,
  ageAndReputation: [number, string],
  likes: array([literal('likt'), number]),
  address: {
    city: string,
  },
  message,
  discriminatedUnion,
  secondAddrese: union(record({ city: string }), undef),
  phoneNumbers: array(string),
  isEmployed: boolean,
  ssn: option(string),
});

// test

const x: IEmployee = employeeDecoder({
  employeeId: 2,
  name: 'asdfasd',
  message: ['something-else', { somestuff: 'a' }],
  discriminatedUnion: { discriminant: 'two', data: '2' },
  address: { city: 'asdf' },
  secondAddrese: undefined,
  likes: [
    ['likt', 3],
    ['likt', 0],
  ],
  phoneNumbers: ['733', 'dsfadadsa', '', '4'],
  ageAndReputation: [12, 'good'],
  isEmployed: true,
});
console.log(x);

// TODO

// maybe variadic tuple decoder
// maybe question mark on optional key

// accept records as decoders in all the standard decoders
// use tagged templates to abstract out the stringifying
// clean up eval
// tidy up file structure
// date decoder
