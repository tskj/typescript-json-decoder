/**
 * Data transformation example.
 *
 * Demonstrates .map(), .chain(), field(), and fields() for reshaping
 * API data into the exact structure your app needs.
 */
import {
  decodeType,
  record,
  field,
  fields,
  at,
  string,
  number,
  array,
  tuple,
  date,
  bigint,
} from 'typescript-json-decoder';

// Rename and restructure fields with .map()
type User = decodeType<typeof userDecoder>;
const userDecoder = record({
  // Extract a single field from a nested object
  city: field('address', { city: string }).map((a) => a.city),

  // Combine multiple source fields into one
  displayName: fields({ first: string, last: string }).map(
    ({ first, last }) => `${first} ${last}`,
  ),

  // Transform a decoded value
  ageInMonths: field('age', number).map((age) => age * 12),
});

console.log(
  userDecoder({
    address: { city: 'Oslo' },
    first: 'Alice',
    last: 'Smith',
    age: 30,
  }),
);
// { city: 'Oslo', displayName: 'Alice Smith', ageInMonths: 360 }

// Chain decoders to pipe one into another
const yearDecoder = string.chain(date).map((d) => d.getFullYear());
console.log(yearDecoder('2024-06-15'));
// 2024

// Drill into deeply nested structures with at()
const deepValue = at('response', 'data', 'user', 'name').chain(string);
console.log(
  deepValue({
    response: { data: { user: { name: 'Bob' } } },
  }),
);
// 'Bob'

// Parse a JSON string field as bigint via .chain()
const balanceDecoder = record({
  account: string,
  balance: field('balance', string).chain(bigint),
});
console.log(
  balanceDecoder({
    account: 'savings',
    balance: '9007199254740993',
  }),
);
// { account: 'savings', balance: 9007199254740993n }
