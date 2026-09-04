# sanity-jsonschema-forms

Experimental standards-based form authoring for Sanity using
[`@sanity/form-toolkit`](https://www.npmjs.com/package/@sanity/form-toolkit),
JSON Schema, and adapters for schema-driven form libraries. Nothing here is
published; the repository is a sequence of spikes, each preserved by a tag.

Repository: https://github.com/josemanosalvas/sanity-jsonschema-forms
(formerly `sanity-rjsf`).

**Spike 1** (`sanity-rjsf`, tag `rjsf-spike-v1`, frozen) compiled straight to
RJSF and found the mapping mostly direct, with a few RJSF-specific compromises.

**Spike 2** (`sanity-json-schema`) asks whether a renderer-independent JSON
Schema can be extracted instead, with RJSF and JSON Forms as thin presentation
adapters on top:

```
Sanity Studio → @sanity/form-toolkit → form document → toJsonSchema() → JSON Schema + messages
                                                                          ├── sanity-json-schema/rjsf      → @rjsf/shadcn
                                                                          └── sanity-json-schema/jsonforms → @jsonforms/vanilla-renderers
```

```ts
import {toJsonSchema} from 'sanity-json-schema'
import {toRjsfProps} from 'sanity-json-schema/rjsf'
import {toJsonFormsProps} from 'sanity-json-schema/jsonforms'

const compiled = toJsonSchema(form)                       // {schema, messages, diagnostics}
const {schema, uiSchema, formProps, transformErrors} = toRjsfProps(form, compiled)
const {uischema, translate, initialData, submitText} = toJsonFormsProps(form, compiled)
```

`@sanity/form-toolkit` owns authoring. `toJsonSchema` compiles that document
into draft-07 JSON Schema and reports what it could not carry. Each adapter
adds only what its renderer needs to present it. The renderer owns widgets,
themes, state and validation.

## Layout

| Path | What |
| --- | --- |
| [`packages/sanity-json-schema`](packages/sanity-json-schema) | spike 2: `toJsonSchema`, the `./rjsf` and `./jsonforms` adapters, and their tests |
| [`packages/sanity-rjsf`](packages/sanity-rjsf) | spike 1, frozen: `toRjsf` and its tests |
| [`packages/fixtures`](packages/fixtures) | the form documents and submissions every compiler is tested against |
| [`examples/compare`](examples/compare) | Vite app rendering one compiled form through `@rjsf/shadcn` and JSON Forms side by side |
| [`examples/rjsf-shadcn`](examples/rjsf-shadcn) | spike 1's example, kept as is |
| [`docs/json-schema-contract.md`](docs/json-schema-contract.md) | what the schema and message map contain and what is deliberately out |
| [`docs/assessment-2.md`](docs/assessment-2.md) | spike 2's assessment: renderer independence, what each adapter needed, the JSON Forms comparison |
| [`docs/mapping.md`](docs/mapping.md) | spike 1's mapping tables |
| [`docs/assessment.md`](docs/assessment.md) | spike 1's assessment |

## Run

```bash
git clone https://github.com/josemanosalvas/sanity-jsonschema-forms.git
cd sanity-jsonschema-forms
pnpm install
pnpm test          # both packages: compile output, AJV, RJSF and JSON Forms renders (jsdom), parity
pnpm build         # both packages' dist
pnpm dev:compare   # examples/compare on http://localhost:5174
pnpm dev           # examples/rjsf-shadcn on http://localhost:5173
```

## Scope

Field types compiled: `text`, `textarea`, `email`, `number`, `checkbox`
(boolean or group), `select`, `radio`. Properties mapped: label, placeholder,
required, default value, choices, min/max, min/max length, pattern, per-rule
error messages, submit button text. Everything else is dropped with a
diagnostic; see the mapping document for the full table.

Types: the input is form-toolkit's `FormDataProps`; the schema is
`JSONSchema7`; adapters use `@rjsf/utils` and `@jsonforms/core` types. All
three are type-level peers except `@jsonforms/core`, whose `createDefaultValue`
the JSON Forms adapter calls.

Not a Sanity.io project. Versions pinned: `@sanity/form-toolkit` 3.0.17,
RJSF 6.8.0, JSON Forms 3.8.0.
