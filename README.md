# sanity-jsonschema-forms

Standards-based form authoring for Sanity. Editors build a form in Sanity
Studio with [`@sanity/form-toolkit`](https://www.npmjs.com/package/@sanity/form-toolkit);
`sanity-jsonschema-forms` compiles that document into JSON Schema and ships thin
adapters for schema-driven form libraries.

```
Sanity Studio → @sanity/form-toolkit → form document → toJsonSchema() → JSON Schema + messages
                                                                          ├── sanity-jsonschema-forms/rjsf      → react-jsonschema-form
                                                                          ├── sanity-jsonschema-forms/jsonforms → JSON Forms
                                                                          └── sanity-jsonschema-forms/surveyjs  → SurveyJS
```

The JSON Schema is the contract. It validates on its own with any draft-07
validator, every adapter consumes it unchanged, and the server validates
submissions against it whatever rendered the form.

## Install

```bash
pnpm add sanity-jsonschema-forms
```

Then the form library of your choice; each adapter's peers are optional and
documented in [docs/adapters](docs/adapters).

## Use

```ts
import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'
import {toJsonSchema} from 'sanity-jsonschema-forms'

const form: FormDataProps = await client.fetch(
  `*[_type == "form" && id.current == $id][0]{
    title, id, submitButton,
    fields[]{_key, type, label, name, required, validation, options, choices}
  }`,
  {id: 'contact'},
)

const {schema, messages, diagnostics} = toJsonSchema(form)
```

Then one of:

```tsx
import {toRjsfProps} from 'sanity-jsonschema-forms/rjsf'
const {uiSchema, formProps, transformErrors} = toRjsfProps(form, compiled)
<Form {...formProps} schema={schema} uiSchema={uiSchema} validator={validator} transformErrors={transformErrors} />
```

```tsx
import {toJsonFormsProps} from 'sanity-jsonschema-forms/jsonforms'
const {uischema, translate, initialData} = toJsonFormsProps(form, compiled)
<JsonForms schema={schema} uischema={uischema} data={initialData} i18n={{translate}} renderers={renderers} cells={cells} />
```

```tsx
import {toSurveyJsProps} from 'sanity-jsonschema-forms/surveyjs'
const {surveyJson} = toSurveyJsProps(form, compiled)
<Survey model={new Model(surveyJson)} />
```

And on the server:

```ts
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv({allErrors: true})
addFormats(ajv)
const valid = ajv.validate(schema, submission)
```

`diagnostics` lists every field, rule or value the compiler could not carry,
with the position in the source document. It never throws on content.

## Documentation

| | |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | the decisions: contract, compiler output, adapters, server-side validation, no intermediate model |
| [docs/json-schema-contract.md](docs/json-schema-contract.md) | exactly what the schema and message map contain |
| [docs/compatibility.md](docs/compatibility.md) | versions tested, supported and planned field types, diagnostic codes |
| [docs/adapters/](docs/adapters) | per-library usage and the quirks each adapter handles |

## Repository

```
packages/sanity-jsonschema-forms/   the package
packages/fixtures/             private: form documents and submissions used by tests
examples/compare/              one compiled form rendered by all three adapters
docs/
```

```bash
pnpm install
pnpm test        # compiler, plain AJV, RJSF, JSON Forms and SurveyJS renders
pnpm build
pnpm dev         # examples/compare on http://localhost:5174
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Status: `0.x`, experimental; the
public API may change between minor versions until `1.0`. Not affiliated
with Sanity.io. MIT.
