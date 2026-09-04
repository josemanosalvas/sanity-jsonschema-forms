> Research record, spike 3 (tag `surveyjs-spike-v3`, 2026-09-04). Kept because it is the strongest evidence for the decisions in [architecture.md](../architecture.md).

# Assessment 3: SurveyJS against the JSON Schema contract

Spike run 2026-09-04 in `packages/sanity-json-schema` as a third subpath
entry, `sanity-json-schema/surveyjs`, against `survey-core` and
`survey-react-ui` 3.0.3, with the fixtures and submissions of spikes 1 and 2.
Evidence: `src/surveyjs.ts` (adapter), `test/surveyjs.test.ts` (exact
output, headless accept/reject parity, messages), `test/surveyjs-capabilities.test.ts`
(headless probes of the semantics SurveyJS has and JSON Schema does not), and
a third pane in `examples/compare`, checked in a browser.

The question was narrow: **can SurveyJS consume the same renderer-independent
contract, and does it expose reusable form semantics that standard JSON
Schema cannot represent?** Both halves have an answer.

## 1. How much SurveyJS output came directly from JSON Schema?

Almost all of it. SurveyJS has no schema/uischema split; its survey JSON is
both, so the adapter rebuilds every question from `compiled.schema`:

| survey JSON property | source |
| --- | --- |
| `name`, `title` | `properties` key, `title` |
| `type` for text, boolean, dropdown, checkbox | `type`, `oneOf`, `items` |
| `inputType` (`text`, `email`, `number`) | `type`, `format` |
| `isRequired` | `required[]` |
| `defaultValue` | `default` |
| `choices[].value` / `.text` | `oneOf[].const` / `.title` |
| `validators` (`text`, `regex`, `email`, `numeric`, `answercount`, `expression`) | `minLength`, `maxLength`, `pattern`, `format`, `minimum`, `maximum`, `minItems`, `maxItems`, `const` |
| every validator's `text` | the `messages` map |

The adapter returns `fromSchema` and `fromForm` lists so the split is part of
the output, not a claim in a document.

## 2. What required original `@sanity/form-toolkit` presentation information?

Three things, the same three the RJSF and JSON Forms adapters needed, read
through the same 45-line internal helper:

- `type: 'comment'` instead of `text` (the editor chose a textarea);
- `type: 'radiogroup'` instead of `dropdown` (the editor chose radios);
- `placeholder`;

plus `completeText` from the form's submit button. Nothing else. No name,
choice, rule, default or required-ness was read from the form.

## 3. Accept/reject parity

Same submissions, four validators:

| submission | plain AJV | RJSF (AJV) | JSON Forms (AJV) | SurveyJS |
| --- | --- | --- | --- | --- |
| valid | accept | accept | accept | accept |
| empty | reject | reject | reject | reject |
| every rule fails | reject | reject | reject | reject |
| minLength + maximum | reject | reject | reject | reject |
| duplicate checkbox values | reject (`uniqueItems`) | reject | reject | **accept** |
| off-list dropdown value | reject (`oneOf`) | reject | reject | **accept** |
| `consent: false` | reject (`const`) | reject | reject | reject (expression validator) |
| non-numeric number | reject (`type`) | reject | reject | reject, but with the min/max messages |

The two divergences share one cause: **SurveyJS validates what its own
widgets can produce, not an arbitrary payload.** A checkbox cannot select
the same choice twice and a dropdown cannot yield a value it does not list,
so the model has no rule for either. The three AJV consumers reject both.
This is a property of SurveyJS, not a gap in the adapter, and it means a
submission endpoint must validate with AJV against the contract regardless
of which renderer produced the answers. Every authored message surfaces
through a SurveyJS validator; `isRequired` alone does not enforce a ticked
checkbox, so `const: true` becomes an expression validator
(`{consent} = true`).

## 4. What SurveyJS supports that `@sanity/form-toolkit` cannot author

All of it probed headless in `surveyjs-capabilities.test.ts`; none of it
has a field in the Studio schema to come from:

pages and navigation, `visibleIf`, `enableIf`, `requiredIf`, calculated
values, expression validators across fields, dynamic panels (repeating
groups with per-panel validation), branching by page visibility. Also
untested but present: scoring, timers, quiz mode, matrix questions,
completion pages.

## 5. Which SurveyJS features fundamentally exceed JSON Schema, and are any shared enough to justify portable metadata?

