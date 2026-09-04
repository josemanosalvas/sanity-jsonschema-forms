# Compatibility

## Versions tested

| Library | Version | Role |
| --- | --- | --- |
| `@sanity/form-toolkit` | 3.0.17 | authoring; development-only, its `FormDataProps` is checked against this package's structural input type |
| `ajv` + `ajv-formats` | 8.20 / 2.1 | Draft 7 validation in tests and on the server |
| `@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`, `@rjsf/shadcn` | 6.8.0 | `./rjsf` |
| `@jsonforms/core`, `@jsonforms/react`, `@jsonforms/vanilla-renderers` | 3.8.0 | `./jsonforms` |
| `survey-core`, `survey-react-ui` | 3.0.3 | `./surveyjs` |
| Node | 22.12 or later | running and developing the package |

## Field types

`@sanity/form-toolkit`'s `formSchema` plugin offers sixteen field types.
Fifteen compile. Each has one of three statuses:

- **supported**: every value the native input can submit validates, and
  every rule the Studio offers for the type is in the schema;
- **supported, lossy rule**: the field compiles, but a rule the Studio
  offers cannot be written in JSON Schema Draft 7 without a validator
  extension, so it is dropped with `warning lossy-validation-rule`;
- **unsupported**: no portable JSON representation of the value exists, so
  the field is dropped with `error unsupported-field-type`.

| form-toolkit type | status | JSON Schema |
| --- | --- | --- |
| `text` | supported | `string` |
| `textarea` | supported | `string` (input choice is presentation) |
| `email` | supported | `string` + `format: email` |
| `url` | supported | `string` + `format: uri` (RFC 3986: absolute, scheme required, non-ASCII percent-encoded) |
| `tel` | supported | `string` (the input type is presentation; only an authored `pattern` constrains it) |
| `hidden` | supported | `string`, value from `default`; `required` without a default is `warning missing-default-value` |
| `number` | supported | `number` |
| `range` | supported, lossy rule | `number` + `minimum`/`maximum`; `step` becomes `multipleOf` only when it is a whole number and the step base is a multiple of it (see below) |
| `checkbox` (no choices) | supported | `boolean`; `const: true` when required |
| `checkbox` (with choices) | supported | `array` of `string` `oneOf`, `uniqueItems` |
| `select`, `radio` | supported | `string` `oneOf` (widget choice is presentation) |
| `date` | supported, lossy rule | `string` + `format: date`; `minDate`/`maxDate` are dropped (see below) |
| `datetime-local` | supported, lossy rule | `string` + `pattern` for the native local value, no timezone; `minDate`/`maxDate` are dropped |
| `time` | supported | `string` + `pattern` for `HH:MM`, optional seconds |
| `color` | supported | `string` + `pattern` for `#` and six hexadecimal digits |
| `file` | unsupported | none; see "Why `file` is not compiled" |
| custom types from `formSchema({fields})` | never | opaque to this package (`error unknown-field-type`) |

### Temporal values: why `pattern`, not `format`

AJV's `time` and `date-time` formats implement RFC 3339, which requires a
timezone; a native `<input type="time">` or `datetime-local` submits local
wall-clock values (`18:30`, `2026-09-04T18:30`) with none. `format: time`
rejects every value a time input produces, and `format: date-time` rejects
every value a datetime-local input produces. Both types therefore get a
`pattern` for the lexical form the HTML standard defines, exported as
`TIME_PATTERN` and `DATETIME_LOCAL_PATTERN`. A value with a `Z` or an
offset fails; a client that converts to UTC before submitting (RJSF's own
`DateTimeWidget` does) must be told not to. The `datetime-local` pattern
knows each month's length and accepts 29 February in every year.
`date` maps to `format: date` because RFC 3339 `full-date` and the native
value agree exactly, leap years included.

### Date bounds: `minDate` and `maxDate`

Draft 7 has no keyword for a lower or upper bound on a formatted string.
AJV's `formatMinimum`/`formatMaximum` would do it, but they are an
`ajv-formats` extension; JSON Schema allows extensions and warns that other
implementations cannot be expected to honour them. The compiler checks the
operand has the field's own value shape, then drops the rule with
`warning lossy-validation-rule` naming the bound, so the server can enforce
it outside the schema. The upstream renderer does not enforce these rules
either: it spreads every rule as an HTML attribute, and `mindate` is not
one a browser reads.

### Range steps: `step` and `multipleOf`

