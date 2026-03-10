![logo](logo.png)
#

TypeScript Json Decoder is a library for decoding untrusted data as it comes in to your system, inspired by elm-json-decode.

Detecting at runtime that your type does not in fact match the value returned by your API sucks, and not being able to parse the data to a data structure of your liking in a convenient way sucks majorly - and having a type definition separate from its parser is unacceptable.

Installation: [npmjs.com/package/typescript-json-decoder](https://www.npmjs.com/package/typescript-json-decoder)

Try it here: [sandbox](https://codesandbox.io/s/typescript-json-decoder-playground-5751w5)

I've also written a piece about how it works internally and the underlying idea [here.](article.md)

## The idea

The following is an example of a simple decoder which defines a decoder of type `User`.

```typescript
import { decodeType, record, number, string, boolean } from 'typescript-json-decoder';

type User = decodeType<typeof userDecoder>;
const userDecoder = record({
    id: number,
    username: string,
    isBanned: boolean,
});
```

`userDecoder` is a callable `Decoder<User>` object. It decodes any JavaScript object to `User`, which is the generated type. This type is inferred to be exactly what you expect. `number`, `string`, and `boolean` are also decoders in the same way, and decode values of their respective types. If any of these decoders fail they throw with an appropriate error message.

Every decoder also has `.map()` for transforming results and `.safeDecode()` for error handling without exceptions — more on those below.

The idea is to have one declaration of the types in your system the same way as you would if you only used TypeScript, but also have decoders of those types. Although we declare decoders and infer the corresponding types, I like to think of the declaration as a normal type declaration like you are used to, and incidentally also getting a decoder.

To use this decoder with an endpoint which returns a user object, you would do the following.

```typescript
const user: Promise<User> =
    fetch('/users/1')
    .then(x => x.json())
    .then(userDecoder);
```

Although, the `Promise<User>` declaration is redundant; the correct type will be inferred for us. If the decoder fails, the promise is rejected.

## Benefits

- You have *one* definition of your type which is easy to change and mirrors regular TypeScript definitions. The decoder is a free bonus.

- Immediate error messages anytime your assumption about your API is wrong, or if it were to change in the future. No more runtime errors that only occasionally occur.

- If you use the decoder at the end of a fetch call, the promise will reject - meaning you can consider a decoding failure the same as any other network failure.

- A decoder for an object will pick out all the keys it needs, and discard the rest. This means that if your API has superfluous keys you don't care about, you won't carry unnecessary data around in the objects in your app.

- All the standard types have decoders provided which you can use directly and never have to write a custom decoder.

- If you'd like you can write custom decoders, operating on whatever data you want and producing whatever you want. Decoders are callable objects that compose freely!

- Decoders can do arbitrary transformations of your data via `.map()`, massaging it to have the exact shape and structure you want. There is no reason to be stuck with whatever data structure your API supplies.

- Decoders can do validation! If you want to write a decoder that does validation, simply pass the data through your decoder unchanged if it satisfies your rules, or throw an error if it doesn't.

## Usage

This library supports all the regular TypeScript types you are used to and can be composed arbitrarily to describe your types - with a goal of being as close to the regular type syntax as possible.

Expanding on the `User` example, we could for instance have an optional ssn and a list of phone numbers.

```typescript
import { decodeType, record, number, string, boolean, array, optional } from 'typescript-json-decoder';

type User = decodeType<typeof userDecoder>;
const userDecoder = record({
    id: number,
    username: string,
    isBanned: boolean,
    phoneNumbers: array(string),
    ssn: optional(string),
});
```

I call these higher order decoders, as they are functions accepting any decoder and returning the matching decoder. If you provide a function from any JavaScript object to a type `T`, that is a decoder of T (`Decoder<T>`) and can be used in any combination with each other.

Another useful kind of "type combinator" in TypeScript is the concept of a union of two types, for instance written `string | number` for the union of strings and numbers. We can imagine a user has a credit card number which is either a string or a number. Don't refer to me for domain modeling advice.

```typescript
import { decodeType, record, number, string, boolean, array, optional, union } from 'typescript-json-decoder';

type User = decodeType<typeof userDecoder>;
const userDecoder = record({
    id: number,
    username: string,
    isBanned: boolean,
    phoneNumbers: array(string),
    ssn: optional(string),
    creditCardNumber: union(string, number),
});
```

Union takes an arbitrary number of parameters.

Similarly, you can use something like `intersection({email: string}, userDecoder)` to get a decoder for `{email: string} & user`, the subtype of users that also have an e-mail address.

Lastly we can add some more stuff, and if you wish to fetch a list of your users, do it like the following.

```typescript
import { decodeType, record, number, string, boolean, array, optional, union } from 'typescript-json-decoder';

type User = decodeType<typeof userDecoder>;
const userDecoder = record({
    id: number,
    username: string,
    isBanned: boolean,
    phoneNumbers: array(string),
    ssn: optional(string),
    creditCardNumber: union(string, number),
    address: {
        city: string,
        timezones: array({ info: string, optionalInfo: optional(array(number)) })
    }
});

const users: Promise<User[]> =
    fetch('/users')
    .then(x => x.json())
    .then(array(userDecoder))
```

## Advanced usage

Everything so far should cover most APIs you need to model. However, I really want to give you the tools to model any kind of API you come across or want to create. Therefore we will look at some more complicated and useful constructs.

Although not as common in Json APIs (yet?), tuples are a very useful data structure. In JavaScript we usually encode them as lists with a fixed number of elements and possibly of different types, and TypeScript understands this. A tuple with a string and a number (such as `['user', 2]`) can be expressed with the type `[string, number]`. In this library we can use the `tuple` function to the same effect. Tuples of 2 to 5 elements are supported.

```typescript
import { decodeType, tuple, string, number } from 'typescript-json-decoder';

type StringAndNumber = decodeType<typeof stringAndNumberDecoder>;
const stringAndNumberDecoder = tuple(string, number);
const myTuple = stringAndNumberDecoder(['user', 2]);
```

This doesn't really match the syntax of regular TypeScript as much as I would like, so as a convenience feature we also allow a *literal syntax* for tuples. The idea is that a two element list of decoders can be considered itself a decoder of the corresponding tuple. The same example as above written in the literal form would be as follows.

```typescript
import { decodeType, decoder, string, number } from 'typescript-json-decoder';

type StringAndNumber = decodeType<typeof stringAndNumberDecoder>;
const stringAndNumberDecoder = decoder([string, number]);
const myTuple = stringAndNumberDecoder(['user', 2]);
```

Notice we now need a call to a `decoder` function to make it into an actually callable decoder. `decoder` is the low level implementation which all the other decoders are implemented in terms of; that is `record`, `tuple`, and all the other built in decoders eventually call `decoder` to do the dirty work. But that's a tangent, the advantage to this approach is that you can use the literal tuple syntax directly in an object, such as the following.

```typescript
const myDecoder = record({
    username: string,
    result: [string, number],
    results: array([string, number]),
});
```

It turns out this idea of literal form decoders is actually a lot more general. In fact, you can consider the first example of the `User` type to be a literal decoder where the `User` decoder object is a decoder of a JavaScript object of the same form. For this reason we also consider primitive values - strings, numbers, and booleans - as literal decoders of themselves. That is, `'hey'` literally decodes the string `'hey'`, `42` decodes the number `42`, and `true` decodes the boolean `true`.

This allows some really cool stuff. You can use bare literals directly in your decoders to assert exact values.

```typescript
import { decodeType, record, string, number } from 'typescript-json-decoder';

type Config = decodeType<typeof configDecoder>;
const configDecoder = record({
    version: 2,
    env: 'production' as const,
    debug: false,
    name: string,
    retries: number,
});
// Config = { version: number; env: 'production'; debug: false; name: string; retries: number }
```

Bare literals work everywhere - in records, nested objects, unions, tuples, and any other combinator. If you want to preserve the exact numeric literal type (e.g. `2` instead of `number`), use `as const` or the `literal()` function.

```typescript
import { literal, record, string } from 'typescript-json-decoder';

// These are equivalent:
record({ level: literal(42), name: string })  // level: 42
record({ level: 42 as const, name: string })  // level: 42
record({ level: 42, name: string })           // level: number (TS widens bare numbers)
```

This is especially powerful for discriminated unions. Consider two kinds of API responses:

```typescript
import { decodeType, record, string, number, union } from 'typescript-json-decoder';

const coolDecoder = record({ type: 'cool' as const, somestuff: string });
const dumbDecoder = record({ type: 'dumb' as const, otherstuff: string });

type Stuff = decodeType<typeof stuffDecoder>;
const stuffDecoder = union(coolDecoder, dumbDecoder);
```

The type `Stuff` represents the union of these two other types, and TypeScript now requires us to check the `type` field before trying to access either `somestuff` or `otherstuff` since they do not appear in both types - but one of them are guaranteed to exist.

You can also use bare literals directly in union arguments for simple enum-like types:

```typescript
const directionDecoder = union('north', 'south', 'east', 'west');
// decodes to: 'north' | 'south' | 'east' | 'west'

const statusCodeDecoder = union(200, 404, 500);
// decodes to: 200 | 404 | 500
```

Bare number and boolean literals also work in nested objects without needing `record()`:

```typescript
const decoder = record({
    name: string,
    config: {
        level: 42,
        active: true,
        env: 'prod' as const,
    }
});
```

## Custom decoders

All the decoders we have defined so far are in a way custom decoders and can be combined freely, however I encourage people to create arbitrary parsing functions which transform and validate data. Simply create a function which tries to build the data structure you want and throw an error message if you are unable to signify failure. You can wrap any function `(input: unknown) => T` with `decoder()` to get a full `Decoder<T>` with `.map()` and `.safeDecode()`. Decoders can be reused and combined however you want.

Here are some decoders I wrote mostly for fun.

`date` is a decoder which returns a native `Date` object. This is actually more expressive than what you usually get from a Json API typed with TypeScript, which might have the following type.

```typescript
type BlogPost = {
    title: string;
    content: string;
    createdDate: string;
}
```

However we know that `createdDate` is a string representing a date, and at some point we might or might not like to work with it as a `Date` object. Here I simply invoke the regular `string` decoder and then try to parse that string as a `Date`, and throw otherwise. That might look like the following.

```typescript
import { string } from 'typescript-json-decoder';

const date = (value: Pojo) => {
  const dateString = string(value);
  const timeStampSinceEpoch = Date.parse(dateString);
  if (isNaN(timeStampSinceEpoch)) {
    throw `String \`${dateString}\` is not a valid date string`;
  }
  return new Date(timeStampSinceEpoch);
};
```

I provide this decoder with the library, and we can use it as follows.

```typescript
import { decodeType, record, date } from 'typescript-json-decoder';

