/**
 * Basic API decoding example.
 *
 * Demonstrates how to define a decoder for a typical REST API response
 * and use it with fetch.
 */
import {
  decodeType,
  record,
  string,
  number,
  boolean,
  array,
  optional,
  union,
  date,
} from 'typescript-json-decoder';

// Define a decoder — it reads like a regular type definition
type User = decodeType<typeof userDecoder>;
const userDecoder = record({
  id: number,
  username: string,
  email: string,
  isBanned: boolean,
  phoneNumbers: array(string),
  ssn: optional(string),
  joinedAt: date,
});

// Decode a single user
const json = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  isBanned: false,
  phoneNumbers: ['+1-555-0100'],
  joinedAt: '2024-01-15T10:30:00Z',
};

const user: User = userDecoder(json);
console.log(user);
// { id: 1, username: 'alice', email: 'alice@example.com', ... joinedAt: Date }

// Use directly in a fetch chain — decoders are just functions
// fetch('/api/users/1').then(r => r.json()).then(userDecoder);

// Decode an array of users
// fetch('/api/users').then(r => r.json()).then(array(userDecoder));
