# Contributing

## Setup

Node 22.12 or later and pnpm 10 or later, for developing the package and
for running it.

```bash
git clone https://github.com/josemanosalvas/sanity-jsonschema-forms.git
cd sanity-jsonschema-forms
pnpm install
pnpm verify
```

`pnpm verify` runs everything CI runs, in order: `lint`, `typecheck`, `test`,
`build`, `build:example`, `publint`. Lint and format are oxlint and oxfmt
through [Ultracite](https://www.ultracite.ai/)'s preset; `oxlint.config.ts`
and `oxfmt.config.ts` list the few rules and style options this repo
overrides, each with its reason. `pnpm format` applies the fixes. `pnpm dev` starts `examples/compare`, which renders the same compiled
form through all three adapters; use it to see a change in every renderer
at once.

Inside the workspace, the package's `exports` point at `src/`, so the
example and the tests resolve it without a build. `publishConfig.exports`
swaps in `dist/` when the package is packed; `pnpm publint` checks the
packed result.

## Ground rules

Read [docs/architecture.md](docs/architecture.md) first. In short:

- **The schema is the contract.** A compiler change that adds anything
  renderer-specific to `schema` (a `ui:` key, `errorMessage`, an `$id`)
  will be declined. Presentation goes in the adapter of the renderer that
  needs it.
- **The compiler names no renderer.** Its diagnostics describe what JSON
  Schema cannot carry, not what a particular library does about it; a test
  enforces this.
- **Adapters pass the schema through unchanged** and read the original form
  only through `src/internal/fields.ts`. If an adapter needs a new fact from
  the form, add it there and say which second consumer would use it.
- **No intermediate form model.** A proposal to add one needs evidence that
  two consumers share a behaviour JSON Schema cannot express.
- **Diagnostics over exceptions.** The compiler never throws on content;
  every loss gets a diagnostic with a stable code. Add codes, never rename.
- **Fixtures are shared.** New behaviour gets a case in
  `packages/fixtures` so every adapter's tests see it.

## Adding or changing a field type

Every built-in type but `file` compiles; a change is more likely than an
addition. The steps are the same either way.

1. Establish the value contract first: what the native input submits, what
   AJV's format (if any) accepts, and where they differ. Write the
   submissions into `packages/fixtures/src/field-types.ts` (or a new
   fixture) as `{data, verdict}` before touching the compiler.
2. Add or change the mapping in `src/to-json-schema.ts`
   (`SUPPORTED_FIELD_TYPES`, `compileField`, `RULE_KEYWORDS` or
   `LOSSY_RULES`). A rule Draft 7 cannot carry gets a
   `lossy-validation-rule` diagnostic, never a validator-specific keyword.
3. Teach each adapter the presentation it needs, if any; the source type in
   `src/internal/fields.ts` is usually enough.
4. Extend the compiler, AJV and render tests, and check the verdicts in
   `test/parity.test.ts` across all four validators; a SurveyJS divergence
   is listed there, not hidden.
5. Update the status in `docs/compatibility.md` (supported / supported
   with lossy rule / unsupported), `docs/json-schema-contract.md`, and the
   adapter docs' field-type tables.

## Tests

```bash
pnpm test
```

Render tests run in jsdom against the real libraries. Keep assertions on
what a user would see (labels, checked state, messages), not on library
internals. `test/types.test.ts` checks that form-toolkit's `FormDataProps`
is still assignable to this package's structural `FormToolkitForm`; update
the copy in `src/types.ts` when form-toolkit changes its document.

## Releasing

Semantic versioning. Until `1.0`, breaking changes bump the minor version
and are called out in `CHANGELOG.md`.

1. Update `CHANGELOG.md` and the version in
   `packages/sanity-jsonschema-forms/package.json`.
2. `pnpm verify`.
3. Commit, tag `vX.Y.Z`, push the commit and the tag.
4. `pnpm release`. It runs `pnpm verify` again and then `pnpm publish` for
   the package with public access; a red gate stops the publish.
