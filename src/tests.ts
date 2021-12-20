import { nullable } from './higher-order-decoders';
import {
  boolean,
  date,
  number,
  string,
  array,
  dict,
  map,
  optional,
  set,
  union,
  field,
  fields,
  literal,
  record,
  tuple,
  decodeType,
  Pojo,
  Decoder,
} from './index';

const discriminatedUnion = union(
  { discriminant: literal('one') },
  { discriminant: literal('two'), data: string },
);

const message = union(
  tuple('message', string),
  tuple('something-else', { somestuff: string }),
);

// test impl
const always =
  <T>(x: T): Decoder<T> =>
  (json: Pojo) =>
    x;

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
  girlfriend: nullable(string),
  test: fields(
    { girlfriend: nullable(string), dateOfBirth: date },
    ({ girlfriend, dateOfBirth }) => girlfriend ?? dateOfBirth,
  ),
  just: array(union(boolean, always(false))),
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
  girlfriend: null,
  just: ['blah', true, false],
});
const fooDecoder = record({
  bar: optional(string),
  baz: string,
});
type Foo = decodeType<typeof fooDecoder>;
const myFoo: Foo = fooDecoder({
  baz: 'foobar',
});
console.log(x, myFoo);
