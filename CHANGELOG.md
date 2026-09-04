# Changelog

All notable changes to `sanity-jsonschema-forms`. Semantic versioning; until
`1.0`, breaking changes bump the minor version.

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
