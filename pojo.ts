/**
 * Javascript Objects
 * These are not Json which are strings (javascript (literal) notation),
 * these are plain old javascript objects
 */

export type PojoPrimitive = string | boolean | number | null | undefined;
export const isPojoPrimitve = (value: unknown): value is PojoPrimitive =>
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  typeof value === 'number' ||
  typeof value === 'undefined' ||
  (typeof value === 'object' && value === null);

export type PojoObject = { [key: string]: Pojo };
export const isPojoObject = (value: unknown): value is PojoObject =>
  typeof value === 'object' && value !== null;

export type PojoArray = Pojo[];
export const isPojoArray = (value: unknown): value is PojoArray =>
  Array.isArray(value);

export type Pojo = PojoPrimitive | PojoObject | PojoArray;
export const isPojo = (value: unknown): value is Pojo =>
  isPojoPrimitve(value) || isPojoObject(value) || isPojoArray(value);
