type Decoder<T> = (input: Json) => T;

type primitive = string | number;
type encodeH<decoder> = [decoder] extends [Decoder<infer T>]
  ? [encodeH<T>[0]]
  : [decoder] extends [primitive]
  ? [decoder]
  : [{ [key in keyof decoder]: encodeH<decoder[key]>[0] }];

type encode<decoder> = encodeH<decoder>[0];

type a = encode<{ x: () => string; foo: () => { bar: () => string } }>;

type JsonPrimitive = string | boolean | number | null | undefined;
type JsonObject = { [key: string]: Json };
type JsonArray = Json[];
type Json = JsonPrimitive | JsonObject | JsonArray;

const stringDecoder: Decoder<string> = (s: Json) => {
  if (typeof s !== 'string') {
    throw `The value \`${s}\` is not of type \`string\`, but is of type \`${typeof s}\``;
  }
  return s;
};

const numberDecoder: Decoder<number> = (n: Json) => {
  if (typeof n !== 'number') {
    throw `The value \`${n}\` is not of type \`number\`, but is of type \`${typeof n}\``;
  }
  return n;
};

const booleanDecoder: Decoder<boolean> = (boolean: Json) => {
  if (typeof boolean !== 'boolean') {
    throw `The value \`${boolean}\` is not of type \`boolean\`, but is of type \`${typeof boolean}\``;
  }
  return boolean;
};

const arrayDecoder = <T>(decoder: Decoder<T>) => (xs: Json): T[] => {
  if (!Array.isArray(xs)) {
    throw `The value \`${xs}\` is not of type \`array\`, but is of type \`${typeof xs}\``;
  }
  // TOOD pretty print array
  const arrayToString = (arr: any) => `${JSON.stringify(arr)}`;
  try {
    return xs.map(decoder);
  } catch (message) {
    throw (
      message + `\nwhen trying to decode the array \`${arrayToString(xs)}\``
    );
  }
};

const recordDecoder = <schema extends {}>(
  s: schema
): Decoder<encode<schema>> => (value: Json) => {
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
        // manually calling recordDecoder(.)
        decoder = recordDecoder(decoder);
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

type IEmployee = encode<typeof employeeDecoder>;
const employeeDecoder = recordDecoder({
  employeeId: numberDecoder,
  name: stringDecoder,
  address: { city: stringDecoder },
  phoneNumbers: arrayDecoder(stringDecoder),
});

const x: IEmployee = employeeDecoder({
  employeeId: 2,
  name: 'asdfasd',
  address: { city: 'asdf' },
  phoneNumbers: ['733', 5, '4'],
});
console.log(x);
