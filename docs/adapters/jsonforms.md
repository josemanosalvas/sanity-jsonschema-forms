# `sanity-jsonschema-forms/jsonforms`

```tsx
import {JsonForms} from '@jsonforms/react'
import {vanillaCells, vanillaRenderers} from '@jsonforms/vanilla-renderers'
import {toJsonSchema} from 'sanity-jsonschema-forms'
import {toJsonFormsProps} from 'sanity-jsonschema-forms/jsonforms'

const compiled = toJsonSchema(form)
const {schema, uischema, translate, initialData, submitText} = toJsonFormsProps(form, compiled)

<JsonForms schema={schema} uischema={uischema} data={initialData} renderers={renderers} cells={vanillaCells} i18n={{translate}} />
```

Peer: `@jsonforms/core` 3.8.0 (runtime: `createDefaultValue`). Tested with
`@jsonforms/*` 3.8.0 and the vanilla renderer set.

## What it returns

| member | contents |
| --- | --- |
| `schema` | `compiled.schema`, unchanged, typed as `JsonSchema7` |
| `uischema` | one `VerticalLayout` of `Control`s with `i18n: <field>` and `options` (`multi`, `format: 'radio'`, `placeholder`) |
| `translate` | answers `<field>.error.<keyword>` with the editor's message; returns the default for every other key |
| `initialData` | the schema's `default`s as a data object |
| `submitText` | the form's submit label; JSON Forms renders no button |

## Things to know

- **Defaults are not applied by JSON Forms.** Its AJV runs without
  `useDefaults`, so a schema `default` is inert until the host seeds data.
  Pass `initialData` as `data`.
- **Labels come from the schema.** JSON Forms reads `oneOf[].title`; nothing
  in the uischema carries labels.
- **Messages travel through `i18n.translate`.** Every control carries
  `i18n: <field>`, which makes JSON Forms ask for
  `<field>.error.<keyword>`. The translator must return the default for any
  other key or labels blank out; `translate` does.
- **The vanilla renderer set has no control for an array of enums**, so a
  checkbox group renders as "unknown". `examples/compare/src/checkbox-group-control.tsx`
  is a 40-line renderer with a tester you can register through `renderers`.
- **Required errors** sit on the object and use JSON Forms' wording ("is a
  required property"); form-toolkit has no message for "required".
- Validation runs on every change. Use `validationMode="ValidateAndHide"`
  until the first submit attempt if you prefer errors on submit.
