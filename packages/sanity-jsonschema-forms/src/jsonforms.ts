import type {ControlElement, JsonSchema7, Translator, UISchemaElement, VerticalLayout} from '@jsonforms/core'

import {trimmed} from './internal/field'
import {presentationFields} from './internal/fields'
import type {FormToolkitForm, MessageKeyword, ToJsonSchemaResult} from './types'

export interface JsonFormsProps {
  /** The compiled schema, unchanged; typed for JSON Forms. */
  schema: JsonSchema7
  uischema: UISchemaElement
  /** Pass as `<JsonForms i18n={{translate}}>`: answers `<field>.error.<keyword>` with the editor's message. */
  translate: Translator
  /**
   * Schema `default`s as a data object. JSON Forms does not apply defaults to
   * the data it is given (its AJV runs without `useDefaults`), so the host
   * must seed them; RJSF does this itself.
   */
  initialData: Record<string, unknown>
  /** JSON Forms renders no submit button; the host does. */
  submitText?: string
}

/** JSON Forms error-message key, as `i18n: <field>` on a control makes it. */
const ERROR_KEY = /^(?<field>.+)\.error\.(?<keyword>[^.]+)$/u

/**
 * JSON Forms presentation for a compiled form: one `VerticalLayout` of
 * `Control`s, with the input choice and placeholder in `options`. Labels
 * for choices need nothing here; JSON Forms reads `oneOf[].title`. A
 * hidden field gets no control at all: JSON Forms renders only what the
 * layout lists, and the value rides in `initialData`.
 */
export const toJsonFormsProps = (form: FormToolkitForm, compiled: ToJsonSchemaResult): JsonFormsProps => {
  const {schema, messages} = compiled
  const elements: ControlElement[] = []

  for (const field of presentationFields(form, schema)) {
    if (field.type === 'hidden') {
      continue
    }
    const options: Record<string, unknown> = {}
    if (field.type === 'textarea') {
      options.multi = true
    }
    if (field.type === 'radio') {
      options.format = 'radio'
    }
    // The schema carries a pattern, not `format: time`, so the time cell must be asked for.
    if (field.type === 'time') {
      options.format = 'time'
    }
    // The slider cell also needs `minimum`, `maximum` and `default` in the schema; without them a number input renders.
    if (field.type === 'range') {
      options.slider = true
    }
    if (field.placeholder !== undefined) {
      options.placeholder = field.placeholder
    }
    const control: ControlElement = {i18n: field.name, scope: `#/properties/${field.name}`, type: 'Control'}
    if (Object.keys(options).length > 0) {
      control.options = options
    }
    elements.push(control)
  }
  const uischema: VerticalLayout = {elements, type: 'VerticalLayout'}

  // Every non-error key (labels, descriptions, captions) must get its default
  // back, or JSON Forms blanks it.
  const translate = ((id: string, defaultMessage?: string) => {
    const match = ERROR_KEY.exec(id)
    const field = match?.groups?.field
    const keyword = match?.groups?.keyword
    if (field === undefined || keyword === undefined) {
      return defaultMessage
    }
    return messages[field]?.[keyword as MessageKeyword] ?? defaultMessage
  }) as Translator

  const initialData: Record<string, unknown> = {}
  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    if (typeof property === 'object' && property.default !== undefined) {
      initialData[name] = structuredClone(property.default)
    }
  }
  const submitText = trimmed(form?.submitButton?.text)
  const base = {initialData, schema: schema as JsonSchema7, translate, uischema}
  return submitText ? {...base, submitText} : base
}
