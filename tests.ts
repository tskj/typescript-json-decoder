import { boolean, date, number, string } from './decoder';
import { array, option, union } from './higher-order-decoders';
import { literal, tuple } from './literal-decoders';
import { decoder, eval } from './types';

const discriminatedUnion = union(
  { discriminant: literal('one') },
  { discriminant: literal('two'), data: string }
);

const message = union(
  tuple('message', string),
  tuple('something-else', { somestuff: string })
);

export type IEmployee = eval<typeof employeeDecoder>;
export const employeeDecoder = decoder({
  employeeId: number,
  message,
  phoneNumbers: array(string),
  discriminatedUnion,
  secondAddrese: option({ city: string, option: option(number) }),
  name: string,
  ageAndReputation: [number, string],
  address: {
    city: string,
  },
  uni: union('uni', { lol: string }),
  likes: array([literal('likt'), number]),
  isEmployed: boolean,
  dateOfBirth: date,
  ssn: option(string),
});

const x: IEmployee = employeeDecoder({
  employeeId: 2,
  name: 'asdfasd',
  message: ['something-else', { somestuff: 'a' }],
  discriminatedUnion: { discriminant: 'two', data: '2' },
  address: { city: 'asdf' },
  secondAddrese: { city: 'secondcity' },
  uni: 'uni',
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

// Goals
// maybe variadic tuple decoder
// maybe question mark on optional key

// Use tagged templates to abstract out the stringifying
// Returning nestend objects instead of strings?
// Move object test up in record decoder to give better error messages
// Use my object-map implementation
// also less any and more 'correct' implementations in general

// Two map decoders, both from a json map
// and from a list of tuples
// Maybe even one from a list of objects and key functions

// Set up tests
// Readme with some examples
