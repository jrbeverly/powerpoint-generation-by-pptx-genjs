# 0001: Package Manager — npm

- Status: accepted
- Date: 2026-08-22

## Context

The development environment (Node 20.19) ships npm, pnpm, and yarn. The project
needs a single package manager whose lockfile makes the toolchain reproducible
locally and on CI runners, without extra environment setup.

## Decision

Use **npm** with a committed `package-lock.json`.

- npm ships with every Node runtime CI runners and local environments provide;
  `npm ci` installs pinned dependencies with no additional package-manager
  installation step.
- The choice is recorded in `package.json` via
  `"packageManager": "npm@10.8.2"` for tooling that performs Corepack-style
  discovery.

## Consequences

- CI and local builds share identical dependency resolution through the
  lockfile.
- No package-manager bootstrapping is required in workflow definitions; CI
  delegates to the Makefile targets (`make validate`, `make build`, `make lint`,
  `make test`), which install dependencies automatically when missing.
