import { Json } from './json-types';
import { decoded, Decoder, primitive } from './types';

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

const union = <decoders extends (Decoder<unknown> | NativeJsonDecoder)[]>(
  ...decoders: decoders
) => (value: Json): getTypeofDecoderList<decoders> => {
  if (decoders.length === 0) {
    throw `Could not match any of the union cases`;
  }
  const [decoder, ...rest] = decoders;
  if (isNativeJsonDecoder(decoder)) {
    // TODO can be shorter
    return union(jsonDecoder(decoder), ...rest)(value) as any;
  }
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
function option<T extends NativeJsonDecoder>(
  decoder: T
): Decoder<T | undefined>;
function option<T extends unknown>(decoder: Decoder<T>): Decoder<T | undefined>;
function option<T extends unknown>(
  decoder: Decoder<T>
): Decoder<T | undefined> {
  if (isNativeJsonDecoder(decoder)) {
    return option(jsonDecoder(decoder)) as any;
  }
  let _optionDecoder = union(undef, decoder);
  (_optionDecoder as any)[optionDecoder] = true;
  return _optionDecoder;
}

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

const date = (value: Json) => {
  const dateString = string(value);
  const timeStampSinceEpoch = Date.parse(dateString);
  if (isNaN(timeStampSinceEpoch)) {
    throw `String \`${dateString}\` is not a valid date string`;
  }
  return new Date(timeStampSinceEpoch);
};

const discriminatedUnion = union(
  { discriminant: literal('one') },
  { discriminant: literal('two'), data: string }
);

const message = union(
  tuple('message', string),
  tuple('something-else', { somestuff: string })
);

type IEmployee = decoded<typeof employeeDecoder>;
const employeeDecoder = record({
  employeeId: number,
  name: string,
  secondAddrese: option({ city: string }),
  uni: union(string, { lol: string }),
  ageAndReputation: [number, string],
  likes: array([literal('likt'), number]),
  address: {
    city: string,
  },
  message,
  discriminatedUnion,
  phoneNumbers: array(string),
  isEmployed: boolean,
  dateOfBirth: date,
  ssn: option(string),
});

// test

const x: IEmployee = employeeDecoder({
  employeeId: 2,
  name: 'asdfasd',
  message: ['something-else', { somestuff: 'a' }],
  discriminatedUnion: { discriminant: 'two', data: '2' },
  address: { city: 'asdf' },
  secondAddrese: { city: 'secondcity' },
  uni: 'test',
  likes: [
    ['likt', 3],
    ['likt', 0],
  ],
  phoneNumbers: ['733', 'dsfadadsa', '', '4'],
  ageAndReputation: [12, 'good'],
  dateOfBirth: '1995-12-14T00:00:00.0Z',
  isEmployed: true,
});
console.log(x);

// TODO

// maybe variadic tuple decoder
// maybe question mark on optional key

// use tagged templates to abstract out the stringifying
// clean up eval
// tidy up file structure

// caveats around inference of literals
// Sometimes using tuple literal decoder results in a string being inferred
// instead of the literal. The solution is either to use tuple() function call
// or wrap the literal in literal().
// Other times a too general type is also inferred, such as in records some times.
// Here the only solution is a literal() call, but this is only necessary for proper
// type inference - the inferred type is still a super type.
