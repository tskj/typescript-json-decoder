import { $, _ } from './hkts';

type getT<A, X> = X extends $<A, [infer T]> ? T : never;
type getTypeofDecoderList<t extends Decoder<unknown>[]> = getT<
  Array<Decoder<_>>,
  t
>;

type Decoder<T> = (input: Json) => T;

type encodeHelper<decoder> = [decoder] extends [Decoder<infer T>]
  ? // recur
    [encodeHelper<T>[0]]
  : // objects are special because we use the literal syntax
  // to describe them, which is the point of the library
  [decoder] extends [{}]
  ? [{ [key in keyof decoder]: encodeHelper<decoder[key]>[0] }]
  : // end recursion
    [decoder];

// encodeHelper always needs wrapping and unrwapping
// because direct recursion is not allowed in types
type decoded<decoder> = encodeHelper<decoder>[0];

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

const boolean: Decoder<boolean> = (boolean: Json) => {
  if (typeof boolean !== 'boolean') {
    throw `The value \`${JSON.stringify(
      boolean
    )}\` is not of type \`boolean\`, but is of type \`${typeof boolean}\``;
  }
  return boolean;
};

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

const array = <T>(decoder: Decoder<T>) => (xs: Json): T[] => {
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
    .map(([key, decoder]: any) => {
      // TOOD fails on undefined and null
      if (!value.hasOwnProperty(key)) {
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
  phoneNumbers: array(string),
  isEmployed: boolean,
  ssn: union(string, number),
});

// test

const x: IEmployee = employeeDecoder({
  employeeId: 2,
  name: 'asdfasd',
  address: { city: 'asdf' },
  phoneNumbers: ['733', 'dsfadadsa', '', '4'],
  isEmployed: true,
  ssn: 3,
});
console.log(x);

// TODO
// tuple decoder
// undefined / null decoders
// optionality decoders
// maybe intersection?
// date
