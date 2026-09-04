# `sanity-json-schema/rjsf`

```tsx
import Form from '@rjsf/shadcn'          // or any RJSF theme
import validator from '@rjsf/validator-ajv8'
import {toJsonSchema} from 'sanity-json-schema'
import {toRjsfProps} from 'sanity-json-schema/rjsf'

const compiled = toJsonSchema(form)
const {schema, uiSchema, formProps, transformErrors} = toRjsfProps(form, compiled)

<Form {...formProps} schema={schema} uiSchema={uiSchema} validator={validator} transformErrors={transformErrors} />
```

Peer: `@rjsf/utils` (types only). Tested with `@rjsf/*` 6.8.0.

## What it returns

| member | contents |
| --- | --- |
| `schema` | `compiled.schema`, unchanged, typed as `RJSFSchema` |
| `uiSchema` | `ui:order`; `ui:widget` (`textarea`, `email`, `radio`, `checkboxes`); `ui:placeholder`; `ui:submitButtonOptions.submitText`; `ui:optionValueFormat: 'realValue'` on radios |
| `formProps` | `experimental_defaultFormStateBehavior: {constAsDefaults: 'never'}` |
| `transformErrors` | swaps AJV's message for the editor's, matched on `error.property` and `error.name` |

## Why `formProps` is required

RJSF computes default form state from the schema and, by default, treats a
`const` as a default. With `oneOf: [{const, title}]` labels that pre-selects
the first choice, which lets a required select pass untouched; with
`const: true` on a required checkbox it pre-ticks the box. `constAsDefaults:
'never'` turns both off. Spread `formProps` onto `<Form>`.

## Theme notes (`@rjsf/shadcn` 6.8.0)

- Its `RadioWidget` passes the real value as the Radix group default while
  encoding items by index, so a default never shows as checked.
  `ui:optionValueFormat: 'realValue'` fixes it; it is harmless elsewhere.
- A required, empty select is outlined red before any interaction.
- The prebuilt CSS is not in the package's `exports` map; import it by
  relative path (see `examples/compare/src/styles.css`).
- In jsdom, Radix needs a `ResizeObserver` stub.

## Errors

An off-list value fails every `oneOf` branch `const` and then the `oneOf`,
so RJSF shows n+1 errors for one bad value. Only tampering can produce it.