type blogpost = decodeType<typeof blogpostdecoder>;
const blogpostdecoder = record({
    title: string,
    content: string,
    createdDate: date,
});
```

Look at that: actual, type safe, automatic parsing of a date encoded as a Json string.

At this point I went a little crazy implementing fun data structures. How about a dictionary? A dictionary is a map from strings to your type `T`, that is, the type `Map<string, T>`. The function `dict` then takes a decoder of `T` and creates a decoder which parses *JavaScript object literals* as maps. Take a look at the following example to understand how it works.

```typescript
import { dict } from 'typescript-json-decoder';

const myDictionary = {
    one: 1,
    two: 2,
    three: 3,
};

const numberDictionaryDecoder = dict(number);
const myMap = numberDictionaryDecoder(myDictionary); // Map<string, number>
console.log(myMap.get('two')); // 2
```

If you prefer a plain object instead of a `Map`, use `objectOf`. It works the same way but returns a `Record<string, T>`.

```typescript
import { objectOf, number } from 'typescript-json-decoder';

const scores = objectOf(number);
const result = scores({ math: 90, english: 85 }); // Record<string, number>
console.log(result.math); // 90
```

You can also constrain the allowed keys:

```typescript
const sizes = objectOf(number, ['small', 'medium', 'large'] as const);
// Record<'small' | 'medium' | 'large', number>
```

Although this makes a lot of sense, few APIs actually use Json literals to encode maps. Rather you often see lists of objects, for example lists of `User` objects, which in a sense *are* maps, and maybe you want to treat those as maps from their user id to the user object. Enter the `map` decoder.

The `map` decoder is a function which takes a decoder and a "key" function. The key function takes the decoded object and returns its key. Imagine you have Json of the following form.

```json
[
    {
        "id": 1,
        "username": "Fred",
        "isBanned": true,
    },
    {
        "id": 2,
        "username": "Olga",
        "isBanned": false,
    }
]
```

A decoder which understands this is data structure can be specified as the following.

```typescript
import { map, Decoder } from 'typescript-json-decoder';

