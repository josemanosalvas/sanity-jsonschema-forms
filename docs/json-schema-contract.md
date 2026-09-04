# The JSON Schema contract

What `toJsonSchema(form)` produces from a
`@sanity/form-toolkit` form document, and what it deliberately leaves out.
Verified against `@sanity/form-toolkit` 3.0.17, plain `ajv` 8.20 with
`ajv-formats`, `@rjsf/*` 6.8.0 and `@jsonforms/*` 3.8.0.

```ts
const {schema, messages, diagnostics} = toJsonSchema(form)
```

- `schema` is [JSON Schema Draft 7](https://json-schema.org/draft-07), typed as `JSONSchema7` from `@types/json-schema`. It declares its dialect (`$schema: "http://json-schema.org/draft-07/schema#"`, exported as `JSON_SCHEMA_DRAFT_7`) and validates on its own with any validator that supports that draft. It contains no `ui:*` key, no `errorMessage`, no `$id`, and no validator extension such as `formatMinimum`; a test checks every fixture for these.
- `messages` is `Record<field, Record<keyword, text>>`: the error messages editors wrote, keyed by the AJV keyword whose failure they describe.
- `diagnostics` lists everything that did not map one-to-one, in source order; codes are stable and listed in [compatibility.md](compatibility.md).

## Why Draft 7

JSON Schema's current release is [2020-12](https://json-schema.org/draft/2020-12),
two releases after Draft 7. The schema targets Draft 7 because it is what
every consumer validates with unless told otherwise: AJV's default
`Ajv` class, `@rjsf/validator-ajv8` and JSON Forms' built-in AJV all speak
Draft 7, and `@types/json-schema` has a `JSONSchema7` type and none for a
later draft. Targeting 2020-12 would make every adapter configure a
different validator for no gain: the keywords this schema uses (`type`,
`properties`, `required`, `oneOf`, `const`, `title`, `default`, `format`,
`pattern`, `minLength`, `maxLength`, `minimum`, `maximum`, `multipleOf`,
`items`, `uniqueItems`, `minItems`, `maxItems`) mean the same in both. A
consumer that wants a later dialect can replace `$schema`; nothing else
changes.

The `$schema` is declared so the document is self-describing rather than
relying on the consumer being configured for the right draft. `$id` is
not, because AJV caches compiled schemas by `$id` and recompiling the same
form would collide.

## Field types

| form-toolkit | JSON Schema | note |
| --- | --- | --- |
| `text` | `{type: "string"}` | |
| `textarea` | `{type: "string"}` | indistinguishable from `text` in the schema; the input choice is presentation |
| `email` | `{type: "string", format: "email"}` | |
| `url` | `{type: "string", format: "uri"}` | RFC 3986 URI: absolute, scheme required, printable ASCII. Narrower than the native input, which also accepts unencoded non-ASCII; see [compatibility.md](compatibility.md) |
| `tel` | `{type: "string"}` | no value contract beyond an authored `pattern`; the input type is presentation |
| `hidden` | `{type: "string", default}` | the value is the default; see "Required" |
| `number` | `{type: "number"}` | |
| `range` | `{type: "number"}` | indistinguishable from `number` in the schema; the slider is presentation |
| `checkbox` without choices | `{type: "boolean"}`; required adds `const: true` | see "Required" |
| `checkbox` with choices | `{type: "array", uniqueItems: true, items: {type: "string", oneOf: [...]}}` | |
| `select`, `radio` | `{type: "string", oneOf: [{const, title}, ...]}` | indistinguishable in the schema; the widget is presentation |
| `date` | `{type: "string", format: "date"}` | RFC 3339 `full-date`. Narrower than the native value at the year boundary: exactly four digits, `0000` not rejected; see [compatibility.md](compatibility.md) |
| `datetime-local` | `{type: "string", pattern: DATETIME_LOCAL_PATTERN}` | the HTML local date and time value: `YYYY-MM-DDTHH:MM`, optional `:SS` and `.sss`, never a timezone; month lengths, leap years, year > 0, four or more year digits |
| `time` | `{type: "string", pattern: TIME_PATTERN}` | `HH:MM`, optional `:SS` and `.sss`, never a timezone |
| `color` | `{type: "string", pattern: COLOR_PATTERN}` | `#` and six hexadecimal digits, either case; a default is lowercased as the native input reports it |
| `file` | not compiled | no portable JSON representation; see [compatibility.md](compatibility.md) |

`TIME_PATTERN`, `DATETIME_LOCAL_PATTERN` and `COLOR_PATTERN` are exported
from the root entry. The temporal types use a `pattern` because AJV's
`time` and `date-time` formats are RFC 3339 and demand a timezone that a
native input never supplies; see [compatibility.md](compatibility.md).
No custom `format` name is introduced: a `format` a validator does not
know is either ignored or an error, depending on its configuration.

## Choices: `oneOf` with `const` and `title`

The schema-native way to label an option. Any consumer that reads JSON Schema
gets the labels; JSON Forms reads them directly. RJSF treats a `oneOf` const
as a default and would pre-select the first option, so its adapter passes
`experimental_defaultFormStateBehavior: {constAsDefaults: 'never'}` on the
form. That is the adapter's problem, not the contract's.

Cost: an off-list value fails every branch `const` and then the `oneOf`,
so AJV reports n+1 errors for one bad value. Only tampering can produce an
off-list value, since every widget offers the choices only.

Choices are normalised: an option without a value is dropped, a repeated
value is dropped (`warning invalid-choice`), an empty label falls back to
the value. A choice field with no usable choice is dropped
(`error missing-choices`).

## Required

| field | expressed as | why |
| --- | --- | --- |
| every type but the two below | `required: [name]` | direct |
| lone checkbox | `required: [name]` and `const: true` | `required` checks presence; an unticked box is `false`, which is present |
| checkbox group | `required: [name]` and `minItems: 1` | an empty array is present; an authored `minSelectedCount` of 1 or more takes precedence |

`const: true` is the idiomatic constraint. Some renderers read a `const` as
a default; the contract keeps the plain form and leaves that concern to the
adapter of the renderer that needs it.

A required `hidden` field with no default is `required` and nothing else.
The compiler does not invent a value: it reports
`warning missing-default-value`, and the host either seeds the value or
drops `required`. (A native hidden input would submit an empty string and
skip constraint validation; JSON Schema `required` has no such exemption.)

## Defaults

A stored default enters the schema as `default` when it has the value shape
the type implies: a number for `number` and `range`, `true`/`false` for a
lone checkbox, one of the choices for `select`/`radio`, a calendar date
for `date`, the pattern's form for `datetime-local`, `time` and `color`,
an absolute ASCII URL for `url`. Anything else is dropped with
`warning invalid-default-value` so a form never starts invalid. Authored
rules are not checked against defaults, for any type.

## Validation rules

Every operand is stored as a string and parsed here; a rule that does not
fit its keyword is dropped with `warning invalid-validation-rule`.

| form-toolkit rule | keyword | applies to |
| --- | --- | --- |
| `minLength`, `maxLength` | `minLength`, `maxLength` (integer ≥ 0) | text, textarea |
| `pattern` | `pattern` (must compile with the `u` flag, as AJV compiles it) | text, email, url, tel |
| `min`, `max` | `minimum`, `maximum` | number, range |
| `step` | `multipleOf` (whole number; the step base must be a multiple of it) | range |
| `minSelectedCount`, `maxSelectedCount` | `minItems`, `maxItems` | checkbox group |
| `minDate`, `maxDate` | none | date, datetime-local: checked, then dropped with `warning lossy-validation-rule` |

`step` and the date bounds are the two places Draft 7 cannot follow the
Studio; [compatibility.md](compatibility.md) has the reasoning and the
exact conditions.

## Messages

```json
{
  "fullName": {"pattern": "Names cannot contain digits."},
  "satisfaction": {"multipleOf": "Even numbers only."},
  "consent": {"const": "This box must be checked."}
}
```

Keys are field names, then AJV keywords. Every entry but one is an
editor-written rule message. The exception is `const` on a required lone
checkbox: form-toolkit stores no message for "required", and AJV's own
("must be equal to constant") would mislead, so the compiler supplies one.
A dropped rule's message is dropped with it. The compiler's own patterns
(`datetime-local`, `time`, `color`) carry no message: the Studio offers no
rule to write one on.

Delivery is per renderer: RJSF through `transformErrors`, JSON Forms through
`i18n.translate` answering `<field>.error.<keyword>`. Both are built by the
adapters from this map.

**Submissions must be validated with AJV against this schema on the server,
whatever rendered the form.** A renderer validates what its widgets can
produce, not an arbitrary payload; the SurveyJS adapter of spike 3 made
that plain (see [decisions/001](decisions/001-surveyjs-is-research-not-an-adapter.md)).

## Deliberately not in the schema

| what | where it goes | why |
| --- | --- | --- |
| placeholder | adapter (`ui:placeholder` / `options.placeholder`) | no JSON Schema keyword; `examples` means something else |
| which input (`textarea` vs `text`, `radio` vs `select`, `tel`, `datetime-local`, `time`, `color`, `range`, `hidden`) | adapter (`ui:widget`, `ui:options.inputType` / `options` / `inputType`, `visible`) | presentation; the schema carries the value contract, not the control |
| `minDate`, `maxDate`, a misaligned `step` | nowhere (`warning lossy-validation-rule`) | no Draft 7 keyword without a validator extension |
| field order | `properties` insertion order; the RJSF adapter also writes `ui:order` | JSON Schema does not define property order, but every implementation preserves it |
| submit button text | adapter (`ui:submitButtonOptions` / returned `submitText`) | not part of the data |
| submit button position | nowhere (`info lossy-submit-position`) | JSON Schema has no such concept; the renderer's theme decides |
| `$id` | nowhere | AJV caches by `$id`; recompiling the same form would collide (`$schema` is declared, see above) |
| descriptions, conditions, pages | nowhere | form-toolkit cannot author them |

## What each adapter needs beyond the schema

Both adapters (RJSF, JSON Forms) read `form.fields` again through one internal helper,
`presentationFields(form, schema)`, which returns for every property in the
schema the source `type` and `placeholder` and nothing else. 0.2 added
eight source types to that `type` and no new fact: a `string` with a
pattern is a `tel`, a `time` or a `color` only by its source type, and
that is all an adapter asks. That helper is the entire "intermediate
model" shared between renderers; see [architecture.md](architecture.md)
for why it stays that small.
