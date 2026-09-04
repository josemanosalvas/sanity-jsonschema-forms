# sanity-rjsf

> **Frozen.** This package is spike 1, kept as evidence (tag `rjsf-spike-v1`). It is experimental, not published to npm, and not extended. Spike 2 lives in `packages/sanity-json-schema`.

`toRjsf(form)` compiles a `@sanity/form-toolkit` form document into an RJSF
`schema`, `uiSchema` and `transformErrors`, plus `diagnostics` listing what
did not map one-to-one. See the [mapping document](../../docs/mapping.md).

```ts
import {toRjsf} from 'sanity-rjsf'
import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'

const form: FormDataProps = await client.fetch(query, {id: 'contact'})
const {schema, uiSchema, transformErrors, diagnostics} = toRjsf(form)
```

Peer dependencies: `@rjsf/utils` (types), `@sanity/form-toolkit` (types,
optional). No runtime dependencies.
