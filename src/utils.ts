export const tag = <T extends unknown, S extends Symbol>(
  thing: T,
  symbol: S,
): void => {
  (thing as any)[symbol] = true;
};
