# `sanity-json-schema/surveyjs`

```tsx
import {Model} from 'survey-core'
import {Survey} from 'survey-react-ui'
import {toJsonSchema} from 'sanity-json-schema'
import {toSurveyJsProps} from 'sanity-json-schema/surveyjs'

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
| `surveyJson` | `title`, `completeText`, `showQuestionNumbers: 'off'`, one question per schema property |
| `fromSchema` | the question properties written from the schema alone |
| `fromForm` | the question properties that needed the original form (`type` for textarea/radio, `placeholder`, `completeText`) |

## Mapping

| JSON Schema | SurveyJS |
| --- | --- |
| `string` | `text` (`inputType: text`); `comment` when the editor chose a textarea |
| `string` + `format: email` | `text` with `inputType: email` and an `email` validator |
| `number` | `text` with `inputType: number` |
| `boolean` | `boolean` with `renderAs: checkbox` |
| `string` with `oneOf` | `dropdown`, or `radiogroup` when the editor chose radios; `choices[].text` from `title` |
| `array` of `oneOf` | `checkbox` |
| `required` | `isRequired` |
| `default` | `defaultValue` |
| `minLength`, `maxLength` | `text` validators (one each, so each carries its message) |
| `pattern` | `regex` validator |
| `minimum`, `maximum` | `numeric` validators |
| `minItems`, `maxItems` | `answercount` validators |
| `const: true` | `expression` validator `{name} = true`; `isRequired` alone accepts an explicit "No" |
| every message | the validator's `text` |

## Where SurveyJS and the schema disagree

SurveyJS validates what its widgets can produce, not an arbitrary payload:

- a duplicate value in a checkbox answer is accepted (`uniqueItems` rejects it);
- an off-list dropdown value is accepted (`oneOf` rejects it);
- a non-numeric answer in a number question fails, but with the min/max
  message rather than a type message.

None of this matters in the browser, where the widgets prevent all three.
It is why submissions are validated with AJV against the schema on the
server regardless of renderer (see [architecture.md](../architecture.md)).

## Beyond the schema

SurveyJS has pages, `visibleIf`/`enableIf`/`requiredIf`, calculated values,
cross-field expression validators, dynamic panels, branching and scoring.
`@sanity/form-toolkit` can author none of them, so the adapter emits none.
The research record in [../research/03-surveyjs.md](../research/03-surveyjs.md)
classifies each.
