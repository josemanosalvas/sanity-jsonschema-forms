import type {JSONSchema7} from 'json-schema'

/**
 * The form document as `@sanity/form-toolkit` stores it, reduced to the
 * members this package reads. A structural copy of form-toolkit's
 * `FormDataProps`, checked against it in `test/types.test.ts`, so a frontend
 * can compile a fetched document without installing `@sanity/form-toolkit`,
 * whose peers include `sanity` itself.
 */
export interface FormToolkitForm {
  title: string
  fields?: FormToolkitField[]
  submitButton?: {
    text: string
    position: 'left' | 'center' | 'right'
  }
}

export interface FormToolkitField {
  type: string
  label?: string
  name: string
  required?: boolean
  validation?: FormToolkitValidationRule[]
  options?: {
    placeholder?: string
    defaultValue?: string
  }
  choices?: FormToolkitChoice[]
  _key?: string
}

export interface FormToolkitValidationRule {
  type: string
  value: string
  message: string
}

export interface FormToolkitChoice {
  label: string
  value: string
}

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
  /** JSON Schema Draft 7, declared by `$schema`. No `ui:*`, no `errorMessage`, no `$id`. */
  schema: JSONSchema7
  messages: MessageMap
  /** Everything that did not map one-to-one, in source order. */
  diagnostics: Diagnostic[]
}
