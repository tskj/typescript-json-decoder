
export type JsonPrimitive = string | boolean | number | null | undefined;
export type JsonObject = { [key: string]: Json };
export type JsonArray = Json[];
export type Json = JsonPrimitive | JsonObject | JsonArray;