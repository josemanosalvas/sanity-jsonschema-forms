import type {DiagnosticCode, FormToolkitField} from '../types'

/**
 * Every field type the `formSchema` Studio plugin offers (3.0.17), with the
 * validation rule types the Studio lets an editor attach to each. Copied from
 * the plugin's `validationTypesByFieldType`, which it does not export.
 */
export const FORM_TOOLKIT_FIELD_TYPES = {
  checkbox: ['minSelectedCount', 'maxSelectedCount'],
  color: [],
  date: ['minDate', 'maxDate'],
  'datetime-local': ['minDate', 'maxDate'],
  email: ['pattern'],
  file: ['maxSize', 'fileType'],
  hidden: [],
  number: ['min', 'max'],
  radio: [],
  range: ['min', 'max', 'step'],
  select: [],
  tel: ['pattern'],
  text: ['minLength', 'maxLength', 'pattern'],
  textarea: ['minLength', 'maxLength'],
  time: [],
  url: ['pattern'],
} as const satisfies Record<string, readonly string[]>

type FormToolkitFieldType = keyof typeof FORM_TOOLKIT_FIELD_TYPES

/** Every type but `file`: form-toolkit defines no JSON submission representation of one; see docs/compatibility.md. */
export const SUPPORTED_FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'url',
  'tel',
  'hidden',
  'number',
  'range',
  'checkbox',
  'select',
  'radio',
  'date',
  'datetime-local',
  'time',
  'color',
] as const satisfies readonly FormToolkitFieldType[]

export type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES)[number]

const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/u
const RESERVED_NAMES = new Set(Object.getOwnPropertyNames(Object.prototype))

const isFormToolkitType = (value: string): value is FormToolkitFieldType => Object.hasOwn(FORM_TOOLKIT_FIELD_TYPES, value)
export const isSupportedType = (value: string): value is SupportedFieldType => (SUPPORTED_FIELD_TYPES as readonly string[]).includes(value)
export const trimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const text = value.trim()
  return text.length === 0 ? undefined : text
}

const isCheckboxGroup = (field: FormToolkitField): boolean => (field.choices ?? []).some((choice) => trimmed(choice?.value) !== undefined)

/** `checkbox` is overloaded: no choices means one boolean, choices mean a multi-select. */
export type CompiledType = Exclude<SupportedFieldType, 'checkbox'> | 'boolean' | 'multiselect'

export interface AcceptedField {
  accepted: true
  name: string
  /** The editor's `type`; textarea/text and radio/select share a schema. */
  sourceType: SupportedFieldType
  type: CompiledType
}

export interface DroppedField {
  accepted: false
  code: DiagnosticCode
  message: string
  name: string | undefined
}

/**
 * Accepts or drops a field on its type, name and choices. Duplicate names
 * depend on the fields before it and are the caller's decision. Shared by
 * `toJsonSchema` and `presentationFields` so both keep the same field.
 */
export const classifyField = (field: FormToolkitField): AcceptedField | DroppedField => {
  const sourceType = trimmed(field.type)
  const name = trimmed(field.name)
  if (sourceType === undefined || !isFormToolkitType(sourceType)) {
    return {
      accepted: false,
      code: 'unknown-field-type',
      message: `Unknown field type "${sourceType ?? ''}"; the field was dropped.`,
      name,
    }
  }
  if (sourceType === 'file') {
    return {
      accepted: false,
      code: 'unsupported-field-type',
      message: 'File fields need an application-defined upload representation and are not compiled.',
      name,
    }
  }
  if (name === undefined || !FIELD_NAME_PATTERN.test(name) || RESERVED_NAMES.has(name)) {
    return {accepted: false, code: 'invalid-field-name', message: `The field has no usable name ("${name ?? ''}") and was dropped.`, name}
  }
  if (field.choices !== undefined && field.choices !== null && !Array.isArray(field.choices)) {
    return {accepted: false, code: 'invalid-choice', message: 'Choices must be an array; the field was dropped.', name}
  }
  let type: CompiledType
  if (sourceType === 'checkbox') {
    type = isCheckboxGroup(field) ? 'multiselect' : 'boolean'
  } else {
    type = sourceType
  }
  if ((type === 'select' || type === 'radio') && !isCheckboxGroup(field)) {
    return {
      accepted: false,
      code: 'missing-choices',
      message: `"${name}" offers no choices, so nothing could be selected; the field was dropped.`,
      name,
    }
  }
  return {accepted: true, name, sourceType, type}
}
