/**
 * Decoder() class API example.
 *
 * Demonstrates using Decoder() to merge type and value into a single name,
 * including schema-aware .create() for constructing values with defaults.
 */
import {
  Decoder,
  string,
  number,
  integer,
  array,
  always,
  optional,
} from 'typescript-json-decoder';

// One declaration — User is both a type and a decoder
class User extends Decoder({
  name: string.default('Anonymous'),
  age: integer,
  role: always('member'),
  email: optional(string).default(undefined),
}) {}

// As a type — plain objects are assignable (structural typing)
const alice: User = { name: 'Alice', age: 30, role: 'member' };

// As a decoder
const decoded: User = User.decode({ name: 'Bob', age: 25, role: 'member' });

// Safe decoding
const result = User.safeDecode({ name: 'Charlie', age: 'not a number' });
if (!result.ok) {
  console.log('Failed:', result.error.message);
}

// Create with defaults — only age is required (no default)
const user: User = User.create({ age: 28 });
console.log(user);
// { name: 'Anonymous', age: 28, role: 'member' }

// Create with overrides
const admin: User = User.create({ age: 35, name: 'Admin', email: 'admin@example.com' });
console.log(admin);
// { name: 'Admin', age: 35, role: 'member', email: 'admin@example.com' }
