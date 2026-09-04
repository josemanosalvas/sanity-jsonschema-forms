# Mapping: `@sanity/form-toolkit` → RJSF

What `toRjsf(form)` does with every part of a `form` document, verified
against `@sanity/form-toolkit` 3.0.17, `@rjsf/core`/`@rjsf/utils`/
`@rjsf/validator-ajv8`/`@rjsf/shadcn` 6.8.0.

The input type is form-toolkit's own `FormDataProps` (the only type it
exports). The output types are `RJSFSchema` and `UiSchema` from `@rjsf/utils`,
plus a `transformErrors` function typed for RJSF's prop of the same name.
Nothing in between is a type this package invented.

Legend: **direct** = same meaning on both sides; **lossy** = compiles, but
something the editor authored does not survive or changes meaning;
**impossible** = no RJSF-native place for it; the adapter drops it and reports
a diagnostic.

## Form level

| form-toolkit | JSON Schema | uiSchema | Status |
| --- | --- | --- | --- |
| `title` | `title` on the root object | | direct |
| `id.current` | nothing | nothing | not mapped on purpose: an AJV `$id` is cached by key and would collide when the same form is recompiled; callers already hold `form.id` |
| `fields[]` order | `properties` insertion order | `ui:order` (exact list, no `*`) | direct |
| `fields[].required` | root `required[]` | | direct for text/number/select/radio; see below for checkboxes |
| `submitButton.text` | | `ui:submitButtonOptions.submitText` | direct |
| `submitButton.position` | | | **lossy** (`info lossy-submit-position`): RJSF has no alignment option |

form-toolkit has no form description, success message, pages, or conditional
logic, so nothing about those is produced.

## Field types

Sixteen types exist in the Studio schema. Seven are compiled in this spike.

| form-toolkit type | JSON Schema | uiSchema | Status |
| --- | --- | --- | --- |
| `text` | `{type: "string"}` | `ui:placeholder` | direct |
| `textarea` | `{type: "string"}` | `ui:widget: "textarea"`, `ui:placeholder` | direct |
| `email` | `{type: "string", format: "email"}` | `ui:widget: "email"`, `ui:placeholder` | direct (validator-ajv8 bundles ajv-formats) |
| `number` | `{type: "number"}` | `ui:placeholder` | direct |
| `checkbox` without choices | `{type: "boolean"}`; when required also `enum: [true]` | | direct; see "Required" |
| `checkbox` with choices | `{type: "array", uniqueItems: true, items: {type: "string", enum}}` | `ui:widget: "checkboxes"`, `items: {ui:enumNames}` | direct |
| `select` | `{type: "string", enum}` | `ui:enumNames`, `ui:placeholder` | direct |
| `radio` | `{type: "string", enum}` | `ui:enumNames`, `ui:widget: "radio"`, `ui:optionValueFormat: "realValue"` | direct; the last option works around a theme bug, see "Theme notes" |
| `color`, `date`, `datetime-local`, `file`, `hidden`, `range`, `tel`, `time`, `url` | | | **not compiled in this spike** (`error unsupported-field-type`); known mappings below |
| custom type from `formSchema({fields})` | | | **impossible** (`error unknown-field-type`): only its author knows what it stores |

Mappings for the nine uncompiled types, for the record. All are direct or
lossy in the same way as the compiled ones; none is impossible:

