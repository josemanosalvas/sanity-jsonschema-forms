# sanity-json-schema

Spikes 2 and 3. `toJsonSchema(form)` compiles a `@sanity/form-toolkit` form
document into draft-07 JSON Schema plus a message map and diagnostics; the
`./rjsf`, `./jsonforms` and `./surveyjs` entries add what each renderer needs
to present it. See the [contract](../../docs/json-schema-contract.md) and
assessments [2](../../docs/assessment-2.md) and [3](../../docs/assessment-3.md).

```ts
import {toJsonSchema} from 'sanity-json-schema'
import {toRjsfProps} from 'sanity-json-schema/rjsf'
import {toJsonFormsProps} from 'sanity-json-schema/jsonforms'
import {toSurveyJsProps} from 'sanity-json-schema/surveyjs'
```

The root entry has no runtime dependencies. `./rjsf` is type-only on
`@rjsf/utils`; `./jsonforms` imports `createDefaultValue` from
`@jsonforms/core`; `./surveyjs` emits plain survey JSON and imports nothing.
Experimental; not published.