HTML `step` counts from a step base: `min` if set, else the default value,
else 0. JSON Schema `multipleOf` counts from zero. With `min=1, step=2` a
browser offers 1, 3, 5 and `multipleOf: 2` would reject all of them. The
compiler emits `multipleOf` only when the base is itself a multiple of the
step, and only for whole-number steps: AJV checks `multipleOf` with
floating-point division, so `multipleOf: 0.1` rejects 0.3. Anything else
is `warning lossy-validation-rule`; `step` of `any` is `info` (a JSON
Schema number already accepts any value). A range without a `step` rule is
a plain `number` in the schema although browsers step it by 1: the schema
carries the authored rules, not the widget's defaults.

### Why `file` is not compiled

`@sanity/form-toolkit`'s renderer emits a native `<input type="file">` and
its documented native usage posts `multipart/form-data`; it defines no JSON
representation of a file. Each candidate suits one runtime and not the
others:

| representation | fits | does not fit |
| --- | --- | --- |
| data URL (`format: data-url`) | RJSF's file widget | the server (a base64 body in JSON) and SurveyJS, which stores `{name, type, content}` objects |
| base64 string | any JSON validator | the browser without a custom control in every renderer |
| `File` object or multipart body | native forms | JSON Schema, which cannot describe either |
| uploaded asset reference (`{id, name, size, type}`) | a Sanity or S3 upload flow | any renderer without a bespoke uploader |

None gives the same submission to all three consumers, so choosing one
would make the schema's meaning depend on the renderer, which is the one
thing the contract forbids. `file` stays dropped with
`error unsupported-field-type`, and `maxSize`/`fileType` with it. A future
release can compile it once a representation with parity across consumers
is settled; that is a submission-architecture decision, not a mapping.

## Validation rules

| form-toolkit rule | keyword | status |
| --- | --- | --- |
| `minLength`, `maxLength`, `pattern`, `min`, `max`, `minSelectedCount`, `maxSelectedCount` | `minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `minItems`, `maxItems` | supported |
| `step` | `multipleOf` | supported when the step is a whole number and the step base is a multiple of it; otherwise lossy |
| `minDate`, `maxDate` | none | lossy: checked, then dropped with `lossy-validation-rule` |
| `maxSize`, `fileType` | none | dropped with `file` |

## Diagnostics

`toJsonSchema` never throws on content. Codes are stable; new ones may be
added, none renamed. 0.2 added `lossy-validation-rule` and
`missing-default-value`.

| code | severity | means |
| --- | --- | --- |
| `unsupported-field-type` | error | `file`; field dropped |
| `unknown-field-type` | error | type absent or not one form-toolkit defines; field dropped |
| `invalid-field-name` | error | missing, malformed or reserved name; field dropped |
| `duplicate-field-name` | error | later field with a name already used; dropped |
| `missing-choices` | error | choice field with no usable choice; dropped |
| `missing-label` | info | name used as title (not reported for `hidden`, which shows none) |
| `invalid-choice` | warning | choice without value or with a repeated value; choice dropped |
| `unsupported-validation-rule` | warning | rule type form-toolkit does not define; rule dropped |
| `inapplicable-validation-rule` | warning | rule type the Studio does not offer for this field type; dropped |
| `invalid-validation-rule` | warning | operand missing or unparsable; rule dropped |
| `lossy-validation-rule` | warning, info | rule understood but not expressible in Draft 7 (`minDate`, `maxDate`, a misaligned or fractional `step`); dropped from the schema. `info` for `step: any`, which loses nothing |
| `invalid-default-value` | warning | default not a number / not a choice / not `true`/`false` / not the field's value shape; dropped |
| `ignored-default-value` | info | default on a checkbox group |
| `missing-default-value` | warning | required `hidden` field with no default: nothing on the page can supply a value |
| `ignored-placeholder` | info | placeholder on a field with no text input (radio, checkbox, hidden, range, color) |
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
The table below is the per-type summary; "native" means the library's own
control for the type, "text" means it renders as a plain text input that
still validates against the schema.

| type | RJSF (`@rjsf/shadcn`) | JSON Forms (vanilla) | SurveyJS |
| --- | --- | --- | --- |
| `url` | native | text | native (`inputType: url`, no URL check of its own) |
| `tel` | native | text | native |
| `hidden` | hidden input | no control; value in `initialData` | invisible question, value kept on completion |
| `date` | native | native | native |
| `datetime-local` | native, value untouched | text | native |
| `time` | native, value untouched | native (appends `:00`) | native |
| `range` | slider | slider when the schema has `minimum`, `maximum` and `default`; else number input | slider |
| `color` | native | text | native |
