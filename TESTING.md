# Testing and quality gates

The project uses Node.js' built-in test runner with TypeScript execution provided by a pinned `tsx` CLI version. This keeps the test runner lightweight and avoids adding a runtime dependency to the dashboard.

## Requirements

- Node.js 22.12 or newer
- npm

## Run checks locally

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

The test command downloads the pinned `tsx@4.20.6` runner through `npx` when it is not already available. Application dependencies remain locked by `package-lock.json`.

The bundled fallback dataset is synthetic demo data. It intentionally does not mark a current or next gameweek; its generated fixture window starts at the first unfinished demo event. Never use fallback values as current FPL facts.

## Test layout

- `tests/analytics.test.mjs`: player scoring, value calculations, numeric parsing and availability helpers.
- `tests/fixtures.test.mjs`: fixture transformation, gameweek selection, filtering and ordering.
- `tests/fplService.test.mjs`: bootstrap and fixture payload validation, live/partial/mock states, malformed JSON, HTTP failures and timeouts.

Tests use Node's `node:test` and `node:assert/strict` APIs. Keep tests deterministic: do not make live FPL API requests from unit tests.

## Continuous integration

The GitHub Actions workflow in `.github/workflows/quality.yml` runs lint, TypeScript type checking, automated tests and a production build for pull requests targeting `develop` or `master`, and pushes to those branches.

A pull request should not be merged into `develop` until all four checks pass. Features should be integrated into `develop` first; promotion from `develop` to `master` is a separate release step.