const userListDecoder: Decoder<Map<number, User>> =
    map(userDecoder, x => x.id);
```

Here too the type declaration is redundant and will be inferred if you wish. You can also inline the definition if it only appears one place and you don't need a name for it.

```typescript
import { number, string, boolean, map, Decoder } from 'typescript-json-decoder';

const userListDecoder =
    map({
        id: number,
        username: string,
        isBanned: boolean,
    }, x => x.id);
```

## Low level access

Sometimes you need direct access to the fields of the object you're decoding. Maybe you want to use the same fields to calculate two different things, or maybe you want to combine two or more different fields.

The `field` decoder accepts a string, the name of the key, and optionally a decoder for the value (defaults to `unknown`).

Say you have some date in an iso-date-string format in the field `"dateOfBirth"` but are only interested in the year and month, you could use the `field` decoder to access it in the following way.

```typescript
import { decodeType, record, field, date } from 'typescript-json-decoder';

type User = decodeType<typeof userDecoder>;
const userDecoder = record({
    month: field('dateOfBirth', date).map(d => d.getMonth() + 1),
    year: field('dateOfBirth', date).map(d => d.getFullYear()),
});
```

If you need to combine multiple fields, use the `fields` decoder. It accepts an object schema and decodes those keys from the parent object. Chain `.map()` to produce the resulting value.

```typescript
import { decodeType, record, fields, string, number } from 'typescript-json-decoder';