| capability | JSON Schema (draft-07) | current form-toolkit | presentation? | portable behaviour? | SurveyJS-only? |
| --- | --- | --- | --- | --- | --- |
| Pages | no | no | partly: RJSF has none, JSON Forms has `Categorization`, SurveyJS has pages | grouping of properties, yes; step navigation, no | navigation semantics |
| Panels / groups | nested `object` | no | yes: JSON Forms `Group`, RJSF nested object, SurveyJS `panel` | yes, as nested objects | no |
| `visibleIf` | `if`/`then`/`else`, `dependencies` (presence only) | no | no: it changes data and validation | partly: RJSF and JSON Forms both read `if`/`then`; JSON Forms also has `rule.effect: SHOW`. SurveyJS uses its own expression language | the expression language |
| `enableIf` | no | no | mostly (read-only state) | JSON Forms `rule.effect: ENABLE`; RJSF `ui:readonly` static only | yes as data-driven |
| `requiredIf` | `if`/`then` with `required` | no | no | yes, via `if`/`then` for AJV consumers | expression form |
| Calculated values | no | no | no | no: nothing in RJSF or JSON Forms | yes |
| Cross-field expression validators | `if`/`then`, `dependentRequired`; comparisons no | no | no | comparisons need a custom keyword in AJV | yes |
| Dynamic panels | `array` of `object` | no | RJSF `ArrayField`, JSON Forms array renderer | yes, as arrays of objects | per-panel navigation only |
| Branching | no | no | no | no | yes |
| Scoring, timers, quiz mode | no | no | no | no | yes |

Reading the last two columns together: **the only behaviours shared by at
least two consumers are the ones JSON Schema already expresses**: nested
objects (panels), arrays of objects (repeating groups), and conditional
presence/required-ness through `if`/`then`. Everything SurveyJS adds beyond
that is either its own expression language or runtime behaviour (navigation,
calculation, scoring) that neither RJSF nor JSON Forms has. There is no
shared behaviour concept sitting outside JSON Schema that two of the three
consumers would read, so there is nothing for portable metadata to carry.

The one candidate worth naming is conditional visibility. Two consumers
express it (RJSF via `if`/`then` adding properties, JSON Forms via `rule`),
SurveyJS via `visibleIf`, and form-toolkit cannot author it. If Sanity
authoring ever gains a "show when" field, the portable form is the JSON
Schema one (`if`/`then`/`else`), with each adapter deriving its own
mechanism from it, the way labels derive from `oneOf`. That is a future
compiler feature, not a model.

## 6. Is a new intermediate form model warranted?

**No.** Three consumers of very different shape (a schema-driven React
renderer, a schema-plus-UI-schema renderer, a survey runtime with its own
JSON) all consumed the same draft-07 schema plus the same message map, each
through an adapter of 60 to 110 lines and one shared 45-line helper that
carries the input choice and the placeholder. Nothing SurveyJS needed
argued for a `presentation` object beyond those two facts, and nothing it
offers argued for a `behavior` object that another consumer would read.
Spike 2's conclusion stands, now with the strongest counter-candidate tried.

## 7. Should SurveyJS remain a `sanity-json-schema/surveyjs` subpath?

Yes. It is one 139-line file (`src/surveyjs.ts`), depends on nothing at runtime (the
survey JSON is plain data; `survey-core` is only needed by the host and by
the tests), shares the internal helper, and has no lifecycle of its own.
A separate package would duplicate the helper and the fixtures for no gain.

## 8. Does `sanity-jsonschema-forms` still describe the project?

Yes, more so after this spike. The unit of the project is the JSON Schema
contract compiled from a Sanity form; SurveyJS turned out to be one more
consumer of it rather than a reason to change it. The name says exactly
that. It would stop fitting only if authoring grew capabilities that JSON
Schema cannot express and a consumer needed them, which is the case §5 did
not find.

## Recommendation for the architecture decision

Outcome A: JSON Schema remains sufficient. Stabilise
`sanity-json-schema` with `toJsonSchema` and three subpath adapters, keep
the message map as the one sidecar, and keep the internal helper internal.
Before `v0.1.0`: compile the nine remaining field types; make the
submission-side rule explicit in the docs (validate with AJV against the
contract, whatever rendered the form); and decide whether conditional
visibility is the first authoring capability to add, since it is the one
behaviour all three consumers can express and the Studio cannot.
