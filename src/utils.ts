export const tag = <T extends unknown, S extends Symbol>(
  thing: T,
  symbol: S,
): void => {
  (thing as any)[symbol] = true;
};

export const defaultTag: unique symbol = Symbol('default');
export const recordSchemaTag: unique symbol = Symbol('record-schema');
export const fieldDecoder: unique symbol = Symbol('field-decoder');
export const missingKey: unique symbol = Symbol('missing-key');

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
  v instanceof RegExp ? String(v) :
  JSON.stringify(v);

export const err = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.reduce((result, str, i) =>
    result + str + (i < values.length ? `\`${fmt(values[i])}\`` : ''), '',
  );
