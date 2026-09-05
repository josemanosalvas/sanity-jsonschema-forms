# sanity-jsonschema-forms

Compile a form authored in Sanity Studio with
[`@sanity/form-toolkit`](https://www.npmjs.com/package/@sanity/form-toolkit)
into JSON Schema, and render it with react-jsonschema-form or JSON Forms
through thin adapters.

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
```

- `schema` is [JSON Schema Draft 7](https://json-schema.org/draft-07), declared by its `$schema` and valid on its own; validate submissions against it on the server with AJV.
- `messages` carries the error messages editors wrote, keyed by field and AJV keyword; each adapter delivers them its own way.
- `diagnostics` lists everything the compiler could not carry. It never throws on content.

Inspect diagnostics before accepting submissions: dropped fields and lossy
rules are not enforced by the generated schema.

Fifteen of form-toolkit's sixteen built-in field types compile; `file` is
deferred until a submission representation for it is settled. A rule
Draft 7 cannot carry (a date bound,
a range step that does not count from zero) is reported, never encoded as
a validator extension.

Using the root entry needs no renderer dependencies; the adapters' peers are
optional. The form document is typed structurally, so `@sanity/form-toolkit`
need not be installed where the form is rendered. `./rjsf` needs
`@rjsf/utils` (types only), `./jsonforms` needs `@jsonforms/core` (types only). Neither adapter imports
a renderer at runtime.

Documentation, examples and the design record:
https://github.com/josemanosalvas/sanity-jsonschema-forms

Status: `0.x`, experimental. Not affiliated with Sanity.io. MIT.
