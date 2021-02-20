import { boolean, date, number, string } from './primitive-decoders';
import { array, dict, map, option, set, union } from './higher-order-decoders';
import { field, fields, literal, tuple } from './literal-decoders';
import { decoder, decode } from './types';

const discriminatedUnion = union(
  { discriminant: literal('one') },
  { discriminant: literal('two'), data: string },
);

const message = union(
  tuple('message', string),
  tuple('something-else', { somestuff: string }),
);

export type IEmployee = decode<typeof employeeDecoder>;

export const employeeDecoder = decoder({
  renamedfield: field('phoneNumbers', array(string)),
  month2: fields({ dateOfBirth: date }, ({ dateOfBirth }) =>
    dateOfBirth.getMonth(),
  ),
  maybessn: fields({ ssn: option(string) }, ({ ssn }) => ssn),
  employeeIdentifier2: fields(
    { name: string, employeeId: number },
    ({ name, employeeId }) => `${name}:${employeeId}`,
  ),
  month: field('dateOfBirth', (x) => date(x).getMonth()),
  employeeIdentifier: fields(
    {
      name: string,
      employeeId: number,
    },
    ({ name, employeeId }) => `${name}:${employeeId}`,
  ),
  employeeId: number,
  name: string,
  set: set(union(string, number, { data: boolean })),
  employees: map(
    {
      employeeId: number,
      name: string,
      ssn: option(string),
    },
    (x) => x.employeeId,
  ),
  dict: dict(union(string, number)),
  phoneNumbers: array(string),
  address: {
    city: string,
  },
  secondAddrese: option({ city: string, option: option(number) }),
  ageAndReputation: [number, string],
  discriminatedUnion,
  message,
  uni: union('uni', { lol: string }),
  likes: array([literal('likt'), number]),
  likes2: array(tuple('likt', number)),
  isEmployed: boolean,
  dateOfBirth: date,
  ssn: option(string),
});

const x: IEmployee = employeeDecoder({
  employeeId: 2,
  name: 'asdfasd',
  set: ['7', 7, { data: true }],
  employees: [
    { employeeId: 1, name: 'lollern' },
    { employeeId: 3, name: 'other guy', ssn: '4' },
  ],
  dict: { somestuff: 'lol', morestuff: 7 },
  message: ['something-else', { somestuff: 'a' }],
  discriminatedUnion: { discriminant: 'two', data: '2' },
  address: { city: 'asdf' },
  secondAddrese: { city: 'secondcity' },
  uni: 'uni',
  likes: [
    ['likt', 3],
    ['likt', 0],
  ],
  likes2: [
    ['likt', 1],
    ['likt', 2],
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
// Returning nestend objects instead of strings for error reporting?
// Move object test up in record decoder to give better error messages
// Use my object-map implementation
// also less any and more 'correct' implementations in general
// What about decorators for marking as fieldDecoder?
// Allow arbitrarily many transformation / decoder functions in field (composed together)
// OR decide on going for only `fields`

// Constant decoder (always returns same regardless of input)
// Default decoder for when stuff is null or undefined
// Integer decoder, and other validation of data
// Regex decoder which takes a regex and returns string
// Fail for explicitly disallowing keys
// Unknown for passing through anything and leaving type unknown

// Set up tests

// Could be useful to catch errors in record decoder in combination
// with combinefields, for better error reporting
// or just with field in general.
// Fix option combined with field decoder, doesn't quite work.
