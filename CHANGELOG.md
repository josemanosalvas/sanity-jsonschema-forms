# Changelog

All notable changes to `sanity-jsonschema-forms`. Semantic versioning; until
`1.0`, breaking changes bump the minor version.

## 0.2.0 (2026-09-04)

Every built-in `@sanity/form-toolkit` field type that has a portable JSON
Schema representation now compiles: fifteen of sixteen. Each has a
researched status in `docs/compatibility.md`: supported, supported with a
lossy rule, or unsupported. The canonical schema stays JSON Schema Draft 7
with no validator extension.

- Added: `url` (`format: uri`), `tel` (`string`), `hidden` (`string` with
  `default`), `color` (pattern for `#rrggbb`), `date` (`format: date`),
  `datetime-local` and `time` (patterns for the native local value, no
  timezone; AJV's RFC 3339 formats would reject every value those inputs
  produce), `range` (`number` with `minimum`/`maximum`; `step` becomes
  `multipleOf` only when the step is a whole number and the HTML step base
  is a multiple of it).
- Added: diagnostic `lossy-validation-rule` for `minDate`/`maxDate` (no
  Draft 7 keyword; `formatMinimum` is an AJV extension) and for a `step`
  that `multipleOf` cannot reproduce; `missing-default-value` for a
  required `hidden` field with no default. Existing codes are unchanged.
- Added: `TIME_PATTERN`, `DATETIME_LOCAL_PATTERN`, `COLOR_PATTERN` exports;
  `multipleOf` in `MessageKeyword`.
- Adapters: RJSF names a widget or native input type per field and keeps
  the native `datetime-local`/`time` values untouched; JSON Forms omits
  the control for a hidden field and seeds its value through
  `initialData`, asks for the time and slider cells; SurveyJS maps input
  types, keeps hidden values through completion
  (`clearInvisibleValues: 'none'`) and checks `multipleOf` with an
  expression validator. Per-renderer control support is tabled in
  `docs/compatibility.md`.
- `file` stays unsupported, now by decision rather than omission: no
  representation of a file gives the same submission to all three
  consumers. The reasoning is in `docs/compatibility.md`.
- Changed: a `minDate`/`maxDate`/`step`/`maxSize`/`fileType` rule on a
  field type that does not offer it is now `inapplicable-validation-rule`
  (was `unsupported-validation-rule`, which is now reserved for rule types
  form-toolkit does not define). `SupportedFieldType` widened; a
  `PresentationField` carries a placeholder only for types with a text
  input.
- Tests: `test/parity.test.ts` runs every fixture submission through plain
  AJV, `@rjsf/validator-ajv8`, JSON Forms' AJV and SurveyJS and pins the
  verdicts, listing where SurveyJS diverges.

## 0.1.1 (2026-09-04)

- Fix: the renderer adapters (RJSF, JSON Forms, SurveyJS) took presentation
  from a dropped field when a later valid field reused its name. A `select`
  with no choices followed by a `radio` of the same name compiled correctly
  but rendered as a select. The adapters now run the compiler's own
  acceptance check, so the field that survived is the one that decides
  radio versus select and the placeholder. No public API change.

## 0.1.0 (2026-09-04)

First release.

- `toJsonSchema(form)`: compiles a `@sanity/form-toolkit` form document to
  JSON Schema Draft 7, declared by `$schema`, with a message map and
  diagnostics. The form document is typed structurally; `@sanity/form-toolkit`
  is not a peer dependency. Field types:
  `text`, `textarea`, `email`, `number`, `checkbox` (boolean or group),
  `select`, `radio`. Rules: `minLength`, `maxLength`, `pattern`, `min`,
  `max`, `minSelectedCount`, `maxSelectedCount`.
- `sanity-jsonschema-forms/rjsf`: `toRjsfProps` for react-jsonschema-form 6.
- `sanity-jsonschema-forms/jsonforms`: `toJsonFormsProps` for JSON Forms 3.8.
- `sanity-jsonschema-forms/surveyjs`: `toSurveyJsProps` for SurveyJS 3.

Not yet compiled: `url`, `tel`, `hidden`, `date`, `datetime-local`, `time`,
`range`, `color`, `file`. See `docs/compatibility.md`.
