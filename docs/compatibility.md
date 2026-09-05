# Compatibility

## Versions tested

| Library | Version | Role |
| --- | --- | --- |
| `@sanity/form-toolkit` | 3.0.17 | authoring; development-only, its `FormDataProps` is checked against this package's structural input type |
| `ajv` + `ajv-formats` | 8.20 / 2.1 | Draft 7 validation in tests and on the server |
| `@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`, `@rjsf/shadcn` | 6.8.0 | `./rjsf` |
| `@jsonforms/core`, `@jsonforms/react`, `@jsonforms/vanilla-renderers` | 3.8.0 | `./jsonforms` |
| Node | 22.12 or later | running and developing the package |
| `fast-check` | 4.9 | compiler invariants over arbitrary form documents (`test/properties.test.ts`) |

## Field types

`@sanity/form-toolkit`'s `formSchema` plugin offers sixteen field types.
Fifteen compile. Each has one of four statuses:

- **supported**: every value the native input can submit validates, and
  every rule the Studio offers for the type is in the schema;
- **supported, narrower values**: the schema rejects some values the
  native input accepts, because no portable Draft 7 construct matches the
  HTML contract across the tested validators; the gap is stated in the
  table and pinned by tests;
- **supported, lossy rule**: the field compiles, but a rule the Studio
  offers cannot be written in JSON Schema Draft 7 without a validator
  extension, so it is dropped with `warning lossy-validation-rule`;
- **unsupported**: form-toolkit defines no JSON representation of the
  submitted value, so compiling it would mean this package defining one;
  the field is dropped with `error unsupported-field-type`.

| form-toolkit type | status | JSON Schema |
| --- | --- | --- |
| `text` | supported | `string` |
| `textarea` | supported | `string` (input choice is presentation) |
| `email` | supported, narrower values | `string` + `format: email`. ajv-formats requires a dot in the domain; a native `email` input also accepts `a@b`; see "Email addresses" |
| `url` | supported, narrower values | `string` + `format: uri` (RFC 3986). A native `url` input also accepts unencoded non-ASCII such as `https://例え.jp`; see "URLs" |
| `tel` | supported | `string` (the input type is presentation; only an authored `pattern` constrains it) |
| `hidden` | supported | `string`, value from `default`; `required` without a default is `warning missing-default-value` |
| `number` | supported | `number` |
| `range` | supported, lossy rule | `number` + `minimum`/`maximum`; `step` becomes `multipleOf` only when it is a whole number and the step base is a multiple of it (see below) |
| `checkbox` (no choices) | supported | `boolean`; `const: true` when required |
| `checkbox` (with choices) | supported | `array` of `string` `oneOf`, `uniqueItems` |
| `select`, `radio` | supported | `string` `oneOf` (widget choice is presentation) |
| `date` | supported, narrower values, lossy rule | `string` + `format: date` + `pattern` excluding year `0000`. HTML allows four or more year digits; the format takes exactly four. `minDate`/`maxDate` are dropped (see below) |
| `datetime-local` | supported, lossy rule | `string` + `pattern` for the HTML local date and time value: leap years, year > 0, four or more year digits, no timezone. `minDate`/`maxDate` are dropped |
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
implements the HTML "valid date string" rules: each month's length, 29
February only in leap years (divisible by 4, and by 400 if by 100), a
year of four or more digits greater than zero. `2025-02-29T18:30` and
`0000-01-01T00:00` fail; `12026-09-04T18:30` passes.

`date` maps to `format: date`, RFC 3339 `full-date`, which agrees with
the native value on months, days and leap years but not at the year
boundary: ajv-formats matches exactly four digits and does not reject
`0000`, while HTML allows four or more digits and requires a year greater
than zero. `NONZERO_YEAR_PATTERN` (`^(?!0000-)`) sits beside the format
and removes year `0000`, so what remains is a narrowing: five-digit years
are rejected, pinned in the fixture together with year `0000`. The format
is kept rather than re-implemented as a pattern so it keeps its meaning to
every consumer.