| type | would compile to | note |
| --- | --- | --- |
| `url` | `string` + `format: "uri"` + `ui:widget: "uri"` | direct |
| `tel` | `string` + `ui:widget: "tel"` (no format) | direct |
| `hidden` | `string` + `ui:widget: "hidden"` | direct; value comes from `default` |
| `date` | `string` + `format: "date"` + `ui:widget: "date"` | direct; `minDate`/`maxDate` have no draft-07 keyword: **lossy** unless `formatMinimum`/`formatMaximum` are enabled in AJV |
| `datetime-local` | `string` + `format: "date-time"` + `ui:widget: "datetime"` | as `date` |
| `time` | `string` + `format: "time"` + `ui:widget: "time"` | direct |
| `range` | `number` + `minimum`/`maximum`/`multipleOf` + `ui:widget: "range"` | direct; `step` → `multipleOf` only if `minimum` is a multiple of it |
| `color` | `string` + `ui:widget: "color"` | direct |
| `file` | `string` + `format: "data-url"` + `ui:widget: "file"` + `ui:options.accept` | `maxSize` is **impossible** in JSON Schema (no keyword reads a data URL's byte length); `fileType` filters the picker only |

## Choice fields: why `enum` and not `oneOf`

`oneOf: [{const, title}]` is the schema-native way to label options, and RJSF
renders it. It is not used because RJSF's default-state computation
(`constAsDefaults`, on by default) treats a `const` inside a `oneOf` as a
default, so **the first choice is pre-selected and a required select passes
validation untouched**. `enum` values with labels in `ui:enumNames` have no
such behaviour and produce one AJV error (`enum`) instead of two (`const` +
`oneOf`). Labels therefore live in the uiSchema, which is fine for RJSF and
would need revisiting for a renderer that reads only the schema.

Choices are normalised: an option with no value is dropped, a repeated value
is dropped (both `warning invalid-choice`), an empty label falls back to the
value. A select/radio/checkbox-group with no usable choice is dropped
(`error missing-choices`).

## Field properties

| form-toolkit | JSON Schema | uiSchema | Status |
| --- | --- | --- | --- |
| `name` | property key | `ui:order` entry | direct; must match `/^[a-zA-Z][a-zA-Z0-9_-]*$/`, not be an `Object.prototype` name, and be unique (`error invalid-field-name` / `duplicate-field-name`) |
| `label` | `title` | | direct; missing label → `title = name` (`info missing-label`) |
| description | | | **form-toolkit has none** to map |
| `options.placeholder` | | `ui:placeholder` | direct for text, textarea, email, number, select; ignored for radio and checkbox (`info ignored-placeholder`) |
| `options.defaultValue` (string) | `default` | | text/textarea/email: as is. number: parsed, else `warning invalid-default-value`. select/radio: must be one of the choices. boolean: `"true"`/`"false"`. checkbox group: `info ignored-default-value` |
| `required` | see below | | |
| `validation[]` | see below | | |
| `_key` | | | not needed; RJSF keys by property name |

### Required

| field | how "required" is expressed | why |
| --- | --- | --- |
| text, textarea, email, number, select, radio | `required: [name]` | direct |
| lone checkbox | `required: [name]` **and** `enum: [true]` | `required` only checks presence; an unticked box is `false`, which is present. `const: true` would be pre-ticked by RJSF's `constAsDefaults`; `enum` is not. AJV's message for it is replaced by "This box must be checked." because form-toolkit has no authored message for required |
| checkbox group | `required: [name]` **and** `minItems: 1` (unless a `minSelectedCount` ≥ 1 exists) | RJSF defaults an array to `[]`, which is present |

The `ui:enumNames` labels for the lone checkbox are not needed; the widget
shows the field title.

### Validation rules

Every rule operand is stored as a string. The adapter parses it and drops the
rule with `warning invalid-validation-rule` if it does not fit the keyword.

| form-toolkit rule | JSON Schema keyword | applies to (Studio's own table) | Status |
| --- | --- | --- | --- |
| `minLength` | `minLength` (integer ≥ 0) | text, textarea | direct |
| `maxLength` | `maxLength` (integer ≥ 0) | text, textarea | direct |
| `pattern` | `pattern` (must compile as a `u`-flag regex, which is how AJV compiles it) | text, email | direct |
| `min` | `minimum` (number) | number | direct |
| `max` | `maximum` (number) | number | direct |
| `minSelectedCount` | `minItems` (integer ≥ 0) | checkbox group | direct |
| `maxSelectedCount` | `maxItems` (integer ≥ 0) | checkbox group | direct |
| `message` on any rule | — | — | JSON Schema has no message keyword and validator-ajv8 does not bundle ajv-errors. Carried through `transformErrors`, an RJSF prop, keyed by field and keyword. **Lossy only if the caller forgets to pass it.** |
| `minDate`, `maxDate`, `step`, `maxSize`, `fileType` | | date types, range, file | not reached: their field types are not compiled (`warning unsupported-validation-rule` if they appear on a compiled type) |
| a rule on a type the Studio does not offer it for | | | `warning inapplicable-validation-rule` |

## Diagnostics

`toRjsf` never throws on content. Everything it could not carry is in
`diagnostics`, in source order, each with the source position (`fields[i]`)
and the field name where known.

| code | severity | means |
| --- | --- | --- |
| `unsupported-field-type` | error | field type not compiled by this spike; field dropped |
| `unknown-field-type` | error | type absent or not one form-toolkit defines (custom type); field dropped |
| `invalid-field-name` | error | missing, malformed or reserved name; field dropped |
| `duplicate-field-name` | error | later field with a name already used; dropped |
| `missing-choices` | error | select/radio/checkbox group with no usable choice; dropped |
| `missing-label` | info | name used as title |
| `invalid-choice` | warning | choice without value or with a repeated value; choice dropped |
| `unsupported-validation-rule` | warning | rule type with no counterpart here; rule dropped |
| `inapplicable-validation-rule` | warning | rule type the Studio does not offer for this field type; rule dropped |
| `invalid-validation-rule` | warning | operand missing or unparsable; rule dropped |
| `invalid-default-value` | warning | default not a number / not a choice / not `true`/`false`; dropped |
| `ignored-default-value` | info | default on a checkbox group |
| `ignored-placeholder` | info | placeholder on radio or checkbox |
| `lossy-submit-position` | info | submit button alignment |

## Theme notes (`@rjsf/shadcn` 6.8.0)

Observed while rendering the compiled output; none is caused by the adapter.

- **Radio defaults were invisible.** `RadioWidget` passes the real value as
  the Radix group's `defaultValue` while encoding each item by index, so a
  default never showed as checked. `ui:optionValueFormat: "realValue"` on
  radio fields fixes it and is the one theme-motivated line in the output.
- **A required, empty select is outlined red before any interaction**
  (`FancySelect` adds `border-red-500` when `required && !selectedItem`).
  Cosmetic; other themes do not do this.
- **The prebuilt CSS is not exported.** The README says
  `import '@rjsf/shadcn/dist/default.css'`, but the package's `exports` map
  has no entry for it; the example imports it by relative path.
- **jsdom needs a `ResizeObserver` stub** to render Radix widgets in tests.

## What RJSF can express that `@sanity/form-toolkit` cannot author

Everything below is an RJSF or JSON Schema capability with no field in the
Studio schema to come from. An adapter cannot invent it.

- Field **descriptions** / help text (`description`, `ui:help`).
- **Conditional fields** (`if`/`then`/`else`, `dependencies`, `oneOf`
  branching): form-toolkit has no visibility logic.
- **Sections, pages, nesting**: `object` properties, `ui:order` groups,
  fieldsets. form-toolkit is one flat list.
- **Repeating groups / arrays of objects** with add/remove.
- **Constraints across fields** (`dependentRequired`, `allOf`).
- **Integer vs number**, `multipleOf`, `exclusiveMinimum/Maximum`.
- **Formats** beyond email: `uri`, `date`, `time`, `date-time`, `ipv4`, …
- **`readOnly`, `disabled`, `autofocus`, `autocomplete`, `rows`** and the
  rest of `ui:options`.
- **Custom widgets/fields/templates** per property.
- **Per-error messages in a schema-native way** — RJSF has none either, so
  this is parity; both sides need `transformErrors`.
- **Required message**: form-toolkit stores no message for "required".
- **Enum labels in the schema** (`oneOf`/`const`/`title`) — deliberately not
  used, see above.

## GROQ

The example uses a fixture with the document shape the Studio plugin stores.
To fetch a real one:

```groq
*[_type == "form" && id.current == $id][0]{
  title, id, submitButton,
  fields[]{_key, type, label, name, required, validation, options, choices}
}
```

`id.current` is the slug the `formSchema` plugin generates from the title.
