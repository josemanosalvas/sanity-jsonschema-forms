import type {RJSFSchema, RJSFValidationError, UiSchema} from '@rjsf/utils'
import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'

/**
 * The form document as `@sanity/form-toolkit` types it. This package adds no
 * type of its own for the authoring side: everything below is derived from
 * the one type form-toolkit exports.
 */
export type FormToolkitForm = FormDataProps
export type FormToolkitField = NonNullable<FormDataProps['fields']>[number]
export type FormToolkitValidationRule = NonNullable<FormToolkitField['validation']>[number]
export type FormToolkitChoice = NonNullable<FormToolkitField['choices']>[number]

export type DiagnosticSeverity = 'error' | 'warning' | 'info'

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

/**
 * One thing the compiler could not carry across, or carried across with a
 * change in meaning. `error` means a field was dropped; `warning` means a
 * constraint or value was dropped; `info` means nothing was lost but the
 * result differs from what an editor might expect.
 */
export interface Diagnostic {
  severity: DiagnosticSeverity
  code: DiagnosticCode
  /** Position in the source `fields` array, e.g. `fields[2]`, or `form`. */
  path: string
  /** The field's `name`, when it had one. */
  field?: string
  message: string
}

export type TransformErrors = (
  errors: RJSFValidationError[],
  uiSchema?: UiSchema,
) => RJSFValidationError[]

export interface ToRjsfResult {
  /** JSON Schema for RJSF and AJV. */
  schema: RJSFSchema
  /** RJSF ui schema: widgets, placeholders, order, submit button text. */
  uiSchema: UiSchema
  /**
   * Rewrites AJV errors with the per-rule messages editors wrote in the
   * Studio. Pass it as RJSF's `transformErrors` prop. JSON Schema has no
   * message keyword, so this is the only RJSF-native place they can live.
   */
  transformErrors: TransformErrors
  /** Everything that did not map one-to-one, in source order. */
  diagnostics: Diagnostic[]
}
