import { boolean, date, number, string } from './decoder';
import { array, option, union } from './higher-order-decoders';
import { literal, record, tuple } from './literal-decoders';
import { eval } from './types';

const discriminatedUnion = union(
  { discriminant: literal('one') },
  { discriminant: literal('two'), data: string }
);

const message = union(
  tuple('message', string),
  tuple('something-else', { somestuff: string })
);

export type IEmployee = eval<typeof employeeDecoder>;
export const employeeDecoder = record({
  employeeId: number,
  name: string,
  phoneNumbers: array(string),
  secondAddrese: option({ city: string, option: option(number) }),
  uni: union('uni', { lol: string }),
  ageAndReputation: [number, string],
  likes: array([literal('likt'), number]),
  address: {
    city: string,
  },
  message,
  discriminatedUnion,
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
