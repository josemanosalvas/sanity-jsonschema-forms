# Changelog

All notable changes to `sanity-json-schema`. Semantic versioning; until
`1.0`, breaking changes bump the minor version.

## 0.1.0 (2026-09-04)

First release.

- `toJsonSchema(form)`: compiles a `@sanity/form-toolkit` form document to
  draft-07 JSON Schema with a message map and diagnostics. Field types:
  `text`, `textarea`, `email`, `number`, `checkbox` (boolean or group),
  `select`, `radio`. Rules: `minLength`, `maxLength`, `pattern`, `min`,
  `max`, `minSelectedCount`, `maxSelectedCount`.
- `sanity-json-schema/rjsf`: `toRjsfProps` for react-jsonschema-form 6.
- `sanity-json-schema/jsonforms`: `toJsonFormsProps` for JSON Forms 3.8.
- `sanity-json-schema/surveyjs`: `toSurveyJsProps` for SurveyJS 3.

Not yet compiled: `url`, `tel`, `hidden`, `date`, `datetime-local`, `time`,
`range`, `color`, `file`. See `docs/compatibility.md`.
