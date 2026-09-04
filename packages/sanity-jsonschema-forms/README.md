# sanity-jsonschema-forms

Compile a form authored in Sanity Studio with
[`@sanity/form-toolkit`](https://www.npmjs.com/package/@sanity/form-toolkit)
into JSON Schema, and render it with react-jsonschema-form, JSON Forms or
SurveyJS through thin adapters.

```bash
pnpm add sanity-jsonschema-forms
```

```ts
import {toJsonSchema} from 'sanity-jsonschema-forms'

const {schema, messages, diagnostics} = toJsonSchema(form) // form: the @sanity/form-toolkit document
```

```ts
import {toRjsfProps} from 'sanity-jsonschema-forms/rjsf'
import {toJsonFormsProps} from 'sanity-jsonschema-forms/jsonforms'
import {toSurveyJsProps} from 'sanity-jsonschema-forms/surveyjs'
```

- `schema` is [JSON Schema Draft 7](https://json-schema.org/draft-07), declared by its `$schema` and valid on its own; validate submissions against it on the server with AJV.
- `messages` carries the error messages editors wrote, keyed by field and AJV keyword; each adapter delivers them its own way.
- `diagnostics` lists everything the compiler could not carry. It never throws on content.

The root entry has no runtime dependencies and no peers; the form document is
typed structurally, so `@sanity/form-toolkit` need not be installed where the
form is rendered. `./rjsf` needs `@rjsf/utils` (types only), `./jsonforms`
uses `@jsonforms/core` at runtime, `./surveyjs` emits plain survey JSON.

Documentation, examples and the design record:
https://github.com/josemanosalvas/sanity-jsonschema-forms

Status: `0.x`, experimental. Not affiliated with Sanity.io. MIT.
