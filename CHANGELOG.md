# Changelog

All notable changes to `sanity-jsonschema-forms`. Semantic versioning; until
`1.0`, breaking changes bump the minor version.

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
