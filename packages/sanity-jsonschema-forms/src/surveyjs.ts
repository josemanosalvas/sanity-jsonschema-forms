import type {JSONSchema7, JSONSchema7Definition} from 'json-schema'

import {presentationFields} from './internal/fields'
import type {PresentationField} from './internal/fields'
import type {FormToolkitForm, MessageMap, ToJsonSchemaResult} from './types'

/**
 * SurveyJS survey JSON. survey-core has no exported type for its JSON, so
 * the shape below names only the properties this adapter writes.
 */
export interface SurveyValidatorJson {
  type: 'text' | 'numeric' | 'regex' | 'email' | 'expression' | 'answercount'
  text?: string
  minLength?: number
  maxLength?: number
  minValue?: number
  maxValue?: number
  regex?: string
  expression?: string
  minCount?: number
  maxCount?: number
}

export interface SurveyChoiceJson {
  value: string
  text: string
}

export interface SurveyQuestionJson {
  type: 'text' | 'comment' | 'boolean' | 'dropdown' | 'radiogroup' | 'checkbox'
  name: string
  title: string
  isRequired?: boolean
  defaultValue?: unknown
  placeholder?: string
  inputType?: 'text' | 'email' | 'number' | 'url' | 'tel' | 'date' | 'datetime-local' | 'time' | 'range' | 'color'
  /** A hidden field: never shown, its default kept by `clearInvisibleValues: 'none'` on the survey. */
  visible?: false
  /** Slider bounds and step for `inputType: range`, from `minimum`, `maximum` and `multipleOf`. */
  min?: number
  max?: number
  step?: number
  renderAs?: 'checkbox'
  choices?: SurveyChoiceJson[]
  validators?: SurveyValidatorJson[]
}

export interface SurveyJson {
  title?: string
  showQuestionNumbers: 'off'
  /** Present when a hidden field exists: SurveyJS otherwise drops invisible questions' values on completion. */
  clearInvisibleValues?: 'none'
  completeText?: string
  elements: SurveyQuestionJson[]
}

/** Which question properties came from the schema and which needed the form. */
export interface SurveyJsProps {
  surveyJson: SurveyJson
  /** Question properties written from the JSON Schema alone. */
  fromSchema: string[]
  /** Question properties that needed the original form (presentation). */
  fromForm: string[]
}

const isSchema = (value: JSONSchema7Definition | JSONSchema7Definition[] | undefined): value is JSONSchema7 =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const choicesOf = (schema: JSONSchema7): SurveyChoiceJson[] =>
  (schema.oneOf ?? []).filter(isSchema).map((option) => ({text: option.title ?? String(option.const), value: String(option.const)}))

const withText = (validator: SurveyValidatorJson, text: string | undefined): SurveyValidatorJson =>
  text === undefined ? validator : {...validator, text}

/** JSON Schema keywords → SurveyJS validators, each carrying its authored message. */
const validatorsOf = (name: string, schema: JSONSchema7, messages: MessageMap): SurveyValidatorJson[] => {
  const m = messages[name] ?? {}
  const out: SurveyValidatorJson[] = []
  // One validator per keyword: a SurveyJS validator carries one message.
  if (schema.minLength !== undefined) {
    out.push(withText({minLength: schema.minLength, type: 'text'}, m.minLength))
  }
  if (schema.maxLength !== undefined) {
    out.push(withText({maxLength: schema.maxLength, type: 'text'}, m.maxLength))
  }
  if (schema.pattern !== undefined) {
    out.push(withText({regex: schema.pattern, type: 'regex'}, m.pattern))
  }
  if (schema.format === 'email') {
    out.push({type: 'email'})
  }
  if (schema.minimum !== undefined) {
    out.push(withText({minValue: schema.minimum, type: 'numeric'}, m.minimum))
  }
  if (schema.maximum !== undefined) {
    out.push(withText({maxValue: schema.maximum, type: 'numeric'}, m.maximum))
  }
  // SurveyJS has no multiple-of validator; an expression does the division.
  if (schema.multipleOf !== undefined) {
    out.push(withText({expression: `{${name}} % ${schema.multipleOf} = 0`, type: 'expression'}, m.multipleOf))
  }
  if (schema.minItems !== undefined) {
    out.push(withText({minCount: schema.minItems, type: 'answercount'}, m.minItems))
  }
  if (schema.maxItems !== undefined) {
    out.push(withText({maxCount: schema.maxItems, type: 'answercount'}, m.maxItems))
  }
  // SurveyJS counts an explicit "No" as an answer, so `isRequired` alone lets a
  // declined consent through; `const: true` needs its own expression.
  if (schema.const === true) {
    out.push(withText({expression: `{${name}} = true`, type: 'expression'}, m.const))
  }
  return out
}

/** Input types the schema implies on its own. */
const SCHEMA_INPUT_TYPES: Partial<Record<string, NonNullable<SurveyQuestionJson['inputType']>>> = {
  date: 'date',
  email: 'email',
  uri: 'url',
}

