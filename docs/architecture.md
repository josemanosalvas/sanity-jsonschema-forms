# Architecture

`toJsonSchema(form)` compiles `@sanity/form-toolkit` documents into
`{schema, messages, diagnostics}`. The schema defines submission validation;
the RJSF and JSON Forms adapters supply presentation.

| Responsibility | Location |
| --- | --- |
| Field types, name checks, choice-field classification | `src/internal/field.ts` |
| Draft 7 schema, validation rules, defaults, diagnostics | `src/to-json-schema.ts` |
| Accepted fields' source types and placeholders | `src/internal/fields.ts` |
| Widgets, layout, message delivery, renderer quirks | `src/rjsf.ts`, `src/jsonforms.ts` |

Paths above are relative to `packages/sanity-jsonschema-forms`.

## Boundaries

- The compiler emits standard Draft 7 keywords. Authored error messages
  live beside the schema because JSON Schema has no keyword for them.
- Adapters pass the schema through by reference. They use the shared field
  classifier so a dropped field cannot supply a surviving namesake's widget.
- Field classification has no dependency on the compiler. An adapter-only
  client need not load compilation code or default-validation regexes.
- All renderer imports are types only. Each adapter's optional peer supplies
  its public types; importing an adapter executes no renderer code.
- Compilation is pure and uncached. Compile once per form revision, keep the
  result stable during rendering, and reuse the server's AJV validator.

The existing schema and two presentation facts (input type and placeholder)
serve both renderers. Add a shared abstraction only when a concrete capability
cannot fit those structures. A third adapter alone is not such evidence.

## Scope

This package translates the authoring model; it does not provide a Studio
builder, submission endpoint, upload service, or spam protection. Its adapters
consume its flat compiled schemas, not arbitrary JSON Schema documents.

See the [contract](json-schema-contract.md) for data semantics and
[compatibility](compatibility.md) for renderer and authoring gaps. Earlier
experiments remain tagged `rjsf-spike-v1`, `json-schema-spike-v2`, and
`surveyjs-spike-v3`.
