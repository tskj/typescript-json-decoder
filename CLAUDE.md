# CLAUDE.md

## Build & Test

- `npm run build` — runs `tsc` (TypeScript 4.2.3)
- `npm test` — runs `jest && npx tsd`
- Runtime tests: `tests/unit.test.ts`, `tests/index.test.ts`
- Type-level tests: `tests/index.test-d.ts` (tsd)

## Principles

- **Backwards compatibility**: Don't make breaking changes except in a new major version. Existing decoders, type signatures, and exports must continue to work.
- **README as spec**: Every code example in the README must be exercised verbatim as a runtime test. If you change the README, update the tests to match, and vice versa.