type User = decodeType<typeof userDecoder>;
const userDecoder = record({
    identifier: fields({ username: string, userId: number })
        .map(({ username, userId }) => `user:${username}:${userId}`),
});
```

This is read as "the `userDecoder` decodes an object which might look like `{ username: "hunter2", userId: 3 }` and decodes to an object which looks like `{ identifier: "user:hunter2:3" }`".

Both the `field` and the `fields` decoder are meant to be used "inside" a record decoder in the way shown here.

For drilling into deeply nested structures, use `at`. Unlike `field` and `fields`, `at` is a regular decoder (not tied to `record`), and can be used standalone or chained after `field`.

```typescript
import { at, field, record, string, number } from 'typescript-json-decoder';

// standalone — drill directly into nested data
const userName = at('response', 'data', 'user', 'name').chain(string);

// inside a record — use field to read from parent, then at to drill deeper
const decoder = record({
    name: field('response').chain(at('data', 'user', 'name')).chain(string),
    score: field('response').chain(at('data', 'user', 'stats', 'score')).chain(number),
});
```

## More built-in decoders

In addition to the core decoders (`string`, `number`, `boolean`, `date`), the library provides a few more:

`integer` decodes a number and additionally validates that it is a whole number.

```typescript
import { integer } from 'typescript-json-decoder';

integer(42);   // 42
integer(3.14); // throws
```

`unknown` passes any value through unchanged, typed as `unknown`. Useful when you want to defer validation or keep a portion of the data opaque.

```typescript
import { record, string, unknown } from 'typescript-json-decoder';

const decoder = record({ name: string, metadata: unknown });
// metadata: unknown — you can inspect it later
```

`always` ignores the input and always returns a constant value. This is useful for providing defaults in unions.

```typescript
import { union, record, string, number, always } from 'typescript-json-decoder';

const decoder = union(
    record({ status: 'ok' as const, data: string }),
    always({ status: 'error' as const, data: '' }),
);
// If the input doesn't match the first case, you get the default
```

`literal` creates a decoder for an exact primitive value - a specific string, number, or boolean. The type is preserved exactly.

```typescript
import { literal, union } from 'typescript-json-decoder';

const boolDecoder = literal(true);   // decodes to type `true`, not `boolean`
const numDecoder = literal(42);      // decodes to type `42`, not `number`

// Useful in unions for exact type preservation:
const levelDecoder = union(literal(1), literal(2), literal(3));
// decodes to: 1 | 2 | 3
```

`regex` validates that a string matches a regular expression pattern.

```typescript
import { regex, record, string } from 'typescript-json-decoder';

const userDecoder = record({
    name: string,
    email: regex(/^[^@]+@[^@]+\.[^@]+$/),
    zip: regex(/^\d{5}$/),
});
```

`withDefault` wraps any decoder with a fallback value. If the decoder throws, the fallback is returned instead. The fallback type can differ from the decoder type, in which case the return type is the union of both.

```typescript
import { record, string, number, withDefault } from 'typescript-json-decoder';

const userDecoder = record({
    name: string,
    role: withDefault(string, 'user'),       // string — missing or invalid key gets 'user'
    score: withDefault(number, null),         // number | null — fallback is a different type
});
```

`bigint` decodes values to BigInt. It accepts bigint values directly, integer numbers, and numeric strings.

```typescript
import { bigint, record, string } from 'typescript-json-decoder';

