# Repository guide

This package compiles `@sanity/form-toolkit` documents to JSON Schema Draft 7.
RJSF and JSON Forms adapters add presentation without changing the schema.

- `packages/sanity-jsonschema-forms/src/to-json-schema.ts`: compilation.
- `src/internal/field.ts` within that package: field metadata and acceptance
  shared with adapters; keep it independent of compilation.
- `packages/fixtures`: upstream-shaped forms and submission verdicts.
- `examples/compare`: both renderers; its checkbox-group control is also tested.
- `docs/json-schema-contract.md` and `docs/compatibility.md`: behavior and gaps.

Use the pinned pnpm version. Workspace imports resolve to source; do not build
before each test run.

```bash
pnpm test content            # replace content with the relevant test filename
pnpm test:watch to-json-schema
pnpm verify:quick            # lint + types + tests without jsdom
pnpm verify                  # final gate; also checks renders, packed exports, example
```

Preserve public exports and diagnostic codes. Test changed behavior, not
constant spellings or wrapper calls. Submission-contract changes need parity
cases in the shared fixtures; renderer changes need real render assertions.
Keep comments for non-obvious semantics and upstream workarounds. Avoid adding
another abstraction or dependency without a concrete second use.
