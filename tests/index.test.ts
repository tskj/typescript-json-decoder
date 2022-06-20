import {
  nullable,
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
  decode,
  intersection,
} from '../src';

test('everything', () => {
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
  always(false);
  type IEmployee = decodeType<typeof employeeDecoder>;

  const employeeDecoder = record({
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
    intersection: intersection(discriminatedUnion, { extraData: string }),
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

  const toDecode: Pojo = {
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
    intersection: { discriminant: 'one', extraData: 'hiya' },
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
  };

  const x: IEmployee = employeeDecoder(toDecode);

  expect(x).toEqual({
    employeeId: 2,
    name: 'asdfasd',
    set: new Set(['7', 7, { data: true }]),
    employees: new Map([
      [1, { employeeId: 1, name: 'lollern' }],
      [3, { employeeId: 3, name: 'other guy', ssn: '4' }],
    ]),
    dict: new Map<string, string | number>([
      ['somestuff', 'lol'],
      ['morestuff', 7],
    ]),
    message: ['something-else', { somestuff: 'a' }],
    discriminatedUnion: { discriminant: 'two', data: '2' },
    intersection: { discriminant: 'one', extraData: 'hiya' },
    address: { city: 'asdf' },
    secondAddrese: { city: 'secondcity', option: undefined },
    employeeIdentifier2: 'asdfasd:2',
    employeeIdentifier: 'asdfasd:2',
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
    renamedfield: ['733', 'dsfadadsa', '', '4'],
    ageAndReputation: [12, 'good'],
    dateOfBirth: new Date('1995-12-14T00:00:00.0Z'),
    month: 11,
    month2: 11,
    isEmployed: true,
    test: new Date('1995-12-14T00:00:00.0Z'),
    girlfriend: null,
    ssn: undefined,
    just: [false, true, false],
  });
});

const nameDecoder = record({ first: string, last: string });

const guestDecoder = record({
  type: decode('Guest'),
  email: string,
  employer: optional({
    id: string,
    corporateId: string,
    companyName: string,
  }),
  reference: union(
    {
      ref: decode('SsoMicrosoft'),
      tid: string,
      oid: string,
    },
    {
      ref: decode('SsoMicrosoftPersonal'),
      oid: string,
    },
  ),
});

const rolesDecoder = array(
  union(
    {
      type: decode('Accountant'),
      employer: {
        id: string,
        corporateId: string,
        companyName: string,
      },
    },
    {
      type: decode('Employer'),
      employer: {
        id: string,
        corporateId: string,
        companyName: string,
      },
    },
    {
      type: decode('Company'),
      corporateId: string,
      companyName: string,
    },
  ),
);

const userDecoder = record({
  type: decode('User'),
  account: {
    id: string,
    name: nameDecoder,
    email: string,
  },
  roles: rolesDecoder,
  intent: optional(union('Accountant', 'Company')),
});

const personDecoder = union(userDecoder, guestDecoder);

const tokenDecoder = record({
  token: string,
  user: personDecoder,
});

const token = {
  token: '<SECRET>',
  user: {
    type: 'User',
    account: {
      id: 'ac000002-0000-0000-0000-000000000001',
      name: {
        first: 'Andreas',
        last: 'Johansson',
      },
      email: 'andreas@gmail.se',
    },
    roles: [
      {
        type: 'Accountant',
        employer: {
          id: 'e1000000-0000-0000-0000-000000000001',
          corporateId: '551191-3113',
          companyName: 'FRA',
        },
      },
    ],
  },
};

const myToken = tokenDecoder(token);

type Address = decodeType<typeof addressDecoder>;
const addressDecoder = record({
  street: optional(string),
});

const address: Address = {};
const address2: Address = {
  street: undefined,
};
const address3: Address = {
  street: '',
};
