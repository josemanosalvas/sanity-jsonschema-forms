# Changelog

All notable changes to `sanity-jsonschema-forms`. Semantic versioning; until
`1.0`, breaking changes bump the minor version.

## Unreleased

- `test/properties.test.ts`: fast-check invariants over arbitrary form
  documents. `toJsonSchema` never throws, is a pure function of its input,
  produces a schema AJV's Draft 7 metaschema accepts, emits no default
  outside its type's value shape, names only existing properties in
  `required`, `messages` and `diagnostics`, and keeps the same source
  field as the adapters' presentation helper for every property.
- Fixed: an `email` default was emitted unchecked, so `not-an-email`
  could start a form invalid under its own `format: email`. It is now
  checked with the grammar ajv-formats uses and dropped with
  `invalid-default-value`, like a bad `url` default.
- The compiler's patterns use `[0-9]` instead of `\d` and no lookahead;
  `NONZERO_YEAR_PATTERN` now also requires four year digits before the `-`.

## 0.2.0 (2026-09-04)

Every built-in `@sanity/form-toolkit` field type that has a portable JSON
Schema representation now compiles: fifteen of sixteen. Each has a
researched status in `docs/compatibility.md`: supported, supported with a
lossy rule, or unsupported. The canonical schema stays JSON Schema Draft 7
with no validator extension.

- Added: `url` (`format: uri`; narrower than the native input, which also
  accepts unencoded non-ASCII; a default is kept only when it satisfies the
  RFC 3986 grammar the format uses, not just the native input's parser),
  `tel` (`string`), `hidden` (`string` with `default`), `color` (pattern
  for `#rrggbb`), `date` (`format: date` plus a pattern excluding year
  `0000`; narrower than the native input, which also takes years of five
  or more digits), `datetime-local`
  (pattern implementing the HTML local date and time value: leap years,
  year > 0, four or more year digits, no timezone) and `time` (pattern for
  the native value, no timezone; AJV's RFC 3339 formats would reject every
  value those inputs produce), `range` (`number` with `minimum`/`maximum`;
  `step` becomes `multipleOf` only when the step is a whole number and the
  HTML step base is a multiple of it).
- Added: diagnostic `lossy-validation-rule` for `minDate`/`maxDate` (no
  Draft 7 keyword; `formatMinimum` is an AJV extension) and for a `step`
  that `multipleOf` cannot reproduce; `missing-default-value` for a
  required `hidden` field with no default. Existing codes are unchanged.
- Added: `TIME_PATTERN`, `DATETIME_LOCAL_PATTERN`, `COLOR_PATTERN`,
  `NONZERO_YEAR_PATTERN` exports; `multipleOf` in `MessageKeyword`.
- Adapters: RJSF names a widget or native input type per field and keeps
  the native `datetime-local`/`time` values untouched; JSON Forms omits
  the control for a hidden field and seeds its value through
  `initialData`, asks for the time and slider cells. Per-renderer control
  support is tabled in `docs/compatibility.md`.
- Removed (breaking): `sanity-jsonschema-forms/surveyjs`. It was a spike
  that was not pursued; SurveyJS does not consume JSON Schema as its
  contract. The spike stays tagged `surveyjs-spike-v3`.
- `file` stays unsupported, now by decision rather than omission: it is
  deferred because form-toolkit defines a native file input but no JSON
  representation of the submitted file, and choosing one would be a
  submission and upload contract of this package's own. The reasoning is
  in `docs/compatibility.md`.
- Changed: a `minDate`/`maxDate`/`step`/`maxSize`/`fileType` rule on a
  field type that does not offer it is now `inapplicable-validation-rule`
  (was `unsupported-validation-rule`, which is now reserved for rule types
  form-toolkit does not define). `SupportedFieldType` widened; a
  `PresentationField` carries a placeholder only for types with a text
  input.
- Tests: `test/parity.test.ts` runs every fixture submission through plain
  AJV, `@rjsf/validator-ajv8` and JSON Forms' AJV and pins the verdicts;
  `test/ajv.test.ts` validates every emitted default against its own
  property schema.

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
