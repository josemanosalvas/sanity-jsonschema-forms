> Research record, spike 1 (tag `rjsf-spike-v1`, 2026-09-04). The `sanity-rjsf` package it describes was superseded by `sanity-json-schema/rjsf` and removed from `main`; the tag preserves it. Kept because it explains the decisions in [architecture.md](../architecture.md).

# Assessment: adapting `@sanity/form-toolkit` to RJSF

Spike run 2026-09-04 against `@sanity/form-toolkit` 3.0.17 and RJSF 6.8.0
(`@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8`, `@rjsf/shadcn`).
Evidence: `packages/sanity-rjsf` (one 400-line compiler, 22 tests covering
compile output, AJV validation and a jsdom render through the shadcn theme)
and `examples/rjsf-shadcn` (Vite app, checked in a browser). The full mapping
tables are in [mapping.md](../compatibility.md).

## 1. Can `@sanity/form-toolkit` be mapped cleanly to RJSF?

**Yes, for what form-toolkit can author.** The document is a flat list of
typed fields with string operands, and every construct it has lands on a
standard JSON Schema keyword or a documented RJSF `ui:` option. The adapter
needed no intermediate form model: the input type is form-toolkit's own
`FormDataProps`, the outputs are `RJSFSchema` and `UiSchema` from
`@rjsf/utils`, and the whole thing is one pure function with no runtime
dependencies. Nothing about form-toolkit's shape fought the target.

Three things needed a deliberate choice rather than a lookup, and each has an
RJSF-native answer:

- **Required checkboxes.** JSON Schema `required` checks presence, not truth.
  A lone required checkbox compiles to `enum: [true]`; a required group to
  `minItems: 1`. (`const: true` is unusable: RJSF pre-ticks it as a default.)
- **Enum labels.** `oneOf: [{const, title}]` is schema-native but RJSF's
  `constAsDefaults` pre-selects the first option, which lets a required select
  pass untouched. `enum` + `ui:enumNames` avoids that and yields one error
  instead of two.
- **Per-rule messages.** JSON Schema has no message keyword and
  `@rjsf/validator-ajv8` does not bundle ajv-errors. Messages ride on
  `transformErrors`, an RJSF prop, so the API is `{schema, uiSchema,
  transformErrors}` rather than the two-member shape first proposed.

## 2. Which mappings are direct, lossy, or impossible?

**Direct** (same meaning, verified by AJV and by rendering): field order,
title, labels, placeholders, required, defaults, choices, `minLength`,
`maxLength`, `pattern`, `min`/`max`, `minSelectedCount`/`maxSelectedCount`,
submit button text, the `email` format.

**Lossy** (compiles, with something changed or dependent on the caller):

- Per-rule messages survive only if the caller passes `transformErrors`.
- `submitButton.position` has no RJSF counterpart.
- Enum labels live in the uiSchema, not the schema, for the reason above.
- Any content the compiler had to normalise: a missing label becomes the
  name, a choice without a value is dropped, an unparsable operand is dropped.
  Each is reported.

**Impossible** in RJSF-native terms:

- Custom field types registered through `formSchema({fields})`: opaque.
- `file` size (`maxSize`): no JSON Schema keyword reads a data URL's length.
  (`file` itself was not compiled in this spike; see mapping.md for the rest.)
- `minDate`/`maxDate` without enabling AJV's `formatMinimum`/`formatMaximum`.

Nine of the sixteen field types were left out of the spike on purpose
(`color`, `date`, `datetime-local`, `file`, `hidden`, `range`, `tel`, `time`,
`url`). Their mappings are written down and are all direct or lossy in the
same ways; none of them changes the conclusion.

## 3. Does `sanity-rjsf` justify becoming a maintained package?

**As a package: yes, but a small one; as a project: only if RJSF is the
renderer you are committing to.**

For it: the adapter is ~400 lines with no runtime dependencies, type-only
peers, deterministic output, and a diagnostics contract that makes content
problems visible instead of silent. Filling in the nine remaining types is a
day of work. Maintenance load is bounded by form-toolkit's schema, which is
small and has been stable across 3.0.x.

