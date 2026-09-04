# `sanity-jsonschema-forms/rjsf`

```tsx
import Form from '@rjsf/shadcn'          // or any RJSF theme
import validator from '@rjsf/validator-ajv8'
import {toJsonSchema} from 'sanity-jsonschema-forms'
import {toRjsfProps} from 'sanity-jsonschema-forms/rjsf'

const compiled = toJsonSchema(form)
const {schema, uiSchema, formProps, transformErrors} = toRjsfProps(form, compiled)

<Form {...formProps} schema={schema} uiSchema={uiSchema} validator={validator} transformErrors={transformErrors} />
```

Peer: `@rjsf/utils` (types only). Tested with `@rjsf/*` 6.8.0.

## What it returns

| member | contents |
| --- | --- |
| `schema` | `compiled.schema`, unchanged, typed as `RJSFSchema` |
| `uiSchema` | `ui:order`; `ui:widget` (`textarea`, `email`, `uri`, `hidden`, `date`, `range`, `color`, `radio`, `checkboxes`); `ui:options.inputType` (`tel`, `datetime-local`, `time`); `ui:placeholder`; `ui:submitButtonOptions.submitText`; `ui:optionValueFormat: 'realValue'` on radios |
| `formProps` | `experimental_defaultFormStateBehavior: {constAsDefaults: 'never'}` |
| `transformErrors` | swaps AJV's message for the editor's, matched on `error.property` and `error.name` |

## Why `formProps` is required

RJSF computes default form state from the schema and, by default, treats a
`const` as a default. With `oneOf: [{const, title}]` labels that pre-selects
the first choice, which lets a required select pass untouched; with
`const: true` on a required checkbox it pre-ticks the box. `constAsDefaults:
'never'` turns both off. Spread `formProps` onto `<Form>`.

## Field types

| source type | control | note |
| --- | --- | --- |
| `url` | `URLWidget` (native `url` input) | RJSF would pick it from `format: uri` on its own; the adapter names it |
| `tel` | text widget with `inputType: tel` | RJSF has no tel widget; the input type is enough |
| `hidden` | `HiddenWidget` | the default is seeded by RJSF's form state and submitted; no label, no error slot |
| `date` | `DateWidget` (native `date` input) | value `YYYY-MM-DD`, untouched |
| `datetime-local` | text widget with `inputType: datetime-local` | **not** RJSF's `DateTimeWidget`, which converts to UTC and submits `...:00.000Z`; the schema's pattern rejects a timezone. The native local value goes through untouched |
| `time` | text widget with `inputType: time` | **not** RJSF's `TimeWidget`, which appends `:00`; harmless for the schema, but the native value is the contract |
| `range` | `RangeWidget` | `@rjsf/shadcn` renders a Radix slider with `min`/`max`/`step` from `minimum`/`maximum`/`multipleOf`. Without a `default` the slider has no value until moved, and a required range then fails on submit |
| `color` | `ColorWidget` (native `color` input) | value always lowercase |

## Theme notes (`@rjsf/shadcn` 6.8.0)

- Its `RadioWidget` passes the real value as the Radix group default while
  encoding items by index, so a default never shows as checked.
  `ui:optionValueFormat: 'realValue'` fixes it; it is harmless elsewhere.
- A required, empty select is outlined red before any interaction.
- The prebuilt CSS is not in the package's `exports` map; import it by
  relative path (see `examples/compare/src/styles.css`).
- In jsdom, Radix needs a `ResizeObserver` stub.
- The widgets RJSF's core theme supplies (`URLWidget`, `HiddenWidget`,
  `DateWidget`, `ColorWidget`) render through shadcn's `BaseInputTemplate`;
  only `RangeWidget` is shadcn's own.

## Errors

An off-list value fails every `oneOf` branch `const` and then the `oneOf`,
so RJSF shows n+1 errors for one bad value. Only tampering can produce it.
The compiler's own patterns (`datetime-local`, `time`, `color`) have no
authored message, so their errors read as AJV's "must match pattern"; a
native input makes them unreachable in the browser.
