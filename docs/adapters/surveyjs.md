# `sanity-jsonschema-forms/surveyjs`

```tsx
import {Model} from 'survey-core'
import {Survey} from 'survey-react-ui'
import {toJsonSchema} from 'sanity-jsonschema-forms'
import {toSurveyJsProps} from 'sanity-jsonschema-forms/surveyjs'

const compiled = toJsonSchema(form)
const {surveyJson} = toSurveyJsProps(form, compiled)
const model = new Model(surveyJson)

<Survey model={model} />
```

No peer: the adapter emits plain survey JSON and imports nothing. Tested
with `survey-core` and `survey-react-ui` 3.0.3.

## What it returns

| member | contents |
| --- | --- |
| `surveyJson` | `title`, `completeText`, `showQuestionNumbers: 'off'`, one question per schema property; `clearInvisibleValues: 'none'` when a hidden field exists |
| `fromSchema` | the question properties written from the schema alone |
| `fromForm` | the question properties that needed the original form (`type` for textarea/radio, `inputType` for tel/datetime-local/time/range/color, `visible` for hidden, `placeholder`, `completeText`) |

## Mapping

| JSON Schema | SurveyJS |
| --- | --- |
| `string` | `text` (`inputType: text`); `comment` when the editor chose a textarea |
| `string` + `format: email` | `text` with `inputType: email` and an `email` validator |
| `string` + `format: uri` | `text` with `inputType: url` (the native input validates; SurveyJS does not) |
| `string` + `format: date` | `text` with `inputType: date` |
| `string` + pattern, source `tel` / `datetime-local` / `time` / `color` | `text` with that `inputType` and a `regex` validator for the pattern |
| `string`, source `hidden` | `text` with `visible: false`; the survey gets `clearInvisibleValues: 'none'` so the default survives completion |
| `number` | `text` with `inputType: number` |
| `number`, source `range` | `text` with `inputType: range` and `min`/`max`/`step` from `minimum`/`maximum`/`multipleOf` |
| `boolean` | `boolean` with `renderAs: checkbox` |
| `string` with `oneOf` | `dropdown`, or `radiogroup` when the editor chose radios; `choices[].text` from `title` |
| `array` of `oneOf` | `checkbox` |
| `required` | `isRequired` |
| `default` | `defaultValue` |
| `minLength`, `maxLength` | `text` validators (one each, so each carries its message) |
| `pattern` | `regex` validator |
| `minimum`, `maximum` | `numeric` validators |
| `multipleOf` | `expression` validator `{name} % n = 0` |
| `minItems`, `maxItems` | `answercount` validators |
| `const: true` | `expression` validator `{name} = true`; `isRequired` alone accepts an explicit "No" |
| every message | the validator's `text` |

## Where SurveyJS and the schema disagree

SurveyJS validates what its widgets can produce, not an arbitrary payload:

- a duplicate value in a checkbox answer is accepted (`uniqueItems` rejects it);
- an off-list dropdown value is accepted (`oneOf` rejects it);
- a non-numeric answer in a number question fails, but with the min/max
  message rather than a type message; a numeric string is converted to a
  number and accepted (`type: number` rejects it);
- a `url` answer is not checked against `format: uri`, and a `date` answer
  not against the calendar (`2026-02-30` passes);
- an invisible question is not validated, so a required hidden field with
  no default passes here and fails the schema (the compiler warns with
  `missing-default-value`).

None of this matters in the browser, where the widgets prevent all of it.
It is why submissions are validated with AJV against the schema on the
server regardless of renderer (see [architecture.md](../architecture.md)).
`test/parity.test.ts` pins every divergence.

## Beyond the schema

SurveyJS has pages, `visibleIf`/`enableIf`/`requiredIf`, calculated values,
cross-field expression validators, dynamic panels, branching and scoring.
`@sanity/form-toolkit` can author none of them, so the adapter emits none.
The behaviours shared with the other adapters (grouping, repeating groups,
conditional presence) are the ones JSON Schema already expresses as nested
objects, arrays of objects and `if`/`then`, which is where they would be added;
see [../architecture.md](../architecture.md).
