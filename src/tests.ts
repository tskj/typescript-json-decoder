import { boolean, date, number, string } from './primitive-decoders';
import {
  array,
  dict,
  map,
  optional,
  set,
  union,
} from './higher-order-decoders';
import { field, fields, literal, record, tuple } from './literal-decoders';
import { decodeType } from './types';

const discriminatedUnion = union(
  { discriminant: literal('one') },
  { discriminant: literal('two'), data: string },
);

const message = union(
  tuple('message', string),
  tuple('something-else', { somestuff: string }),
);

export type IEmployee = decodeType<typeof employeeDecoder>;

export const employeeDecoder = record({
  renamedfield: field('phoneNumbers', array(string)),
  month2: fields({ dateOfBirth: date }, ({ dateOfBirth }) =>
    dateOfBirth.getMonth(),
  ),
  maybessn: fields({ ssn: optional(string) }, ({ ssn }) => ssn),
  employeeIdentifier2: fields(
    { name: string, employeeId: optional(number) },
    ({ name, employeeId }) => `${name}:${employeeId || 0}`,
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
      ssn: optional(string),
    },
    (x) => x.employeeId,
  ),
  dict: dict(union(string, number)),
  phoneNumbers: array(string),
  address: {
    city: string,
  },
  secondAddrese: optional({ city: string, option: optional(number) }),
  ageAndReputation: [number, string],
  discriminatedUnion,
  message,
  uni: union('uni', { lol: string }),
  likes: array([literal('likt'), number]),
  likes2: array(tuple('likt', number)),
  isEmployed: boolean,
  dateOfBirth: date,
  ssn: optional(string),
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

// Goals:
// maybe variadic tuple decoder
// maybe question mark on optional key

// Improvements:
// Use tagged templates to abstract out the stringifying
// Returning nestend objects instead of strings for error reporting?
// Move object test up in record decoder to give better error messages
// Use my object-map implementation
// also less any and more 'correct' implementations in general?
// What about decorators for marking as fieldDecoder?
// Maybe also type-safe tag function after TypeScript 4.2

// Additions:
// Constant decoder (always returns same regardless of input)
// Default decoder for when stuff is null or undefined
// Integer decoder, and other validation of data
// Regex decoder which takes a regex and returns string
// Fail for explicitly disallowing keys
// Unknown for passing through anything and leaving type unknown

// Set up tests
// Docs
// Release 1.0