Against it: the value delivered is exactly "RJSF widgets, themes and AJV for
form-toolkit content". If the site already has a form library, form-toolkit's
own `FormRenderer` with `fieldComponents` may be enough. And two of the
findings that shaped the output (`constAsDefaults`, the shadcn radio default)
are RJSF-side behaviours a maintainer has to track across RJSF releases.

A reasonable shape for the maintained version: publish `toRjsf` as is, add the
nine types, keep the diagnostics codes stable, and pin a tested RJSF major.
Do not add a React wrapper; RJSF's `Form` is the wrapper.

## 4. What limitations belong to `@sanity/form-toolkit` rather than this adapter?

Nothing an adapter can add is missing because of the adapter. The ceiling is
the authoring model:

- **No field descriptions or help text.** The most-requested form feature
  after labels, and there is no field to map.
- **No conditional logic, pages, sections, or nesting.** One flat list.
- **No "required" message.** Only rule messages exist.
- **Every operand is a string** (`"3"`, `"5000000"`), so unit and type are
  conventions the adapter has to know, not data.
- **`checkbox` is overloaded**: a boolean without choices, a group with them.
  The Studio hides `options` for it, so a boolean cannot carry a default.
- **Loose types.** `FormDataProps` types `type` and `validation[].type` as
  `string`; the real vocabulary is only in the plugin's runtime table
  (`validationTypesByFieldType`), which is not exported. The adapter copies it.
- **Field names are only checked in the Studio**; a dataset can still hold
  duplicates or reserved names, which is why the adapter re-checks them.
- Only one type is exported (`FormDataProps`); `FormField` and friends have to
  be derived from it.

None of these is a defect of form-toolkit's stated scope, which is deliberately
minimal. They are the boundary any renderer adapter will hit.

## 5. What should a second JSON Forms spike test before introducing any shared abstraction?

The temptation is a shared `FormDefinition` between adapters. Do not build one
until a JSON Forms spike has answered these, because they are exactly the
places where RJSF's answer would be the wrong abstraction for JSON Forms:

1. **Where labels live.** JSON Forms reads enum labels from the schema
   (`oneOf`/`const`/`title`) and has no `ui:enumNames`. If JSON Forms needs
   `oneOf`, then "choices" compile differently per target and a shared
   representation must keep values and labels, not a compiled `enum`.
2. **Required checkbox and required group.** Does JSON Forms' AJV setup honour
   `enum: [true]` and `minItems: 1` with a usable error, or does it need its
   own rule? This decides whether "required" can be one boolean in a shared
   model or needs per-target expansion.
3. **Per-rule messages.** JSON Forms has `i18n` translation hooks and error
   translation, not `transformErrors`. If the shared model carries messages,
   the delivery mechanism is per target; test that the same `(field, keyword)
   → message` table is enough for both.
4. **Placeholders and widgets.** JSON Forms puts them in `uischema.options`
   on `Control` elements, which are positional rather than keyed by property.
   Test that a flat list of fields is sufficient to generate the `Control`
   layout and that nothing in RJSF's `ui:order` model leaks in.
5. **Defaults.** Does JSON Forms' `constAsDefaults`-equivalent behaviour
   exist? If not, the `enum`-not-`oneOf` decision is RJSF-only and must not be
   generalised.
6. **Diagnostics parity.** The same fixtures (`test/fixtures`) should produce
   the same diagnostic codes from both compilers. If they cannot, the shared
   part is the diagnostics contract and the fixtures, not the compiler.

If both spikes agree on 1 to 5, the shared abstraction is small: form-toolkit's
document plus a normalisation pass (trimmed names, validated operands,
deduplicated choices) that both compilers consume. If they disagree on 1 or 2,
the right shared artefact is the fixture set and the diagnostics vocabulary,
and each adapter stays a standalone compiler from form-toolkit's own type,
which is what this spike built.
