/**
 * This test file ensures all examples compile and run without errors.
 * Each example is imported as a side-effect — if it throws, the test fails.
 */

test('basic-api example runs', () => {
  require('../examples/basic-api');
});

test('discriminated-unions example runs', () => {
  require('../examples/discriminated-unions');
});

test('decoder-class example runs', () => {
  require('../examples/decoder-class');
});

test('transform-and-reshape example runs', () => {
  require('../examples/transform-and-reshape');
});
