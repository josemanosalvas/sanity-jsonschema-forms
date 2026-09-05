import type {JSONSchema7} from 'json-schema'

/**
 * The form document as `@sanity/form-toolkit` stores it, limited to the properties this package reads.
 * `test/types.test.ts` checks that form-toolkit's `FormDataProps` is assignable to it, so consumers need not install form-toolkit.
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
  | 'invalid-form'
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
  | 'lossy-validation-rule'
  | 'invalid-default-value'
  | 'ignored-default-value'
  | 'missing-default-value'
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
export type MessageKeyword =
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'minimum'
  | 'maximum'
  | 'multipleOf'
  | 'minItems'
  | 'maxItems'
  | 'const'

/** Editor-written error messages by field name, then by the AJV keyword whose failure they describe. */
export type MessageMap = Record<string, Partial<Record<MessageKeyword, string>>>

export interface ToJsonSchemaResult {
  /** JSON Schema Draft 7, declared by `$schema`. No `ui:*`, no `errorMessage`, no `$id`, no validator extensions. */
  schema: JSONSchema7
  messages: MessageMap
  /** Everything that did not map one-to-one, in source order. */
  diagnostics: Diagnostic[]
}
