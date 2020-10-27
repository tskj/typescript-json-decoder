
TypeScript Json Decoder is a library for decoding untrusted data as it comes in to your system, inspired by elm-json-decode.

Detecting at runtime that your type does not in fact match the value returned by your API sucks, and not being able to parse the data to a datastructure of your liking in a convenient way sucks majorly - and having a type definition separate from its parser is unacceptable.

Installation: [npmjs.com/package/typescript-json-decoder](https://www.npmjs.com/package/typescript-json-decoder)

## The idea

The following is an example of a simple decoder which defines a decoder of type `User`.

```typescript
import { decode, decoder, number, string, boolean } from 'typescript-json-decoder';

type User = decode<typeof userDecoder>;
const userDecoder = decoder({
    id: number,
    username: string,
    isBanned: boolean,
});
```

`userDecoder` is a function from any JavaScript object to `User`, which is the generated type. This type is inferred to be exactly what you expect. `number`, `string`, and `boolean` are also decoders in the same way, and decode values of their respective types. If any of these decoders fail they throw with an appropriate error message.

The idea is to have one declaration of the types in your system the same way as you would if you only used TypeScript, but also have decoders of those types. Although we declare decoders and infer the corresponding types, I like to think of the declaration as a normal type declaration like you are used to, and incidentally also getting a decoder.

To use this decoder with an endpoint which returns a user object, you would do the following.

```typescript
const user: Promise<User> =
    fetch('/users/1')
    .then(x => x.json())
    .then(userDecoder);
```

Although, the `Promise<User>` declaration is redundant; the correct type will be inferred for us. If the decoder fails, the promise is rejected.

## Usage

This library supports all the regular TypeScript types you are used to and can be composed arbitrarily to describe your types - with a goal of being as close to the regular type syntax as possible.

Expanding on the `User` example, we could for instance have an optional ssn and a list of phone numbers.

```typescript
import { decode, decoder, number, string, boolean, array, option } from 'typescript-json-decoder';

type User = decode<typeof userDecoder>;
const userDecoder = decoder({
    id: number,
    username: string,
    isBanned: boolean,
    phoneNumbers: array(string),
    ssn: option(string),
});
```

I call these higher order decoders, as they are functions accepting any decoder and returning the matching decoder. If you provide a function from any JavaScript object to a type `T`, that is a decoder of T (`Decoder<T>`) and can be used in any combination with each other.

Another useful kind of "type combinator" in TypeScript is the concept of a union of two types, for instance written `string | number` for the union of strings and numbers. We can imagine a user has a credit card number which is either a string or a number. Don't refer to me for domain modeling advice.

```typescript
import { decode, decoder, number, string, boolean, array, option, union } from 'typescript-json-decoder';

type User = decode<typeof userDecoder>;
const userDecoder = decoder({
    id: number,
    username: string,
    isBanned: boolean,
    phoneNumbers: array(string),
    ssn: option(string),
    creditCardNumber: union(string, number),
});
```

Union takes an arbitrary number of parameters.

Lastly we can add some more stuff, and if you wish to fetch a list of your users, do it like the following.


```typescript
import { decode, decoder, number, string, boolean, array, option, union } from 'typescript-json-decoder';

type User = decode<typeof userDecoder>;
const userDecoder = decoder({
    id: number,
    username: string,
    isBanned: boolean,
    phoneNumbers: array(string),
    ssn: option(string),
    creditCardNumber: union(string, number),
    address: {
        city: string,
        timezones: array({ info: string, optionalInfo: option(array(number)) })
    }
});

const users: Promise<User[]> =
    fetch('/users')
    .then(x => x.json())
    .then(array(userDecoder))
```

## Advanced usage

Everything so far should cover most APIs you need to model. However, I really want to give you the tools to model any kind of API you come across or want to create. Therefore we will look at some more complicated and useful constructs.

Although not as common in Json APIs (yet?), tuples are a very useful datastructure. In JavaScript we usually encode them as lists with exactly two elements and possibly of different types, and TypeScript understands this. A tuple with a string and a number (such as `['user', 2]`) can be expressed with the type `[string, number]`. In this library we can use the `tuple` function to the same effect.

```typescript
import { decode, tuple, string, number } from 'typescript-json-decoder';

type StringAndNumber = decode<typeof stringAndNumberDecoder>;
const stringAndNumberDecoder = tuple(string, number);
const myTuple = stringAndNumberDecoder(['user', 2]);
```

This doesn't really match the syntax of regular TypeScript as much as I would like, so as a convenience feature we also allow a *literal syntax* for tuples. The idea is that a two element list of decoders can be cansidered itself a decoder of the corresponding tuple. The same example as above written in the literal form would be as follows.

```typescript
import { decode, decoder, string, number } from 'typescript-json-decoder';

type StringAndNumber = decode<typeof stringAndNumberDecoder>;
const stringAndNumberDecoder = decoder([string, number])
const myTuple = stringAndNumberDecoder(['user', 2]);
```

Notice we now need a call to the standard `decoder` function to make it into an actually callable decoder.

It turns out this idea of literal form decoders is actually a lot more general. In fact, you can consider the first example of the `User` type to be a literal decoder where the `User` decoder object is a decoder of a JavaScript object of the same form. For this reason we also consider strings as literal decoders of themselves, that is `decoder('hey')` literally decodes the string `'hey'`. That might seem dumb, but it allows some really cool stuff. Firstly it allows us to decode an object which looks exactly like the following.

```typescript
const x = { type: 'cool', somestuff: "" }
```

With this decoder.

```typescript
import { decode, decoder, string } from 'typescript-json-decoder';

type Cool = decode<typeof coolDecoder>;
const coolDecoder = decoder({ type: 'cool', somestuff: string });
```

Similarly we can define another decoder of this type.

```typescript
const y = { type: 'dumb', otherstuff: "starbucks" }
```

With a decoder that looks like this.

```typescript
import { decode, decoder, string } from 'typescript-json-decoder';

type Dumb = decode<typeof dumbDecoder>;
const dumbDecoder = decoder({ type: 'dumb', otherstuff: string });
```

This ensures that the `type` key is exactly the string `cool` or `dumb` respectively. If we now combine these decoders using a union we get what is known as a "discriminated union".

```typescript
import { decode, union } from 'typescript-json-decoder';

type Stuff = decode<typeof stuffDecoder>;
const stuffDecoder = union(coolDecoder, dumbDecoder);
```

The type `Stuff` represents the union of these two other types, and TypeScript now requires us to check the `type` field before trying to access either `somestuff` or `otherstuff` since they do not appear in both types - but one of them are guaranteed to exist. 

## Custom decoders

All the decoders we have defined so far are in a way custom decoders and can be combined freely, however I encourage people to create arbitrary parsing functions which transform and validate data. Simply create a function which tries to build the datastructure you want and throw an error message if you are unable to signify failure. Decoders can be reused and combined however you want, and composition of decoders is simply function composition.

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
import { decode, decoder, date } from 'typescript-json-decoder';

type BlogPost = decode<typeof blogpostDecoder>;
const blogpostDecoder = decoder({
    title: string,
    content: string,
    createdDate: date,
});
```

Look at that: actual, type safe, automatic parsing of a date encoded as a Json string.