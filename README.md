# sanity-rjsf (spike)

Compile forms authored with [`@sanity/form-toolkit`](https://www.npmjs.com/package/@sanity/form-toolkit)
into what [react-jsonschema-form](https://rjsf-team.github.io/react-jsonschema-form/) (RJSF)
renders and validates, without a second form model in between.

```
Sanity Studio → @sanity/form-toolkit → form document → sanity-rjsf → RJSFSchema + UiSchema → @rjsf/shadcn
```

```ts
import {toRjsf} from 'sanity-rjsf'

const {schema, uiSchema, transformErrors, diagnostics} = toRjsf(form)
// form: FormDataProps from '@sanity/form-toolkit/form-renderer'
// schema: RJSFSchema, uiSchema: UiSchema from '@rjsf/utils'
```

```tsx
<Form schema={schema} uiSchema={uiSchema} validator={validator} transformErrors={transformErrors} />
```

`@sanity/form-toolkit` owns authoring. `sanity-rjsf` compiles that document
into RJSF-native structures and reports what it could not carry. RJSF owns
rendering, widgets, themes, state and validation.

## Layout

| Path | What |
| --- | --- |
| [`packages/sanity-rjsf`](packages/sanity-rjsf) | the package: one function, `toRjsf`, and its tests |
| [`examples/rjsf-shadcn`](examples/rjsf-shadcn) | Vite app rendering a compiled form with `@rjsf/shadcn` and `@rjsf/validator-ajv8` |
| [`docs/mapping.md`](docs/mapping.md) | every mapping: schema, uiSchema, unsupported, lossy, and what RJSF can do that form-toolkit cannot author |
| [`docs/assessment.md`](docs/assessment.md) | the technical assessment this spike was run for |

## Run

```bash
pnpm install
pnpm test        # unit tests: compile output, AJV validation, shadcn render (jsdom)
pnpm build       # packages/sanity-rjsf/dist
pnpm dev         # examples/rjsf-shadcn on http://localhost:5173
```

## Scope

Field types compiled: `text`, `textarea`, `email`, `number`, `checkbox`
(boolean or group), `select`, `radio`. Properties mapped: label, placeholder,
required, default value, choices, min/max, min/max length, pattern, per-rule
error messages, submit button text. Everything else is dropped with a
diagnostic; see the mapping document for the full table.

Types: the input is form-toolkit's `FormDataProps`; the output uses
`RJSFSchema` and `UiSchema` from `@rjsf/utils`. `@sanity/form-toolkit` is a
type-only peer dependency, so nothing from it (or from Sanity) reaches the
runtime bundle.

Not a Sanity.io project. Versions pinned in this spike: `@sanity/form-toolkit`
3.0.17, RJSF 6.8.0.