bigint(BigInt(42)); // 42n
bigint(42);         // 42n (integer numbers are converted)
bigint('123');      // 123n (numeric strings are parsed)
bigint(3.14);       // throws (not an integer)

const decoder = record({ name: string, balance: bigint });
decoder({ name: 'alice', balance: '9007199254740993' });
// { name: 'alice', balance: 9007199254740993n }
```

`nonEmptyArray` works like `array` but rejects empty arrays. The return type is a non-empty tuple `[T, ...T[]]`.

```typescript
import { nonEmptyArray, string, record } from 'typescript-json-decoder';

const decoder = record({
    tags: nonEmptyArray(string),
});
decoder({ tags: ['a', 'b'] }); // { tags: ['a', 'b'] }
decoder({ tags: [] });          // throws
```

`missing` asserts that a key does *not* exist in the input. This is useful for ensuring deprecated or forbidden fields have been removed.

```typescript
import { record, string, missing } from 'typescript-json-decoder';

const decoder = record({
    name: string,
    deletedField: missing,
});
decoder({ name: 'alice' });                     // { name: 'alice' }
decoder({ name: 'alice', deletedField: true });  // throws
```

`lazy` defers decoder evaluation, enabling recursive and self-referential types like trees.

```typescript
import { record, string, array, lazy, Decoder } from 'typescript-json-decoder';

type Tree = { value: string; children: Tree[] };
const treeDecoder: Decoder<Tree> = record({
    value: string,
    children: array(lazy(() => treeDecoder)),
});
```

`withDefault` respects the inner decoder's semantics — if the decoder legitimately returns `null` or `undefined` (e.g. via `nullable` or `optional`), those pass through as valid values. The fallback only kicks in when the decoder throws.

```typescript
import { withDefault, nullable, number } from 'typescript-json-decoder';

const decoder = withDefault(nullable(number), null);
decoder(42);    // 42
decoder(null);  // null (valid decoded value, not fallback)
decoder('bad'); // null (decoder threw, fallback)
```

## Transforming decoded values

Every decoder has a `.map()` method that transforms the decoded result, returning a new decoder. This is the universal way to reshape data.

```typescript
import { record, field, string, number, array, tuple, optional, nullable, literal } from 'typescript-json-decoder';

// field — extract and rename a nested value
const decoder = record({
    thing: field('nested', { theThingIWant: string }).map(x => x.theThingIWant),
    doubled: field('value', number).map(x => x * 2),
});

// tuple — destructure into an object
const pointDecoder = tuple(number, number).map(([x, y]) => ({ x, y }));

// array — reduce decoded elements
const sumDecoder = array(number).map(xs => xs.reduce((a, b) => a + b, 0));

// literal — transform matched value
const roleDecoder = literal('admin').map(x => x.toUpperCase());

// optional / nullable — map receives the full union type (including undefined/null)
const upperName = optional(string).map(s => s?.toUpperCase());
const upperOrNull = nullable(string).map(s => s !== null ? s.toUpperCase() : null);
```

`.map()` works on every decoder — `set`, `objectOf`, `dict`, `union`, `intersection`, and all others:

```typescript
import { set, objectOf, dict, union, intersection, number, string } from 'typescript-json-decoder';

const countUnique = set(string).map(s => s.size);
const totalScore = objectOf(number).map(r => Object.values(r).reduce((a, b) => a + b, 0));
const joined = dict(string, ['a', 'b'] as const).map(m => Array.from(m.values()).join(','));
const asString = union(string, number).map(x => String(x));
const combined = intersection({ a: string }, { b: number }).map(x => `${x.a}-${x.b}`);
```

You can also chain multiple `.map()` calls:

```typescript
const isLong = string.map(s => s.length).map(n => n > 3);
```

## Chaining decoders

While `.map()` takes a plain function, `.chain()` takes a `DecoderInput` — letting you pipe the output of one decoder into another, including literal forms like records and tuples.

```typescript
import { field, unknown, string, number, bigint, date, array } from 'typescript-json-decoder';

// parse a JSON string field as bigint
const balance = field('balance', string).chain(bigint);

// decode a nested payload as a typed record
const payload = field('data', unknown).chain({ name: string, age: number });

// string → date → year
const yearFromString = string.chain(date).map(d => d.getFullYear());
```

## Safe decoding

By default, decoders throw on failure. Every decoder has a `.safeDecode()` method that returns a result type instead:

```typescript
import { string, record, number, DecodeError } from 'typescript-json-decoder';

