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
    throw `The value "${s}" is not of type \`string\`, but is of type \`${typeof s}\``;
  }
  return s;
};

const recordDecoder = <schema extends {}>(
  s: schema
): Decoder<encode<schema>> => (value: Json) => {
  return Object.entries(s)
    .map(([key, decoder]: any) => {
      if (!value.hasOwnProperty(key)) {
        throw `Cannot find key "${key}" in the following object: ${Object.entries(
          value
        )}`;
      }

      if (typeof decoder !== 'function') {
        // This let's us define records in records without
        // manually calling recordDecoder(.)
        decoder = recordDecoder(decoder);
      }

      const jsonvalue = value[key];
      return [key, decoder(jsonvalue)];
    })
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
};

type IEmployee = encode<typeof employeeDecoder>;
const employeeDecoder = recordDecoder({
  employeeId: stringDecoder,
  name: stringDecoder,
  address: { city: stringDecoder },
});

const x: IEmployee = employeeDecoder({
  employeeId: 'heidur',
  name: 'asdfasd',
  address: { city: 'asdf' },
});
console.log(x);
