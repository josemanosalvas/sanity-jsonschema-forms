import type {Experimental_DefaultFormStateBehavior, RJSFSchema, RJSFValidationError, UiSchema} from '@rjsf/utils'

import {trimmed} from './internal/field'
import {presentationFields} from './internal/fields'
import type {FormToolkitForm, MessageKeyword, ToJsonSchemaResult} from './types'

export interface RjsfProps {
  /** The compiled schema, unchanged; typed for RJSF. */
  schema: RJSFSchema
  uiSchema: UiSchema
  /** Spread onto `<Form>`: stops RJSF treating `oneOf` consts and `const: true` as defaults. */
  formProps: {experimental_defaultFormStateBehavior: Experimental_DefaultFormStateBehavior}
  /** Pass as `<Form transformErrors>`: swaps AJV wording for the editor's messages. */
  transformErrors: (errors: RJSFValidationError[]) => RJSFValidationError[]
}

/** Source type → RJSF widget name. */
const WIDGETS: Partial<Record<string, string>> = {
  color: 'color',
  date: 'date',
  email: 'email',
  hidden: 'hidden',
  radio: 'radio',
  range: 'range',
  textarea: 'textarea',
  url: 'uri',
}

/**
 * Source type → native `<input type>` on RJSF's text widget, which hands
 * the value through untouched. RJSF's own `DateTimeWidget` converts to UTC
 * and its `TimeWidget` appends seconds.
 */
const INPUT_TYPES: Partial<Record<string, string>> = {
  'datetime-local': 'datetime-local',
  tel: 'tel',
  time: 'time',
}

/**
 * RJSF presentation for a compiled form. Everything here is a `ui:` option
 * or a `<Form>` prop; the schema passes through untouched.
 */
export const toRjsfProps = (form: FormToolkitForm, compiled: ToJsonSchemaResult): RjsfProps => {
  const {schema, messages} = compiled
  const uiSchema: UiSchema = {}
  const order: string[] = []

  for (const field of presentationFields(form, schema)) {
    const ui: UiSchema = {}
    const property = schema.properties?.[field.name]
    const isGroup = typeof property === 'object' && property.type === 'array'
    const widget = field.type === 'checkbox' && isGroup ? 'checkboxes' : WIDGETS[field.type]
    if (widget !== undefined) {
      ui['ui:widget'] = widget
    }
    const inputType = INPUT_TYPES[field.type]
    if (inputType !== undefined) {
      ui['ui:options'] = {inputType}
    }
    if (field.placeholder !== undefined) {
      ui['ui:placeholder'] = field.placeholder
    }
    // @rjsf/shadcn 6.8.0's RadioWidget hands the real value to the Radix
    // group as its default while encoding items by index; real values on
    // both sides make a default show as checked. Harmless in other themes.
    if (field.type === 'radio') {
      ui['ui:optionValueFormat'] = 'realValue'
    }
    if (Object.keys(ui).length > 0) {
      uiSchema[field.name] = ui
    }
    order.push(field.name)
  }
  uiSchema['ui:order'] = order
  const submitText = trimmed(form?.submitButton?.text)
  if (submitText) {
    uiSchema['ui:submitButtonOptions'] = {submitText}
  }

  const transformErrors = (errors: RJSFValidationError[]) =>
    errors.map((error) => {
      const name = error.property?.replace(/^\./u, '')
      const message = name === undefined ? undefined : messages[name]?.[error.name as MessageKeyword]
      return message === undefined ? error : {...error, message, stack: `${name}: ${message}`}
    })

  return {
    formProps: {experimental_defaultFormStateBehavior: {constAsDefaults: 'never'}},
    schema: schema as RJSFSchema,
    transformErrors,
    uiSchema,
  }
}
