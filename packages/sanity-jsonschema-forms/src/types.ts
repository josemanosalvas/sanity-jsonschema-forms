import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'
import type {JSONSchema7} from 'json-schema'

/**
 * The form document as `@sanity/form-toolkit` types it. Derived from the one
 * type form-toolkit exports; this package adds no authoring type of its own.
 */
export type FormToolkitForm = FormDataProps
export type FormToolkitField = NonNullable<FormDataProps['fields']>[number]
export type FormToolkitValidationRule = NonNullable<FormToolkitField['validation']>[number]
export type FormToolkitChoice = NonNullable<FormToolkitField['choices']>[number]

export type DiagnosticSeverity = 'error' | 'warning' | 'info'

/** Stable vocabulary; add codes, never rename them. */
export type DiagnosticCode =
  | 'unsupported-field-type'
  | 'unknown-field-type'
  | 'invalid-field-name'
  | 'duplicate-field-name'
  | 'missing-label'
  | 'missing-choices'
  | 'invalid-choice'
  | 'unsupported-validation-rule'
  | 'inapplicable-validation-rule'
  | 'invalid-validation-rule'
  | 'invalid-default-value'
  | 'ignored-default-value'
  | 'ignored-placeholder'
  | 'lossy-submit-position'

export interface Diagnostic {
  severity: DiagnosticSeverity
  code: DiagnosticCode
  /** Position in the source `fields` array, e.g. `fields[2]`, or `form`. */
  path: string
  /** The field's `name`, when it had one. */
  field?: string
  message: string
}

/**
 * The AJV keywords an authored message can attach to. `const` is the one
 * keyword with no form-toolkit rule behind it: a required lone checkbox
 * compiles to `const: true`, and form-toolkit has no "required" message.
 */
export type MessageKeyword = 'minLength' | 'maxLength' | 'pattern' | 'minimum' | 'maximum' | 'minItems' | 'maxItems' | 'const'

/**
 * Editor-written error messages, keyed by field name and then by the AJV
 * keyword whose failure they describe. Standard JSON Schema has no message
 * keyword, so this travels beside the schema; each renderer adapter delivers
 * it through that renderer's own hook.
 */
export type MessageMap = Record<string, Partial<Record<MessageKeyword, string>>>

export interface ToJsonSchemaResult {
  /** Draft-07 JSON Schema. No `ui:*`, no `errorMessage`, no `$id`. */
  schema: JSONSchema7
  messages: MessageMap
  /** Everything that did not map one-to-one, in source order. */
  diagnostics: Diagnostic[]
}
