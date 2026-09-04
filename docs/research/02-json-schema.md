> Research record, spike 2 (tag `json-schema-spike-v2`, 2026-09-04). `packages/sanity-json-schema` grew out of this spike. Kept because it explains the decisions in [architecture.md](../architecture.md).

# Assessment 2: a renderer-independent JSON Schema from `@sanity/form-toolkit`

Spike run 2026-09-04 in the same repository as spike 1, against
`@sanity/form-toolkit` 3.0.17, plain `ajv` 8.20 + `ajv-formats`, RJSF 6.8.0
(`@rjsf/core`, `utils`, `validator-ajv8`, `shadcn`) and JSON Forms 3.8.0
(`@jsonforms/core`, `react`, `vanilla-renderers`). Evidence:
`packages/sanity-json-schema` (34 tests: exact output, plain-AJV validation,
an RJSF render, a JSON Forms render, parity with the frozen spike 1) and
`examples/compare`, which renders one compiled form through both libraries
side by side and was checked in a browser. The contract itself is in
[json-schema-contract.md](../json-schema-contract.md).

## (a) Can a renderer-independent schema be extracted?

**Yes.** `toJsonSchema(form)` produces draft-07 JSON Schema with nothing
renderer-specific in it (a test greps the output for `ui:`, `errorMessage`,
`$id` and `enumNames` and finds none), validates every fixture submission
with plain AJV to the same verdict as spike 1's RJSF-shaped schema, and is
consumed **unchanged** by both adapters: each test asserts the adapter
returns the very same schema object it was given.

The three places where spike 1 had to bend the output toward RJSF all moved
out of the schema:

| spike 1 (RJSF-shaped) | spike 2 (contract) | where the RJSF concern went |
| --- | --- | --- |
| `enum` + `ui:enumNames` | `oneOf: [{const, title}]` | a `<Form>` prop: `constAsDefaults: 'never'` |
| `enum: [true]` for a required checkbox | `const: true` | the same prop |
| messages closed over in `transformErrors` | a `messages` map beside the schema | the RJSF adapter builds `transformErrors` from it; the JSON Forms adapter builds `translate` |

Both renderers show labels from `oneOf[].title`, neither pre-selects a
choice, both show the radio's authored default, and both surface the
editor's messages on submit.

## (b) What each adapter needed beyond the schema

Measured, not estimated (`wc -l`, comments included):

| unit | lines | what it carries |
| --- | --- | --- |
| `to-json-schema.ts` | 328 | the compiler; all normalisation and diagnostics |
| `internal/fields.ts` | 45 | the shared helper: per property, the source `type` and `placeholder`. **This is the entire intermediate model.** |
| `rjsf.ts` | 62 | `ui:widget`, `ui:placeholder`, `ui:order`, `ui:submitButtonOptions`, `ui:optionValueFormat` (shadcn radio bug), `formProps`, `transformErrors` |
| `jsonforms.ts` | 60 | `Control` per property with `options.multi` / `format: 'radio'` / `placeholder`, `translate`, `initialData`, `submitText` |
| `CheckboxGroupControl.tsx` (example) | 40 | a JSON Forms renderer for an array of enums; vanilla ships none |

Beyond the schema, an adapter needs exactly: which input the editor chose
where two types share one schema (`textarea`/`text`, `radio`/`select`);
the placeholder; the submit label; the message map. Nothing about names,
choices, rules, defaults or required-ness is read twice. That list is the
same for both adapters, which is why one 45-line helper serves both.

## (c) The six comparison points from assessment 1 §5

| point | verdict | detail |
| --- | --- | --- |
| **1. Where labels live** | **agree** | `oneOf[].title` works for both. JSON Forms reads it natively; RJSF needs `constAsDefaults: 'never'` or it pre-selects the first option. Labels belong in the schema. |
| **2. Required checkbox / group** | **agree** | `const: true` and `minItems: 1` validate identically in plain AJV, RJSF's AJV and JSON Forms' AJV. Both renderers show the `const` error on an unticked box. |
| **3. Messages** | **agree, delivery differs** | One `(field, keyword) → text` map serves both: RJSF via `transformErrors` (keys on `error.property` + `error.name`), JSON Forms via `i18n.translate` (keys on `<field>.error.<keyword>`, which `i18n: <field>` on each control produces). The map is the shared artefact; the delivery is 10 lines per renderer. |
| **4. Placeholders / widgets** | **agree** | Both are per-property options keyed by the same name (`ui:placeholder` vs `options.placeholder`, `ui:widget` vs `options.multi`/`format`). JSON Forms' `Control` list is positional, but generating it from `properties` order was trivial; nothing from `ui:order` leaked. |
| **5. Defaults** | **differ** | RJSF computes initial data from schema `default`s itself. JSON Forms does not: its AJV runs without `useDefaults`, so `default` is inert until the host seeds data. The adapter returns `initialData` built with JSON Forms' own `createDefaultValue`. The `enum`-not-`oneOf` decision was RJSF-only and did not generalise; it is gone. |
| **6. Diagnostics parity** | **agree** | The parity test holds spike 1's and spike 2's diagnostics deep-equal for both fixtures, and both schemas reach the same verdict for every submission. |

Two renderer facts surfaced that belong to the renderers, not the contract:
JSON Forms' vanilla set has no control for an array of enums (40-line
renderer in the example), and `@rjsf/shadcn`'s radio needs
`ui:optionValueFormat: 'realValue'` to display a default (carried over from
spike 1).

## (d) Recommendation

**The larger idea is a standards-based form contract, not an RJSF
integration.** The evidence: one schema, two independent form libraries,
adapters of about 60 lines each, and a shared helper of 45 lines that
carries two facts per field. Spike 1's RJSF-specific choices were all
avoidable at the cost of one RJSF form prop.

Concretely:

- **A `sanity-json-schema` package is justified** as the maintained unit:
  `toJsonSchema` plus the message map and the diagnostics vocabulary. It
  is the artefact both renderers consumed unchanged.
- **Keep the presentation adapters inside it as subpath entries**
  (`./rjsf`, `./jsonforms`), not as separate packages. Each is one file,
  shares one internal helper, and would otherwise duplicate the
  "what input did the editor choose" reading. Their renderer dependencies
  stay optional peers; the root entry has none.
- **Do not build a `FormDefinition` model.** The five points that agree
  show the schema *is* the shared model; the helper covers the rest.
- **Retire `sanity-rjsf`** as the shape of anything future. Keep the tag as
  evidence. Its `toRjsf` could be reimplemented as
  `toRjsfProps(form, toJsonSchema(form))` in a few lines if anyone wants
  the old API.
- **Before maintaining it:** fill in the nine uncompiled field types
  (mapping known; see mapping.md), and decide the `oneOf` error fan-out
  policy (n+1 AJV errors for an off-list value; reachable only by
  tampering, but a submission endpoint will see it).

What the assessment did not test: a third consumer that is not a React
form library (a server validating submissions, a SurveyJS-style model
compiler). The contract is plain draft-07 with one sidecar map, which is
what such a consumer would want, but that is inference rather than evidence.
