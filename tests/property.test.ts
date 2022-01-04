import fc from 'fast-check';
import { date, number, optional, string, tuple } from '../src';

test('decode string', () => {
  fc.assert(
    fc.property(fc.string(), (s) => {
      expect(string(s)).toBe(s);
    }),
  );
});

test('decode optional string', () => {
  fc.assert(
    fc.property(fc.oneof(fc.string(), fc.constant(undefined)), (s) => {
      expect(optional(string)(s)).toBe(s);
    }),
  );
});

test('decode number', () => {
  fc.assert(
    fc.property(fc.float(), (n) => {
      expect(number(n)).toBe(n);
    }),
  );
});

test('decode string tuple', () => {
  fc.assert(
    fc.property(fc.string(), fc.string(), (s1, s2) => {
      expect(tuple(string, string)([s1, s2])).toEqual([s1, s2]);
    }),
  );
});

test('decode string,number tuple', () => {
  fc.assert(
    fc.property(fc.string(), fc.float(), (s, n) => {
      expect(tuple(string, number)([s, n])).toEqual([s, n]);
    }),
  );
});

test('decode date', () => {
  fc.assert(
    fc.property(fc.date(), (d) => {
      const dateString = d.toISOString();
      expect(date(dateString)).toEqual(d);
    }),
  );
});
