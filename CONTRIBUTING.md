# Contributing

Use Node 22.12+ and the pnpm version pinned in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm dev  # comparison example at http://localhost:5174
```

## Verification

| Command | Use |
| --- | --- |
| `pnpm test:watch to-json-schema` | compiler feedback while editing |
| `pnpm test content` | a focused regression suite |
| `pnpm test:unit` | compiler, malformed content, property tests, validator parity; no jsdom |
| `pnpm verify:quick` | lint, workspace typecheck, unit tests |
| `pnpm test` | all tests, including real RJSF and JSON Forms renders |
| `pnpm test:package` | build, pack, import all public entries without renderer peers |
| `pnpm verify` | complete CI gate, including example build and strict publint |
| `pnpm format` | apply oxlint/oxfmt fixes using the Ultracite preset |

Tests and the example resolve workspace exports to `src/`; no build is needed
while editing. `publishConfig.exports` switches to `dist/` during packing.
The isolated package check exercises those published exports, without access
to workspace dependencies. It requires `tar` (available on macOS and CI).

Property-test failures print a seed and shrink path. Reproduce with those
values in the failing `assert` call before changing its generator.

## Changes

Read the [architecture](docs/architecture.md) and the relevant section of the
[contract](docs/json-schema-contract.md). Keep JSON Schema independent of
renderers and preserve diagnostic codes. Malformed content should produce
diagnostics; compile errors in code should still fail loudly.

For a value-contract change, add submissions with explicit accept/reject
verdicts to `packages/fixtures`; `test/parity.test.ts` checks all three
validators. For a compiler edge case, add a focused regression. For widget
changes, assert visible behavior in the real render tests. The JSON Forms
tests use the comparison example's checkbox-group renderer directly.

Update the contract or compatibility table when behavior changes. Keep
`test/types.test.ts`: typechecking it catches upstream document-type drift.

## Release

Update the package version and `CHANGELOG.md`, commit, tag `vX.Y.Z`, and push.
`pnpm release` runs the full verification gate before publishing. Until `1.0`,
breaking changes bump the minor version.
