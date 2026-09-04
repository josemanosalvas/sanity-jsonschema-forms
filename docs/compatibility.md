# Compatibility

## Versions tested

| Library | Version | Role |
| --- | --- | --- |
| `@sanity/form-toolkit` | 3.0.17 | authoring; development-only, its `FormDataProps` is checked against this package's structural input type |
| `ajv` + `ajv-formats` | 8.20 / 2.1 | Draft 7 validation in tests and on the server |
| `@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`, `@rjsf/shadcn` | 6.8.0 | `./rjsf` |
| `@jsonforms/core`, `@jsonforms/react`, `@jsonforms/vanilla-renderers` | 3.8.0 | `./jsonforms` |
| `survey-core`, `survey-react-ui` | 3.0.3 | `./surveyjs` |
| Node | 20 or later | running the package |
| Node | 22.12 or later | developing it (build and test tooling) |

## Field types

`@sanity/form-toolkit`'s `formSchema` plugin offers sixteen field types.
Seven compile today. The rest are dropped with `error unsupported-field-type`
and are the first items on the roadmap; their mappings are settled.

| form-toolkit type | status | JSON Schema |
| --- | --- | --- |
| `text` | supported | `string` |
| `textarea` | supported | `string` (input choice is presentation) |
| `email` | supported | `string` + `format: email` |
| `number` | supported | `number` |
| `checkbox` (no choices) | supported | `boolean`; `const: true` when required |
| `checkbox` (with choices) | supported | `array` of `string` `oneOf`, `uniqueItems` |
| `select`, `radio` | supported | `string` `oneOf` (widget choice is presentation) |
| `url` | planned | `string` + `format: uri` |
| `tel` | planned | `string` |
| `hidden` | planned | `string`, value from `default` |
| `date` | planned | `string` + `format: date`; `minDate`/`maxDate` need AJV's `formatMinimum`/`formatMaximum` |
| `datetime-local` | planned | `string` + `format: date-time`, as `date` |
| `time` | planned | `string` + `format: time` |
| `range` | planned | `number` + `minimum`/`maximum`/`multipleOf` |
| `color` | planned | `string` |
| `file` | planned | `string` + `format: data-url`; `maxSize` has no JSON Schema keyword and stays server-side |
| custom types from `formSchema({fields})` | never | opaque to this package (`error unknown-field-type`) |

## Validation rules

| form-toolkit rule | keyword | supported |
| --- | --- | --- |
| `minLength`, `maxLength`, `pattern`, `min`, `max`, `minSelectedCount`, `maxSelectedCount` | `minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `minItems`, `maxItems` | yes |
| `minDate`, `maxDate`, `step`, `maxSize`, `fileType` | | with their field types |

## Diagnostics

`toJsonSchema` never throws on content. Codes are stable; new ones may be
added, none renamed.

| code | severity | means |
| --- | --- | --- |
| `unsupported-field-type` | error | field type not compiled yet; field dropped |
| `unknown-field-type` | error | type absent or not one form-toolkit defines; field dropped |
| `invalid-field-name` | error | missing, malformed or reserved name; field dropped |
| `duplicate-field-name` | error | later field with a name already used; dropped |
| `missing-choices` | error | choice field with no usable choice; dropped |
| `missing-label` | info | name used as title |
| `invalid-choice` | warning | choice without value or with a repeated value; choice dropped |
| `unsupported-validation-rule` | warning | rule type with no counterpart; rule dropped |
| `inapplicable-validation-rule` | warning | rule type the Studio does not offer for this field type; dropped |
| `invalid-validation-rule` | warning | operand missing or unparsable; rule dropped |
| `invalid-default-value` | warning | default not a number / not a choice / not `true`/`false`; dropped |
| `ignored-default-value` | info | default on a checkbox group |
| `ignored-placeholder` | info | placeholder on radio or checkbox |
| `lossy-submit-position` | info | submit button alignment has no counterpart |

## What no adapter can add

The ceiling is `@sanity/form-toolkit`'s authoring model. These have no field
in the Studio schema, so nothing compiles them:

- field descriptions or help text;
- conditional visibility, enablement or required-ness;
- pages, sections, nesting, repeating groups;
- constraints across fields;
- a message for "required" (only rule messages exist; the compiler supplies
  one for a required checkbox);
- a default value on a lone checkbox (the Studio hides `options` for it);
- formats beyond what a field type implies.

Two properties of the authoring model shape how content is read: every
validation operand is stored as a string and parsed here, and `checkbox`
is one type for both a boolean and a group, told apart by whether it has
choices.

## Renderer notes

Each adapter's document lists the library-specific behaviour it works
around and the gaps that remain: [rjsf](adapters/rjsf.md),
[jsonforms](adapters/jsonforms.md), [surveyjs](adapters/surveyjs.md).
