/**
 * Discriminated union example.
 *
 * Demonstrates how to decode tagged/discriminated unions using
 * bare string literals as type discriminators.
 */
import {
  decodeType,
  record,
  string,
  number,
  union,
  always,
} from 'typescript-json-decoder';

// Each variant has a literal 'type' field that narrows the union
const successDecoder = record({ type: 'success' as const, data: string });
const errorDecoder = record({ type: 'error' as const, code: number, message: string });
const loadingDecoder = always({ type: 'loading' as const });

type ApiResponse = decodeType<typeof apiResponseDecoder>;
const apiResponseDecoder = union(successDecoder, errorDecoder, loadingDecoder);

// TypeScript narrows based on the 'type' field
function handle(response: ApiResponse) {
  switch (response.type) {
    case 'success':
      console.log('Data:', response.data);
      break;
    case 'error':
      console.log(`Error ${response.code}: ${response.message}`);
      break;
    case 'loading':
      console.log('Loading...');
      break;
  }
}

handle(apiResponseDecoder({ type: 'success', data: 'hello' }));
handle(apiResponseDecoder({ type: 'error', code: 404, message: 'Not found' }));
handle(apiResponseDecoder('anything else')); // falls through to always → loading
