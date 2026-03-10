# Migrating from v1 to v2

## `decode()` renamed to `decoder()`

The function that wraps literal forms and plain functions into decoders has been renamed from `decode` to `decoder`.

```diff
-import { decode } from 'typescript-json-decoder';
+import { decoder } from 'typescript-json-decoder';

-const myDecoder = decode([string, number]);
+const myDecoder = decoder([string, number]);
```

## `Decoder<T>` is now a callable object

In v1, `Decoder<T>` was a union type: `JsonLiteralForm | ((input: unknown) => T)`. A plain function was a valid `Decoder<T>`.

In v2, `Decoder<T>` is an interface — a callable object with `.map()` and `.safeDecode()` methods. All library combinators return `Decoder<T>`.

```typescript
// v2: Decoder<T> has .map() and .safeDecode()
const user = record({ name: string, age: number });
const name = user.map(u => u.name);
const result = name.safeDecode('bad input'); // { ok: false, error: DecodeError }
```

**If you annotate custom decoders as `Decoder<T>`**, wrap them with `decoder()`:

```diff
-const myDecoder: Decoder<string> = (input: unknown) => { ... };
+const myDecoder: Decoder<string> = decoder((input: unknown) => { ... });
```

Plain functions still work as arguments to combinators — they just can't be annotated as `Decoder<T>` directly.

## New type: `DecoderInput<T>`

The old `Decoder<T>` union (literal forms + functions) is now called `DecoderInput<T>`. This is what combinators accept as arguments. You only need this if you write your own higher-order decoders:

```typescript
import { DecoderInput, Decoder, decoder } from 'typescript-json-decoder';

function myArrayDecoder<D extends DecoderInput<unknown>>(dec: D): Decoder<...> {
  const d = decoder(dec);
  // ...
}
```

## `DecoderFunction<T>` still exists

The plain function type `(input: unknown) => T` is still available as `DecoderFunction<T>`. All `Decoder<T>` values are assignable to `DecoderFunction<T>`.

## `transform` removed

`transform` no longer exists. Use `.map()` instead:

```diff
-import { transform, tuple, number } from 'typescript-json-decoder';
-const point = transform(tuple(number, number), ([x, y]) => ({ x, y }));
+import { tuple, number } from 'typescript-json-decoder';
+const point = tuple(number, number).map(([x, y]) => ({ x, y }));
```

## Continuations removed from all combinators

`array`, `literal`, `optional`, `nullable`, `set`, `objectOf`, `dict`, and `field` no longer accept a continuation argument. Use `.map()`:

```diff
-const sum = array(number, xs => xs.reduce((a, b) => a + b, 0));
+const sum = array(number).map(xs => xs.reduce((a, b) => a + b, 0));

-const role = literal('admin', x => x.toUpperCase());
+const role = literal('admin').map(x => x.toUpperCase());

-const thing = field('nested', { data: string }, x => x.data);
+const thing = field('nested', { data: string }).map(x => x.data);
```

Note: with `.map()`, `optional` and `nullable` pass the full union type (including `undefined`/`null`) to the mapping function, unlike the old continuations which skipped the transform for missing values:

```diff
-const upper = optional(string, s => s.toUpperCase()); // s was always string
+const upper = optional(string).map(s => s?.toUpperCase()); // s is string | undefined
```

## `fields` no longer takes a continuation

`fields` now returns a `Decoder` of the decoded schema. Chain `.map()` for the transform:

```diff
-fields({ firstName: string, lastName: string },
-  ({ firstName, lastName }) => `${firstName} ${lastName}`)
+fields({ firstName: string, lastName: string })
+  .map(({ firstName, lastName }) => `${firstName} ${lastName}`)
```

## New: `.map()` on all decoders

Every decoder now supports `.map()` for transforming decoded values. This is the universal replacement for `transform` and all continuations:

```typescript
const length = string.map(s => s.length);       // Decoder<number>
const isLong = length.map(n => n > 100);         // Decoder<boolean>
const getName = record({ name: string, age: number }).map(u => u.name);
```

## New: `.safeDecode()` on all decoders

Every decoder has `.safeDecode()` which returns a result instead of throwing:

