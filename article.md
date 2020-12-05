# Json decoders in TypeScript

TypeScript is great because it lets you write statically verified code. You'll never try to access a property on an object that doesn't have it, and you'll never get a `undefined is not a function`. Except there are holes.

Have you ever written code like this?

```typescript
const users = fetch('/users') as Promsie<User[]>;
```

This sucks, because we are just hoping and praying the response from the `/users` endpoint matches our definition of the `User` type, which might look something like the following.

```typescript
type User = {
    id: number;
    username: string;
    friends: number[];
};
```

Usually it does, but there is never a guarantee - and especially not a guarantee that the data from the endpoint never changes. It's even more insidiuous if the data mostly matches, but sometimes it returns something slightly different, because you'll probably not catch it when developing and maybe not even when testing. And that's how you ship a bug to production that should (and could!) have been caught at compile time.

@TODO: Legg inn link:
Alright but how do you catch that at compile time? Without [LINKLINKNLIN](https://example.com) some kind of integration of your backend and frontend types, how do you statically verify the shape of your (possibly external) API's data? Well you can't really do that easily, but you can *verify* that the data actually does match the type you say it has as it comes in. So that's the idea, verify early and fail hard. Instead of mindlessly casting (using TypeScripts `as` operator) where you introduce the possibility of error, we would like to actually test and make sure the data actually conforms to our type and rather reject the Promise if it doesn't. Which I think makes sense, there is no practical difference to your app whether the external endpoint is down or it returns to you data you don't understand.

But this seems annoying, should we write parsers or validators for every type that comes in from an external source? That takes a lot of time, and is doubly annoying to maintain as our app and our APIs grow and change. That's why I wrote `typescript-json-decoder`. It is a library that automatically creates what is often known as "decoders", functions that make sure your data looks the way you say it does, based on your types. It has no external dependencies, is lightweight, and one of its core values is that it resembles and can be swapped in, in place of your existing TypeScript type definitions without any modifications or limitations. I want this to be idiomatic, regular TypeScript with as little friction as possible. The API surface of the library is designed to intuitive and as small as possible, so that it's not a caworksse of "yet another library" for people to learn and manage in their code. This is merely how I wish TypeScript already worked.

@TODO: Sjekk at linken gir meining
Check out [the github page](https://github.com/tskj/typescript-json-decoder) to see lots of examples and explanations of the more advanced features needed to express everything a TypeScript type can.

Let me give you a basic introduction to underlying idea. If we were to wish to replace our `User` type with a decoder for that type, we would instead write the following.

```typescript
import { decode, decoder, number, string, array } from 'typescript-json-decoder`;

type User = decode<typeof userDecoder>;
const userDecoder = decoder({
    id: number,
    username: string,
    friends: array(number),
});
```

And to use it we replace the cast with a call to the decoder.

```typescript
const users = fetch('/users').then(x => x.json()).then(array(userDecoder));
```

Or rather a decoder of an array of `userDecoder`s, assuming our endpoint returns a list of users. Notice we have to parse the json first using a call to `fetch`'s standard Json parser. This is because although the library is called `typescript-json-decoder`, it actually operates on plain old JavaScript values like objects, arrays, numbers and strings. It's maybe a bit of a misnomer, but it mostly makes sense to think about it this way. The nice thing about it is that you can pass any valid JS value to a decoder, and it will either return the decoded value or throw an error. The error reporting actually just throws a string describing the error, which rejects the promise if you use it in an async context. The decoder itself isn't async or aware of promises or anything like that.

At the cost of one line of boilerplate this gives you complete type safety when handling external data. I think this pattern should be used *every* place you receive untrusted data, and that includes endpoints you own. I at least don't trust myself to get these things right, there are too many opportunities to mess up APIs, even if it's just misspelling a field name when typing in the type.

## How it works

The way this works under the hood is pretty interesting. If you pay close attention you see that what we have defined is not a type at all, it's actually a JavaScript object that kind of looks like a type definition. This is because it's actually impossible in TypeScript (without hooking into the compiler) to do the kind of metaprogramming where you inspect the type itself. So instead we do the opposite, we create a regular value which represents the type we wish to generate, and from that we generate both the type itself (and assign it to `User`) and the decoder. The idea is that the library supplies all the primitive decoders such as `number`, `string`, and even `array` (which takes another decoder as a parameter), and then we combine these to build bigger decoders (with accompanying types). The way these decoders are defined is really simple, take a look at the following definition of the `string` decoder.

```typescript
const string: DecoderFunction<string> = (s: Pojo) => {
  if (typeof s !== 'string') {
    throw `The value \`${s}\` is not of type \`string\`, but is of type \`${typeof s}\``;
  }
  return s;
};
```

The library refers to regular JavaScript objects as `Pojo`s. This decoder doesn't actually *do* anything! It just returns the string it's passed, if it is a string, or if not, throws. So this is actually the identity function for strings.

The complexity in the library is elsewhere; the core idea is that an object (or what you might call a record) containing these decoders, *is a decoder of an object with the same fields*. In a sense, it is a decoder of itself. It decodes a thing that looks like itself. And this is defined recursively, which allows us to nest objects, or have arrays of objects, or arrays containing objects of objects containing arrays, and so on and so on. In this way you can define your own "custom" decoders and compose them arbitrarily.

The way the decoders are evaluated, then, is a pretty straightforward recursive traversal of the tree structure of decoders where it applies the decoders it finds. What is much more interesting, and honestly where all the complexity of this library resides, is in the innocent looking `decode` type level function, which is responsible for taking a decoder and producing the type of the thing it decodes.

Wat. A type level function? So TypeScript actually has an incredibly sophisticated type system. I come from a background of having fallen in love with the intricacies of Haskell's type system, but TypeScript is in many ways more advanced. This comes from the necessity of being able to express a lot of the patterns commonly found in JavaScript, which is by nature very dynamic. Anyway, a type level function is a function, at the type level. Bear with me. `decode` in the example above is not actually itself a type, rather it is something that when given a type, returns a type. A function of types! A function from a type to a type? Can types have types? This is sometimes referred to as "the kind" of a type, but if we don't want to confuse ourselves too much, we'll just think of this as something that you can give an existing type, and get another, new, type out of.

If you think about it, a decoder by necessity does not have the same type as the thing it decodes. Instead maybe it has the following type: `(x: Pojo) => User`. So it takes any plain old JavaScript object, and returns a `User` (if it can that is, TypeScript doesn't have checked exceptions). The type this decoder decodes, is `User`. So the following type expression: `decode<(x: Pojo) => User>` evaluates to the type `User` in this case, or whatever the decoder decodes. This all is complicated by the fact previously mentioned that not all decoders are functions; some decoders, namely a record decoder, has a literal form.

However, let's ignore that and first think about how to extract the type that a (function) decoder will decode.

```typescript
type decode<decoder> = decoder extends (x: Pojo) => (infer T) ? T : never;
@TODO: sjekk at dette kompilerer
```

Now this is the kind of metaprogramming that gets me going. What in the world is going on. Well, first of all we have a ternary - essentially an if test on types. The thing we are testing on is the `decoder extends (x: Pojo) => (infer T)` part, which is a *subtype test*. The extend keyword, I think, is a horribly chosen name in TypeScript, mostly carried over from other contexts. What it means is "is a subtype of". It is a question asked of the type parameter `decoder`, are you a subtype of the type `(x: Pojo) => (infer T)`, which begs the question, what is `infer T`? Well, it is whatever it needs to be to satisfy the subtype test. If `decoder` is the function type defined above, `(x: Pojo) => User`, then `T` would need to be `User` for the one to be the subtype of the other - at least if you consider being the same type as being a subtype. The keyword `infer` is used to introduce a new type variable. In the first branch of the ternary we return the type `T` if we have a match (that is, the decoder is a function type), and in the second branch we return TypeScript's bottom type `never`, indicating this should never happen. If this does happen, and we try to use the resulting type for anything, we get a compiler error. `never` is the empty set, if you are inclined to think about types as sets, and there is no value of this type.

@TODO: Sjekker at dette stemmer:
This is actually the definition of the type level function for extracting the return type of a function (that's a mouthful), and is in fact available in the standard library under the name `ReturnType`! So that was a lot of type theory for very little. We need to go further. I mentioned that the essence of this library is to understand literal values as decoders of themselves, and to define this recursively in the case of records. So let's add records!

@TODO: Sjekk at dette er riktig:
```typescript
type decode<decoder> =
    decoder extends (x: Pojo) => (infer T)
        ? T
        : { [key in keyof decoder]: decode<decoder[key]> }
```

Here I've formatted the nested ternary to make it resemble a classical if block. It's kind of elegant in a way. It's the classic recursive pattern, a base case where we break the recursion when there is no more work to do, and a body where we recursively call ourselves with a smaller set of the problem. Here we use TypeScript's well understood mapped types to iterate, or map I guess, over the keys and values of the record. For every key we evaluate `decode` on its value. So the following type, which would be the type of the decoder of our `User` type,

```typescript
type User = decode<{
    id: (x: Pojo) => number;
    username: (x: Pojo) => string;
    friends: (x: Pojo) => number[];
}>;
```

would evaluate to what we expect, namely the `User` type itself.

```typescript
type User = {
    id: number;
    username: string;
    friends: number[];
};
```

Now hopefully it makes sense to think about the series of steps it would take to evaluate a nested type defintion. So if we were to add an `address` to our `User`:

```typescript
type User = decode<typeof userDecoder>;
const userDecoder = decoder({
    id: number,
    username: string,
    friends: array(number),
    address: {
        city: string,
        zip: number,
    },
});
```

we would get the following evaluation steps.

```typescript
type User = decode<{
    id: (x: Pojo) => number;
    username: (x: Pojo) => string;
    friends: (x: Pojo) => number[];
    address: {
        city: (x: Pojo) => string;
        zip: (x: Pojo) => number;
    }
}>;

type User = {
    id: decode<(x: Pojo) => number>;
    username: decode<(x: Pojo) => string>;
    friends: decode<(x: Pojo) => number[]>;
    address: decode<{
        city: (x: Pojo) => string;
        zip: (x: Pojo) => number;
    }>,
}>;

type User = {
    id: number;
    username: string;
    friends: number[];
    address: {
        city: decode<(x: Pojo) => string>;
        zip: decode<(x: Pojo) => number>;
    },
}>;

type User = {
    id: number;
    username: string;
    friends: number[];
    address: {
        city: string;
        zip: number;
    },
}>;
```

@TODO: figure out spelling of github
@TODO: sjekk om den faktisk kompilerer?
And that's basically it! The above definition of `decode` doesn't actually compile, because direct recursive references aren't always allowed in TypeScript. If you're curious how that is solved I suggest to check out the source code on GitHub. It's a bit more involved, but I have tried to keep it pretty clean. I would very much welcome PR's and suggestions for improvements. Thanks for reading!

@TODO: Legg inn forklaring / eksempel om at literale json-verdier som strings og numbers dekoder til seg sjølv.
@TODO: nevn typeof og korleis den funker med å dra ting opp fra value space til type space, når det motsatte er umulig.