/** Input types only the source field type tells apart from `text` or `number`. */
const FORM_INPUT_TYPES: Partial<Record<string, NonNullable<SurveyQuestionJson['inputType']>>> = {
  color: 'color',
  'datetime-local': 'datetime-local',
  range: 'range',
  tel: 'tel',
  time: 'time',
}

const inputTypeOf = (
  schema: JSONSchema7,
  field: PresentationField | undefined,
): {inputType: NonNullable<SurveyQuestionJson['inputType']>; fromForm: boolean} => {
  const fromSchema = schema.format === undefined ? undefined : SCHEMA_INPUT_TYPES[schema.format]
  if (fromSchema !== undefined) {
    return {fromForm: false, inputType: fromSchema}
  }
  const fromForm = field === undefined ? undefined : FORM_INPUT_TYPES[field.type]
  if (fromForm !== undefined) {
    return {fromForm: true, inputType: fromForm}
  }
  return {fromForm: false, inputType: schema.type === 'number' ? 'number' : 'text'}
}

const questionOf = (
  name: string,
  schema: JSONSchema7,
  field: PresentationField | undefined,
  required: boolean,
  messages: MessageMap,
  fromForm: Set<string>,
): SurveyQuestionJson => {
  const isChoice = Array.isArray(schema.oneOf)
  const isGroup = schema.type === 'array'
  let type: SurveyQuestionJson['type']
  if (isGroup) {
    type = 'checkbox'
  } else if (isChoice) {
    type = field?.type === 'radio' ? 'radiogroup' : 'dropdown'
  } else if (schema.type === 'boolean') {
    type = 'boolean'
  } else if (field?.type === 'textarea') {
    type = 'comment'
  } else {
    type = 'text'
  }
  if (type === 'comment' || type === 'radiogroup') {
    fromForm.add('type')
  }

  const question: SurveyQuestionJson = {name, title: schema.title ?? name, type}
  if (required) {
    question.isRequired = true
  }
  if (schema.default !== undefined) {
    question.defaultValue = schema.default
  }
  if (type === 'text') {
    if (field?.type === 'hidden') {
      question.visible = false
      fromForm.add('visible')
    } else {
      const input = inputTypeOf(schema, field)
      question.inputType = input.inputType
      if (input.fromForm) {
        fromForm.add('inputType')
      }
      if (input.inputType === 'range') {
        if (typeof schema.minimum === 'number') {
          question.min = schema.minimum
        }
        if (typeof schema.maximum === 'number') {
          question.max = schema.maximum
        }
        if (typeof schema.multipleOf === 'number') {
          question.step = schema.multipleOf
        }
      }
    }
  }
  if (type === 'boolean') {
    question.renderAs = 'checkbox'
  }
  if (isGroup && isSchema(schema.items)) {
    question.choices = choicesOf(schema.items)
  } else if (isChoice) {
    question.choices = choicesOf(schema)
  }
  if (field?.placeholder !== undefined && (type === 'text' || type === 'comment' || type === 'dropdown')) {
    question.placeholder = field.placeholder
    fromForm.add('placeholder')
  }
  const validators = validatorsOf(name, schema, messages)
  if (validators.length > 0) {
    question.validators = validators
  }
  return question
}

/**
 * SurveyJS has no schema/uischema split, so the adapter rebuilds questions
 * from `compiled.schema` and reads the form only where the schema is silent
 * (textarea vs text, radio vs dropdown, the input type behind a pattern,
 * hidden, placeholder).
 */
export const toSurveyJsProps = (form: FormToolkitForm, compiled: ToJsonSchemaResult): SurveyJsProps => {
  const {schema, messages} = compiled
  const required = new Set(schema.required)
  const fields = new Map(presentationFields(form, schema).map((f) => [f.name, f]))
  const elements: SurveyQuestionJson[] = []
  const fromForm = new Set<string>()

  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    if (!isSchema(property)) {
      continue
    }
    elements.push(questionOf(name, property, fields.get(name), required.has(name), messages, fromForm))
  }

  const surveyJson: SurveyJson = {elements, showQuestionNumbers: 'off'}
  if (schema.title !== undefined) {
    surveyJson.title = schema.title
  }
  if (elements.some((question) => question.visible === false)) {
    surveyJson.clearInvisibleValues = 'none'
  }
  const submitText = form.submitButton?.text?.trim()
  if (submitText) {
    surveyJson.completeText = submitText
    fromForm.add('completeText')
  }

  const fromSchema = [
    'name',
    'title',
    'isRequired',
    'defaultValue',
    'inputType (text/email/number/url/date)',
    'min, max, step (range)',
    'choices',
    'validators',
    'type (text/boolean/dropdown/checkbox)',
  ]
  return {fromForm: [...fromForm], fromSchema, surveyJson}
}