const result = string.safeDecode(someValue);
if (result.ok) {
    console.log(result.value); // string
} else {
    console.log(result.error); // DecodeError
}
```

This works on any decoder, including composed ones:

```typescript
const userDecoder = record({ name: string, age: number });
const result = userDecoder.safeDecode(input);
```

There is also a standalone `safeDecode` function if you prefer:

```typescript
import { safeDecode, string } from 'typescript-json-decoder';

const result = safeDecode(string, someValue);
```

Both return `{ ok: true, value: T } | { ok: false, error: DecodeError }`.

## Creating values with defaults

Decoders can carry default values, turning them into factories for constructing new instances. Use `.default()` to attach a default value and `.create()` to build values from defaults.

```typescript
import { string, number, integer, record, always, withDefault } from 'typescript-json-decoder';

const name = string.default('John');
name.create();        // 'John'
name.create('Alice'); // 'Alice'
```

`always` and `withDefault` automatically carry their value as a default:

```typescript
always('member').create();             // 'member'
withDefault(string, 'fallback').create(); // 'fallback'
```

This is most useful with record decoders. Fields with defaults don't need to be provided in the patch:

```typescript
const userDecoder = record({
    name: string.default('John'),
    age: integer,
    role: always('member'),
});

userDecoder.create({ age: 25 });
// { name: 'John', age: 25, role: 'member' }
```

Nested records work recursively — each field decoder's `.create()` is called to fill in missing values:

```typescript
const addressDecoder = record({
    city: string.default('Unknown'),
    zip: string.default('00000'),
});
const userDecoder2 = record({
    name: string.default('John'),
    address: addressDecoder,
});

userDecoder2.create();
// { name: 'John', address: { city: 'Unknown', zip: '00000' } }

userDecoder2.create({ address: { zip: '10001' } });
// { name: 'John', address: { city: 'Unknown', zip: '10001' } }
```

`.map()` transforms the default along with the decoder, so ordering is flexible:

```typescript
// default then map — the default is transformed
const upper = string.default('hello').map(s => s.toUpperCase());
upper.create(); // 'HELLO'

// map then default — the explicit default is used as-is
const dec = string.map(s => s.toUpperCase()).default('ALICE');
dec.create(); // 'ALICE'
```

You can also set a record-level default with `.default()`. A patch merges on top of it:

```typescript
const pointDecoder = record({ x: number, y: number });
const origin = pointDecoder.default({ x: 0, y: 0 });
origin.create();          // { x: 0, y: 0 }
origin.create({ x: 5 });  // { x: 5, y: 0 }
```

Calling `.create()` on a decoder with no default and no patch throws an error.

## Error structure

When decoding fails, decoders throw a `DecodeError` (extends `Error`) with structured information about what went wrong and where.

```typescript
import { DecodeError } from 'typescript-json-decoder';
```

A `DecodeError` has the following properties:

- **`message`** — what went wrong (e.g. `'The value \`42\` is not of type \`string\`'`)
- **`path`** — where it went wrong, as an array of keys and indices (e.g. `['users', 1, 'email']`)
- **`expected`** — the expected type (e.g. `'string'`)
- **`received`** — the actual value that was received (e.g. `42`)
- **`children`** — for compound errors (union, intersection), the errors from each branch

The path is built up automatically as errors propagate through `record`, `array`, `tuple`, `objectOf`, and `dict`. For example:

```typescript
import { safeDecode, record, array, string, number } from 'typescript-json-decoder';

const decoder = record({
    users: array({ name: string, age: number }),
});

const result = safeDecode(decoder, {
    users: [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 'not a number' },
    ],
});

if (!result.ok) {
    const error = result.error;
    error.message;       // 'The value `not a number` is not of type `number`, but is of type `string`'
    error.path;          // ['users', 1, 'age']
    error.getPathString(); // '/users/1/age'
    error.expected;      // 'number'
    error.received;      // 'not a number'
    error.toString();    // 'at /users/1/age: The value `not a number` is not of type `number`...'
}
```

When a union fails (none of the branches match), the error has `children` — one per branch:

```typescript
import { safeDecode, union, literal } from 'typescript-json-decoder';

const result = safeDecode(union('active', 'inactive'), 'unknown');
if (!result.ok) {
    result.error.message;  // 'None of the union cases matched'
    result.error.children; // [DecodeError for 'active', DecodeError for 'inactive']
    result.error.toString();
    // 'None of the union cases matched:\n  - The value `unknown` is not the literal `active`\n  - ...'
}
```
