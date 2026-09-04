# Architecture

`sanity-json-schema` compiles a form authored in Sanity Studio with
[`@sanity/form-toolkit`](https://www.npmjs.com/package/@sanity/form-toolkit)
into JSON Schema, and ships thin adapters that let schema-driven form
libraries render and validate it.

```
Sanity Studio → @sanity/form-toolkit → form document
                                            │
                                     toJsonSchema(form)
                                            │
                              {schema, messages, diagnostics}
                                            │
                    ┌───────────────────────┼───────────────────────┐
             ./rjsf → RJSF          ./jsonforms → JSON Forms    ./surveyjs → SurveyJS
                    └───────────────────────┼───────────────────────┘
                                            │
                          submission → AJV against `schema` (server)
```

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| **Authoring** | `@sanity/form-toolkit`'s `form` document, typed by its own `FormDataProps` | This package adds no authoring type. What the Studio can author is the ceiling; see [compatibility.md](compatibility.md). |
| **Canonical contract** | JSON Schema draft-07 | Validates on its own with any draft-07 validator and is read natively by every consumer tried. Details in [json-schema-contract.md](json-schema-contract.md). |
| **Compiler output** | `schema`, `messages`, `diagnostics` | Editor-written error messages have no JSON Schema keyword, so they travel beside the schema keyed by field and AJV keyword. Everything that could not map one-to-one is a diagnostic; the compiler never throws on content. |
| **Renderer and runtime concerns** | subpath adapters (`./rjsf`, `./jsonforms`, `./surveyjs`) | Each adds only what its library needs to present the schema: widget choice, placeholder, submit label, message delivery, and the library's own quirks. The schema passes through unchanged. Renderer dependencies are optional peers; the root entry has none. |
| **Submission validation** | AJV against `schema`, server-side, whatever rendered the form | Renderers validate what their widgets can produce, not arbitrary payloads. SurveyJS, for one, accepts duplicate checkbox values and off-list dropdown values that the schema rejects. |
| **Intermediate `FormDefinition` model** | **deliberately rejected** | Three consumers of very different shape (RJSF, JSON Forms, SurveyJS) consumed the same schema and message map through adapters of 60 to 140 lines plus one 45-line internal helper carrying two presentation facts per field. No behaviour shared by two consumers exists outside JSON Schema. See [research/](research/). |

## What an adapter is allowed to do

- Read `compiled.schema` and `compiled.messages`.
- Read the original form **only** for what JSON Schema cannot carry and is
  purely presentational: which input the editor chose where two types share
  one schema (`textarea`/`text`, `radio`/`select`), the placeholder, the
  submit label. All three adapters get these through
  `src/internal/fields.ts`, which is not exported.
- Return its library's native structures and nothing invented: RJSF
  `uiSchema` and `<Form>` props, JSON Forms `uischema` and `i18n` hooks,
  SurveyJS survey JSON.

An adapter must not rewrite the schema, and must not derive anything from
another adapter's output.

## Adding a capability

New authoring capabilities enter through the compiler, as JSON Schema,
and each adapter derives its own mechanism from the schema the way choice
labels derive from `oneOf`. The first candidate is conditional visibility
(`if`/`then`/`else`), which all three consumers can express and the Studio
cannot yet author. A capability that only one consumer can read does not
belong in the contract; it belongs in that adapter, behind an option.

## Layout

```
packages/sanity-json-schema/   the published package
  src/to-json-schema.ts        compiler
  src/rjsf.ts                  ./rjsf
  src/jsonforms.ts             ./jsonforms
  src/surveyjs.ts              ./surveyjs
  src/internal/fields.ts       presentation facts shared by adapters (not exported)
packages/fixtures/             private: form documents and submissions used by tests
examples/compare/              one compiled form rendered by all three adapters
docs/                          this file, the contract, compatibility, per-adapter notes, research
```
