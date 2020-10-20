import { $, _ } from './hkts';
import { undef } from './decoder';
import { Pojo } from './pojo';
import { eval, decode, Decoder, DecoderFunction } from './types';

/**
 * This business only works when union is called
 * with parameters as a tuple, not a general list?
 */
type getT<A, X> = X extends $<A, [infer T]> ? T : never;
export type getTypeofDecoderList<
  t extends Decoder<unknown>[]
> = getTypeOfDecoder<getT<Array<_>, t>>;
export type getTypeOfDecoder<
  t extends Decoder<unknown>
> = t extends DecoderFunction<unknown> ? eval<t> : t;
/**
 * ^ Wish I understood this better
 */

export const union = <decoders extends Decoder<unknown>[]>(
  ...decoders: decoders
) => (value: Pojo): getTypeofDecoderList<decoders> => {
  if (decoders.length === 0) {
    throw `Could not match any of the union cases`;
  }
  const [decoder, ...rest] = decoders;
  try {
    return decode(decoder as any)(value) as any;
  } catch (messageFromThisDecoder) {
    try {
      return union(...(rest as any))(value) as any;
    } catch (message) {
      throw `${messageFromThisDecoder}\n${message}`;
    }
  }
};

export const optionDecoder: unique symbol = Symbol('optional-decoder');
export function option<T extends Decoder<unknown>>(
  decoder: T
): DecoderFunction<eval<T> | undefined> {
  let _optionDecoder = union(undef, decoder as any);
  (_optionDecoder as any)[optionDecoder] = true;
  return _optionDecoder;
}

export function array<D extends Decoder<unknown>>(
  decoder: D
): DecoderFunction<eval<D>[]> {
  return (xs: Pojo): D[] => {
    const arrayToString = (arr: any) => `${JSON.stringify(arr)}`;
    if (!Array.isArray(xs)) {
      throw `The value \`${arrayToString(
        xs
      )}\` is not of type \`array\`, but is of type \`${typeof xs}\``;
    }
    let index = 0;
    try {
      return xs.map((x, i) => {
        index = i;
        return decode(decoder as any)(x);
      });
    } catch (message) {
      throw (
        message +
        `\nwhen trying to decode the array (at index ${index}) \`${arrayToString(
          xs
        )}\``
      );
    }
  };
}
