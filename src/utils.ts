export const tag = <T extends unknown, S extends Symbol>(
  thing: T,
  symbol: S,
): void => {
  (thing as any)[symbol] = true;
};

/**
 * Tagged template for decoder error messages.
 * Interpolated values are wrapped in backticks.
 * Strings are inserted directly; non-strings are JSON.stringify'd.
 *
 *   err`Expected ${value} to be of type ${'string'}`
 *   // => "Expected `42` to be of type `string`"
 */
const fmt = (v: unknown): string =>
  typeof v === 'string' ? v :
  v === undefined ? 'undefined' :
  JSON.stringify(v);

export const err = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((result, str, i) =>
    result + str + (i < values.length ? `\`${fmt(values[i])}\`` : ''), '',
  );
