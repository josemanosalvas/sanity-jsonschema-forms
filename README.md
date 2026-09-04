# sanity-jsonschema-forms

Standards-based form authoring for Sanity. Editors build a form in Sanity
Studio with [`@sanity/form-toolkit`](https://www.npmjs.com/package/@sanity/form-toolkit);
`sanity-jsonschema-forms` compiles that document into JSON Schema and ships thin
adapters for schema-driven form libraries.

```mermaid
flowchart LR
  form["@sanity/form-toolkit<br>form document"] --> compile["toJsonSchema(form)"]
  compile --> out["{ schema, messages, diagnostics }"]
  out --> rjsf["sanity-jsonschema-forms/rjsf"] --> RJSF["react-jsonschema-form"]
  out --> jsonforms["sanity-jsonschema-forms/jsonforms"] --> JF["JSON Forms"]
  out --> surveyjs["sanity-jsonschema-forms/surveyjs"] --> SJ["SurveyJS"]
```

The JSON Schema is the contract. It is [JSON Schema Draft 7](https://json-schema.org/draft-07)
and says so in its `$schema`, so it validates on its own with any validator
that supports that draft, every adapter consumes it unchanged, and the server
validates submissions against it whatever rendered the form.

## Install

```bash
pnpm add sanity-jsonschema-forms
```

Then the form library of your choice. The root entry has no peer
dependencies; each adapter's peers are listed in [docs/adapters](docs/adapters).

## Use

```ts
import {toJsonSchema} from 'sanity-jsonschema-forms'

const form = await client.fetch(
  `*[_type == "form" && id.current == $id][0]{
    title, id, submitButton,
    fields[]{_key, type, label, name, required, validation, options, choices}
  }`,
  {id: 'contact'},
)

const compiled = toJsonSchema(form)
const {schema, messages, diagnostics} = compiled
```

`form` is the document as `@sanity/form-toolkit` stores it. The package
types it structurally, so the frontend does not need `@sanity/form-toolkit`
installed. `diagnostics` lists every field, rule or value the compiler could
not carry, with its position in the source document; the compiler never
throws on content.

Then one of:

```tsx
import {toRjsfProps} from 'sanity-jsonschema-forms/rjsf'

const {schema, uiSchema, formProps, transformErrors} = toRjsfProps(form, compiled)
<Form {...formProps} schema={schema} uiSchema={uiSchema} validator={validator} transformErrors={transformErrors} />
```

```tsx
import {toJsonFormsProps} from 'sanity-jsonschema-forms/jsonforms'

const {schema, uischema, translate, initialData} = toJsonFormsProps(form, compiled)
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

## Documentation

- [docs/architecture.md](docs/architecture.md): the decisions. The contract,
  the compiler output, what adapters may do, server-side validation, and why
  there is no intermediate form model.
- [docs/json-schema-contract.md](docs/json-schema-contract.md): exactly what
  the schema and the message map contain, and why Draft 7.
- [docs/compatibility.md](docs/compatibility.md): versions tested, supported
  and planned field types, diagnostic codes.
- [docs/adapters/](docs/adapters): per-library usage and the quirks each
  adapter handles.

## Repository

```
packages/sanity-jsonschema-forms/  the package
packages/fixtures/                 private: form documents and submissions used by tests
examples/compare/                  one compiled form rendered by all three adapters
docs/
```

```bash
pnpm install
pnpm test      # compiler, plain AJV, RJSF, JSON Forms and SurveyJS renders
pnpm verify    # everything CI runs: lint, typecheck, test, build, example, publint
pnpm dev       # examples/compare on http://localhost:5174
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Status: `0.x`, experimental; the
public API may change between minor versions until `1.0`. Not affiliated
with Sanity.io. MIT.
