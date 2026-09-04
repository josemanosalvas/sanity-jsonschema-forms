# The JSON Schema contract

What `toJsonSchema(form)` produces from a
`@sanity/form-toolkit` form document, and what it deliberately leaves out.
Verified against `@sanity/form-toolkit` 3.0.17, plain `ajv` 8.20 with
`ajv-formats`, `@rjsf/*` 6.8.0 and `@jsonforms/*` 3.8.0.

```ts
const {schema, messages, diagnostics} = toJsonSchema(form)
```

- `schema` is draft-07 JSON Schema typed as `JSONSchema7` from `@types/json-schema`. It validates on its own with any draft-07 validator. It contains no `ui:*` key, no `errorMessage`, no `$id`.
- `messages` is `Record<field, Record<keyword, text>>`: the error messages editors wrote, keyed by the AJV keyword whose failure they describe.
- `diagnostics` lists everything that did not map one-to-one, in source order; codes are stable and listed in [compatibility.md](compatibility.md).

## Field types

| form-toolkit | JSON Schema | note |
| --- | --- | --- |
| `text` | `{type: "string"}` | |
| `textarea` | `{type: "string"}` | indistinguishable from `text` in the schema; the input choice is presentation |
| `email` | `{type: "string", format: "email"}` | |
| `number` | `{type: "number"}` | |
| `checkbox` without choices | `{type: "boolean"}`; required adds `const: true` | see "Required" |
| `checkbox` with choices | `{type: "array", uniqueItems: true, items: {type: "string", oneOf: [...]}}` | |
| `select`, `radio` | `{type: "string", oneOf: [{const, title}, ...]}` | indistinguishable in the schema; the widget is presentation |
| nine others | not compiled yet | listed with their planned mappings in [compatibility.md](compatibility.md) |

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
| text, textarea, email, number, select, radio | `required: [name]` | direct |
| lone checkbox | `required: [name]` and `const: true` | `required` checks presence; an unticked box is `false`, which is present |
| checkbox group | `required: [name]` and `minItems: 1` | an empty array is present; an authored `minSelectedCount` of 1 or more takes precedence |

`const: true` is the idiomatic constraint. Some renderers read a `const` as
a default; the contract keeps the plain form and leaves that concern to the
adapter of the renderer that needs it.

## Validation rules

Every operand is stored as a string and parsed here; a rule that does not
fit its keyword is dropped with `warning invalid-validation-rule`.

| form-toolkit rule | keyword | applies to |
| --- | --- | --- |
| `minLength`, `maxLength` | `minLength`, `maxLength` (integer ≥ 0) | text, textarea |
| `pattern` | `pattern` (must compile with the `u` flag, as AJV compiles it) | text, email |
| `min`, `max` | `minimum`, `maximum` | number |
| `minSelectedCount`, `maxSelectedCount` | `minItems`, `maxItems` | checkbox group |

## Messages

```json
{
  "fullName": {"pattern": "Names cannot contain digits."},
  "consent": {"const": "This box must be checked."}
}
```

Keys are field names, then AJV keywords. Every entry but one is an
editor-written rule message. The exception is `const` on a required lone
checkbox: form-toolkit stores no message for "required", and AJV's own
("must be equal to constant") would mislead, so the compiler supplies one.

Delivery is per renderer: RJSF through `transformErrors`, JSON Forms through
`i18n.translate` answering `<field>.error.<keyword>`, SurveyJS as each
validator's `text`. All are built by the adapters from this map.

**Submissions must be validated with AJV against this schema on the server,
whatever rendered the form.** SurveyJS in particular validates what its
widgets can produce, not an arbitrary payload (see [adapters/surveyjs.md](adapters/surveyjs.md)).

## Deliberately not in the schema

| what | where it goes | why |
| --- | --- | --- |
| placeholder | adapter (`ui:placeholder` / `options.placeholder`) | no draft-07 keyword; `examples` means something else |
| which input (`textarea` vs `text`, `radio` vs `select`) | adapter (`ui:widget` / `options.multi`, `options.format`) | presentation |
| field order | `properties` insertion order; the RJSF adapter also writes `ui:order` | JSON Schema does not define property order, but every implementation preserves it |
| submit button text | adapter (`ui:submitButtonOptions` / returned `submitText`) | not part of the data |
| submit button position | nowhere (`info lossy-submit-position`) | neither renderer has it |
| `$id` | nowhere | AJV caches by `$id`; recompiling the same form would collide |
| descriptions, conditions, pages | nowhere | form-toolkit cannot author them |

## What each adapter needs beyond the schema

All three adapters (RJSF, JSON Forms, SurveyJS) read `form.fields` again through one internal helper,
`presentationFields(form, schema)`, which returns for every property in the
schema the source `type` and `placeholder` and nothing else. That helper is
the entire "intermediate model" shared between renderers; see
[architecture.md](architecture.md) for why it stays that small.