```typescript
const result = string.safeDecode(input);
if (result.ok) {
  console.log(result.value); // string
} else {
  console.log(result.error); // DecodeError
}
```

The standalone `safeDecode(decoder, value)` function still works too.

## Structured errors with `DecodeError`

In v1, decoders threw plain strings on failure. In v2, decoders throw `DecodeError` (extends `Error`) with structured information:

```typescript
import { DecodeError, safeDecode, record, string, number } from 'typescript-json-decoder';

const result = safeDecode(record({ name: string, age: number }), { name: 'Alice', age: '30' });
if (!result.ok) {
  result.error.message;  // 'The value `30` is not of type `number`, but is of type `string`'
  result.error.path;     // ['age']
  result.error.expected; // 'number'
  result.error.received; // '30'
}
```

- `message` — the leaf error description
- `path` — array of keys/indices tracing the location (built automatically through record, array, tuple, etc.)
- `expected` — the expected type
- `received` — the actual value
- `children` — for union/intersection failures, the error from each branch
- `getPathString()` — path formatted as `/users/1/age`
- `toString()` — formatted message with path prefix, e.g. `at /age: The value ...`

## New: `.chain()` on all decoders

`.chain()` pipes the output of one decoder into another decoder (including literal forms):

```typescript
const balance = field('balance', string).chain(bigint);
const payload = field('data', unknown).chain({ name: string, age: number });
const yearFromString = string.chain(date).map(d => d.getFullYear());
```

While `.map()` takes a plain function `T → U`, `.chain()` accepts any `DecoderInput` — record literals, tuple literals, or other decoders.

## `field(key)` now defaults to `unknown`

The second argument to `field` is now optional and defaults to `unknown`:

```typescript
field('name')          // Decoder<unknown> — extracts the key, passes value through
field('name', string)  // Decoder<string> — extracts and decodes
```

## New: `at()` for drilling into nested structures

`at` drills into deeply nested objects by key path. Unlike `field`/`fields`, it's a regular decoder (not tied to `record`):

```typescript
// standalone
const userName = at('response', 'data', 'user', 'name').chain(string);

// inside a record — use field to read from parent, then at to drill deeper
const decoder = record({
    name: field('response').chain(at('data', 'user', 'name')).chain(string),
});
```

## New: `.default()` and `.create()` for constructing values

Every decoder now has `.default(value)` to attach a default value and `.create(patch?)` to construct values from defaults.

```typescript
const name = string.default('John');
name.create();        // 'John'
name.create('Alice'); // 'Alice'
```

For record decoders, `.create()` recursively constructs from field-level defaults. Fields without defaults must be provided in the patch:

```typescript
const user = record({
    name: string.default('John'),
    age: integer,
    role: always('member'),
});
user.create({ age: 25 }); // { name: 'John', age: 25, role: 'member' }
```

`always(v)` and `fallback(dec, v)` automatically carry their value as a default. `literal(v)` and bare literals also auto-default since they have exactly one valid value. Tuples auto-default when all elements have defaults.

```typescript
// literal auto-defaults
literal('admin').create(); // 'admin'

// bare literals auto-default in records
record({ type: 'event', name: string.default('x') }).create();
// { type: 'event', name: 'x' }

// tuples auto-default when all elements have defaults
tuple(number.default(0), string.default('')).create(); // [0, '']

// bare tuple literal forms auto-default in records
record({ pair: [number.default(0), number.default(0)], tag: 'point' }).create();
// { pair: [0, 0], tag: 'point' }
```

`.map()` transforms the default along with the decoder.

## New: `Decoder()` for using decoders as types

`Decoder()` wraps a decoder into a class, giving you a single name that serves as both a type and a decoder — eliminating the `decodeType<typeof x>` boilerplate:

```typescript
// Before: two declarations
type User = decodeType<typeof userDecoder>;
const userDecoder = record({ name: string, age: number });

// After: one declaration
class User extends Decoder({ name: string, age: number }) {}
```

`User` works as both a type and a decoder with `.decode()`, `.safeDecode()`, and schema-aware `.create()`. Decoded values are plain objects — no class instances.

`Decoder()` accepts record schemas, tuple literal forms, and existing decoder objects. It cannot be used with unions or primitives (TypeScript limitation).