### Email addresses

`format: email` as ajv-formats checks it requires at least one dot in the
domain. The HTML "valid e-mail address" grammar does not: a native
`<input type="email">` accepts `a@b`. The schema rejects such a value,
and a stored default of that shape is dropped with
`warning invalid-default-value`, because a default the schema rejects
would start the form invalid. Both are pinned in the fixtures.

### URLs

`format: uri` is RFC 3986: an absolute URI, scheme required, printable
ASCII only. A native `<input type="url">` checks against the URL Living
Standard instead, which accepts unencoded non-ASCII (`https://例え.jp`,
`https://example.com/ü`) and percent-encodes it on its own; those values
fail the schema until percent-encoded. No portable alternative exists
among the tested validators: Draft 7 names an `iri` format, but
ajv-formats does not implement it, so plain AJV in strict mode refuses
the schema and JSON Forms' and RJSF's validators ignore the keyword and
check nothing. A hand-written pattern cannot reproduce the URL parser
either (it percent-encodes some spaces and rejects others). The type is
therefore listed as narrower: the standard format, with the gap stated
and pinned in the fixture. A host that must accept internationalized
URLs should percent-encode before validating.

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

### Why `file` is deferred

form-toolkit defines a native file input but no JSON upload representation.
A host must choose between a data URL, multipart upload, or asset reference,
and define upload authorization, size and type checks. The compiler drops
`file` and its rules until such a contract exists.

## Validation rules

| form-toolkit rule | keyword | status |
| --- | --- | --- |
| `minLength`, `maxLength`, `pattern`, `min`, `max`, `minSelectedCount`, `maxSelectedCount` | `minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `minItems`, `maxItems` | supported |
| `step` | `multipleOf` | supported when the step is a whole number and the step base is a multiple of it; otherwise lossy |
| `minDate`, `maxDate` | none | lossy: checked, then dropped with `lossy-validation-rule` |
| `maxSize`, `fileType` | none | dropped with `file` |

## Diagnostics

`toJsonSchema` never throws on content. Codes are stable; new ones may be
added, none renamed. Malformed JSON containers are diagnosed as well as
incomplete form-toolkit documents.

| code | severity | means |
| --- | --- | --- |
| `invalid-form` | error | non-object document or non-array fields; no fields compiled |
| `unsupported-field-type` | error | `file`; field dropped |
| `unknown-field-type` | error | type absent or not one form-toolkit defines; field dropped |
| `invalid-field-name` | error | missing, malformed or reserved name; field dropped |
| `duplicate-field-name` | error | later field with a name already used; dropped |
| `missing-choices` | error | choice field with no usable choice; dropped |
| `missing-label` | info | name used as title (not reported for `hidden`, which shows none) |
| `invalid-choice` | warning, error | invalid or repeated choice dropped; non-array choices drop the field with an error |
| `unsupported-validation-rule` | warning | rule type form-toolkit does not define; rule dropped |
| `inapplicable-validation-rule` | warning | rule type the Studio does not offer for this field type; dropped |
| `invalid-validation-rule` | warning | operand missing or unparsable, or validation is not an array; rule(s) dropped |
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
[jsonforms](adapters/jsonforms.md).
The table below is the per-type summary; "native" means the library's own
control for the type, "text" means it renders as a plain text input that
still validates against the schema.

| type | RJSF (`@rjsf/shadcn`) | JSON Forms (vanilla) |
| --- | --- | --- |
| `url` | native | text |
| `tel` | native | text |
| `hidden` | hidden input | no control; value in `initialData` |
| `date` | native | native |
| `datetime-local` | native, value untouched | text |
| `time` | native, value untouched | native (appends `:00`) |
| `range` | slider | slider when the schema has `minimum`, `maximum` and `default`; else number input |
| `color` | native | text |
