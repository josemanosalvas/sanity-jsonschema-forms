# Contributing

## Setup

Development needs Node 22.12 or later and pnpm 10 or later. The published
package itself runs on Node 22 or later; the stricter development floor
comes from the build and test tooling.

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

## Adding a field type

1. Add the mapping to `SUPPORTED_FIELD_TYPES` and `compileField` in
   `src/to-json-schema.ts`, with any new validation rules in `RULE_KEYWORDS`.
2. Teach each adapter the presentation it needs, if any.
3. Extend the contact or messy fixture, then the compiler, AJV and render
   tests.
4. Move the type from "planned" to "supported" in
   `docs/compatibility.md` and update `docs/json-schema-contract.md`.

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
