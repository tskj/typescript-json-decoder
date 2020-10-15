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

// end recursion

// encodeHelper always needs wrapping and unrwapping
// because direct recursion is not allowed in types
type decoded<decoder> = eval<decoder>[0];

type JsonPrimitive = string | boolean | number | null | undefined;
type JsonObject = { [key: string]: Json };
type JsonArray = Json[];
type Json = JsonPrimitive | JsonObject | JsonArray;

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

const array = <T extends unknown>(decoder: Decoder<T>) => (xs: Json): T[] => {
  // TOOD pretty print array
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

const record = <schema extends {}>(s: schema): Decoder<decoded<schema>> => (
  value: Json
) => {
  // TOOD fix pretty print object
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

      if (typeof decoder !== 'function') {
        // This let's us define records in records without
        // manually calling recordDecoder(.) on them
        decoder = record(decoder);
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

type IEmployee = decoded<typeof employeeDecoder>;
const employeeDecoder = record({
  employeeId: number,
  name: string,
  address: {
    city: string,
  },
  secondAddrese: union(record({ city: string }), undef),
  phoneNumbers: array(string),
  isEmployed: boolean,
  ssn: option(string),
});

// test

const x: IEmployee = employeeDecoder({
  employeeId: 2,
  name: 'asdfasd',
  address: { city: 'asdf' },
  secondAddrese: undefined,
  phoneNumbers: ['733', 'dsfadadsa', '', '4'],
  isEmployed: true,
});
console.log(x);

// TODO
// tuple decoder
// maybe intersection?
// date
