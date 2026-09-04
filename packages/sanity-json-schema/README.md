# sanity-json-schema

Spike 2. `toJsonSchema(form)` compiles a `@sanity/form-toolkit` form document
into draft-07 JSON Schema plus a message map and diagnostics; the `./rjsf`
and `./jsonforms` entries add what each renderer needs to present it. See the
[contract](../../docs/json-schema-contract.md) and the
[assessment](../../docs/assessment-2.md).

```ts
import {toJsonSchema} from 'sanity-json-schema'
import {toRjsfProps} from 'sanity-json-schema/rjsf'
import {toJsonFormsProps} from 'sanity-json-schema/jsonforms'
```

The root entry has no runtime dependencies. `./rjsf` is type-only on
`@rjsf/utils`; `./jsonforms` imports `createDefaultValue` from
`@jsonforms/core`. Experimental; not published.
