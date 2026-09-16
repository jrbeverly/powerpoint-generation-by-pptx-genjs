# 0004: Test Runner — Vitest

- Status: accepted
- Date: 2026-08-23

## Context

Every milestone ships with tests: schema round-trips (`test/schema.test.ts`),
catalog contract pins (`test/icons.test.ts`, `test/metrics.test.ts`,
`test/products.test.ts`), constraint enforcement (`test/constraints.test.ts`),
and render smoke tests that write real `.pptx` files into temp directories
(`test/render.test.ts`). The project is ESM (`"type": "module"`) on
Node ≥ 20.19, and TypeScript is compiled with `module: ESNext`, so a test
runner must execute TypeScript sources directly without an extra build step
for tests. Candidates:

- **Vitest** — first-class TypeScript + ESM support, zero-config `vitest run`
  for CI, a watch mode for local development, and the same `describe/it/expect`
  API the team already knows from Jest.
- **node:test** — built into Node, but Node 20 has no TypeScript type
  stripping; running `.ts` tests would require a loader (e.g. `tsx`) bolted on
  to every command.
- **Jest** — mature, but ESM + TypeScript requires `babel-jest`/`ts-jest`
  configuration and carries a heavier dependency tree for no added benefit
  here.

## Decision

Use **Vitest 4.x** as the only test runner.

- `npm test` runs `vitest run` (single pass, no watch) so `make test` and CI
  behave identically; `npx vitest` is available locally for watch mode.
- Tests live in `test/*.test.ts` next to the `src/` tree they exercise, and
  import compiled sources by relative path (`.js` extension, per the module
  setting).
- No Vitest configuration file and no test-only tsconfig: the root
  `tsconfig.json` type-checks `src` and `test` together, so test code gets the
  same strict settings as production code.

## Consequences

- CI delegates to the Makefile (`make test`), keeping the runner choice out of
  workflow YAML (see ADR-0001).
- No separate build step or loader is needed to run tests; render smoke tests
  exercise the real PptxGenJS write path against temp directories.
- Coverage thresholds and test parallelism profiles are intentionally not
  configured yet; they can be added later without changing runners.
