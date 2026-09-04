# `sanity-jsonschema-forms/jsonforms`

```tsx
import {JsonForms} from '@jsonforms/react'
import {vanillaCells, vanillaRenderers} from '@jsonforms/vanilla-renderers'
import {toJsonSchema} from 'sanity-jsonschema-forms'
import {toJsonFormsProps} from 'sanity-jsonschema-forms/jsonforms'

const compiled = toJsonSchema(form)
const {schema, uischema, translate, initialData, submitText} = toJsonFormsProps(form, compiled)

<JsonForms schema={schema} uischema={uischema} data={initialData} renderers={vanillaRenderers} cells={vanillaCells} i18n={{translate}} />
```

Peer: `@jsonforms/core` `^3.8.0` (runtime: `createDefaultValue`). Tested with
`@jsonforms/*` 3.8.0 and the vanilla renderer set.

## What it returns

| member | contents |
| --- | --- |
| `schema` | `compiled.schema`, unchanged, typed as `JsonSchema7` |
| `uischema` | one `VerticalLayout` of `Control`s with `i18n: <field>` and `options` (`multi`, `format: 'radio'`, `format: 'time'`, `slider: true`, `placeholder`); no control for a `hidden` field |
| `translate` | answers `<field>.error.<keyword>` with the editor's message; returns the default for every other key |
| `initialData` | the schema's `default`s as a data object, hidden fields included |
| `submitText` | the form's submit label; JSON Forms renders no button |

## Field types (vanilla renderers)

| source type | control | note |
| --- | --- | --- |
| `url`, `tel`, `color` | text cell | the vanilla set has no url, tel or colour cell; the schema still validates (`format: uri`, the colour pattern). A custom cell can test on `format`/`pattern` or on the uischema |
| `hidden` | none | JSON Forms renders only what the layout lists. The value is in `initialData`, so it is submitted and validated with the rest; the host must pass `initialData` as `data` |
| `date` | `DateCell` (native `date` input) | picked from `format: date` |
| `datetime-local` | text cell | the vanilla `DateTimeCell` appends `:00.000Z` to what the user picks, which the schema's pattern rejects, so the adapter does not ask for it. A custom cell that keeps the native value can test on the uischema scope or the pattern |
| `time` | `TimeCell` (native `time` input) | asked for with `options.format: 'time'`; the cell appends `:00`, which the pattern accepts |
| `range` | `SliderCell` (native `range` input) | asked for with `options.slider: true`; the cell's tester also needs `minimum`, `maximum` and `default` in the schema, so a range without a default or without both bounds renders as a number input |

## Things to know

- **Defaults are not applied by JSON Forms.** Its AJV runs without
  `useDefaults`, so a schema `default` is inert until the host seeds data.
  Pass `initialData` as `data`. A hidden field's value exists nowhere else.
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
