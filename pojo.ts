/**
 * Javascript Objects
 * These are not Json which are strings (javascript (literal) notation),
 * these are plain old javascript objects
 */

export type PojoPrimitive = string | boolean | number | null | undefined;
export type PojoObject = { [key: string]: Pojo };
export type PojoArray = Pojo[];
export type Pojo = PojoPrimitive | PojoObject | PojoArray;
