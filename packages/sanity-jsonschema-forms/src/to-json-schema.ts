import type {JSONSchema7} from 'json-schema'

import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  FormToolkitChoice,
  FormToolkitField,
  FormToolkitForm,
  FormToolkitValidationRule,
  MessageKeyword,
  MessageMap,
  ToJsonSchemaResult,
} from './types'

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

/** The field types compiled today. Everything else is dropped with a diagnostic; see docs/compatibility.md. */
export const SUPPORTED_FIELD_TYPES = ['text', 'textarea', 'email', 'number', 'checkbox', 'select', 'radio'] as const satisfies readonly FormToolkitFieldType[]

export type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES)[number]

/** form-toolkit rule type → JSON Schema keyword (also AJV's error `keyword`). */
const RULE_KEYWORDS = {
  minLength: 'minLength',
  maxLength: 'maxLength',
  pattern: 'pattern',
  min: 'minimum',
  max: 'maximum',
  minSelectedCount: 'minItems',
  maxSelectedCount: 'maxItems',
} as const satisfies Record<string, MessageKeyword>

type RuleType = keyof typeof RULE_KEYWORDS

/** form-toolkit has no message for "required"; this is the one message the compiler supplies. */
export const CHECKBOX_REQUIRED_MESSAGE = 'This box must be checked.'

const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/
const RESERVED_NAMES = new Set(Object.getOwnPropertyNames(Object.prototype))

const isFormToolkitType = (value: string): value is FormToolkitFieldType => Object.hasOwn(FORM_TOOLKIT_FIELD_TYPES, value)
export const isSupportedType = (value: string): value is SupportedFieldType => (SUPPORTED_FIELD_TYPES as readonly string[]).includes(value)
const isRuleType = (value: string): value is RuleType => Object.hasOwn(RULE_KEYWORDS, value)

const trimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text.length === 0 ? undefined : text
}

class Diagnostics {
  readonly list: Diagnostic[] = []
  add(severity: DiagnosticSeverity, code: DiagnosticCode, path: string, message: string, field?: string) {
    this.list.push(field === undefined ? {severity, code, path, message} : {severity, code, path, field, message})
  }
}

interface FieldContext {
  path: string
  name: string
  field: FormToolkitField
  diagnostics: Diagnostics
  messages: MessageMap
}

const isCheckboxGroup = (field: FormToolkitField): boolean => (field.choices ?? []).some((choice) => trimmed(choice?.value) !== undefined)

/** `checkbox` is overloaded: no choices means one boolean, choices mean a multi-select. */
type CompiledType = Exclude<SupportedFieldType, 'checkbox'> | 'boolean' | 'multiselect'

const compiledType = (field: FormToolkitField): CompiledType | undefined => {
  const type = trimmed(field.type)
  if (type === undefined || !isSupportedType(type)) return undefined
  if (type === 'checkbox') return isCheckboxGroup(field) ? 'multiselect' : 'boolean'
  return type
}

const applicableRules = (field: FormToolkitField): readonly string[] => {
  const type = trimmed(field.type)
  if (type === undefined || !isFormToolkitType(type)) return []
  if (type === 'checkbox' && !isCheckboxGroup(field)) return []
  return FORM_TOOLKIT_FIELD_TYPES[type]
}

const recordMessage = (ctx: FieldContext, keyword: MessageKeyword, message: string): void => {
  ctx.messages[ctx.name] = {...ctx.messages[ctx.name], [keyword]: message}
}

const applyRules = (schema: JSONSchema7, ctx: FieldContext): void => {
  const {diagnostics, path, name, field} = ctx
  ;(field.validation ?? []).forEach((rule: FormToolkitValidationRule | null | undefined, index) => {
    const label = `Validation rule ${index + 1}`
    const ruleType = trimmed(rule?.type)
    if (ruleType === undefined || !isRuleType(ruleType)) {
      diagnostics.add('warning', 'unsupported-validation-rule', path, `${label} ("${ruleType ?? '(none)'}") has no JSON Schema counterpart in this adapter and was dropped.`, name)
      return
    }
    if (!applicableRules(field).includes(ruleType)) {
      diagnostics.add('warning', 'inapplicable-validation-rule', path, `${label} ("${ruleType}") does not apply to a "${field.type}" field and was dropped.`, name)
      return
    }
    const operand = trimmed(rule?.value)
    if (operand === undefined) {
      diagnostics.add('warning', 'invalid-validation-rule', path, `${label} ("${ruleType}") has no value and was dropped.`, name)
      return
    }
    const keyword = RULE_KEYWORDS[ruleType]
    let value: number | string
    if (ruleType === 'pattern') {
      try {
        new RegExp(operand, 'u')
      } catch {
        diagnostics.add('warning', 'invalid-validation-rule', path, `${label} is not a valid regular expression ("${operand}") and was dropped.`, name)
        return
      }
      value = operand
    } else {
      const parsed = Number(operand)
      const needsInteger = keyword === 'minLength' || keyword === 'maxLength' || keyword === 'minItems' || keyword === 'maxItems'
      if (needsInteger ? !(Number.isInteger(parsed) && parsed >= 0) : !Number.isFinite(parsed)) {
        diagnostics.add('warning', 'invalid-validation-rule', path, `${label} ("${ruleType}") needs ${needsInteger ? 'a whole number of 0 or more' : 'a number'}, not "${operand}", and was dropped.`, name)
        return
      }
      value = parsed
    }
    ;(schema as Record<string, unknown>)[keyword] = value
    const message = trimmed(rule?.message)
    if (message !== undefined) recordMessage(ctx, keyword, message)
  })
}

/**
 * Choices as `oneOf` consts with `title`: the schema-native way to label an
 * option, readable by any consumer. RJSF treats a `oneOf` const as a default;
 * the RJSF adapter turns that off rather than bending the schema.
 */
const compileChoices = (ctx: FieldContext): JSONSchema7[] => {
  const {diagnostics, path, name, field} = ctx
  const seen = new Set<string>()
  const out: JSONSchema7[] = []
  ;(field.choices ?? []).forEach((choice: FormToolkitChoice | null | undefined, index) => {
    const value = trimmed(choice?.value)
    if (value === undefined) {
      diagnostics.add('warning', 'invalid-choice', path, `Choice ${index + 1} has no value and was dropped.`, name)
      return
    }
    if (seen.has(value)) {
      diagnostics.add('warning', 'invalid-choice', path, `Choice ${index + 1} repeats the value "${value}" and was dropped.`, name)
      return
    }
    seen.add(value)
    out.push({const: value, title: trimmed(choice?.label) ?? value})
  })
  return out
}

/** Placeholders never enter the schema; only the loss on radio/checkbox is reported. */
const reportPlaceholder = (ctx: FieldContext, hasInput: boolean): void => {
  const placeholder = trimmed(ctx.field.options?.placeholder)
  if (placeholder !== undefined && !hasInput) {
    ctx.diagnostics.add('info', 'ignored-placeholder', ctx.path, `A "${ctx.field.type}" field has no text input to show placeholder text in, so "${placeholder}" was ignored.`, ctx.name)
  }
}

const compileField = (type: CompiledType, ctx: FieldContext): JSONSchema7 => {
  const {field, diagnostics, path, name} = ctx
  const label = trimmed(field.label)
  if (label === undefined) diagnostics.add('info', 'missing-label', path, `"${name}" has no label, so its name is shown instead.`, name)
  const storedDefault = trimmed(field.options?.defaultValue)
  const schema: JSONSchema7 = {title: label ?? name}

  switch (type) {
    case 'text':
    case 'email':
    case 'textarea': {
      schema.type = 'string'
      if (type === 'email') schema.format = 'email'
      if (storedDefault !== undefined) schema.default = storedDefault
      reportPlaceholder(ctx, true)
      applyRules(schema, ctx)
      return schema
    }
    case 'number': {
      schema.type = 'number'
      if (storedDefault !== undefined) {
        const parsed = Number(storedDefault)
        if (Number.isFinite(parsed)) schema.default = parsed
        else diagnostics.add('warning', 'invalid-default-value', path, `"${storedDefault}" is not a number, so the default value was dropped.`, name)
      }
      reportPlaceholder(ctx, true)
      applyRules(schema, ctx)
      return schema
    }
    case 'boolean': {
      schema.type = 'boolean'
      if (storedDefault !== undefined) {
        if (storedDefault === 'true' || storedDefault === 'false') schema.default = storedDefault === 'true'
        else diagnostics.add('warning', 'invalid-default-value', path, `"${storedDefault}" is not "true" or "false", so the default value was dropped.`, name)
      }
      // `required` checks presence; an unticked box is `false`, which is
      // present. `const: true` is the idiomatic constraint; a renderer that
      // reads `const` as a default has to be told not to (RJSF adapter).
      if (field.required === true) {
        schema.const = true
        recordMessage(ctx, 'const', CHECKBOX_REQUIRED_MESSAGE)
      }
      reportPlaceholder(ctx, false)
      applyRules(schema, ctx)
      return schema
    }
    case 'select':
    case 'radio':
    case 'multiselect': {
      const oneOf = compileChoices(ctx)
      if (type === 'multiselect') {
        schema.type = 'array'
        schema.uniqueItems = true
        schema.items = {type: 'string', oneOf}
        if (storedDefault !== undefined) {
          diagnostics.add('info', 'ignored-default-value', path, `A checkbox group cannot carry a default value, so "${storedDefault}" was ignored.`, name)
        }
        reportPlaceholder(ctx, false)
        applyRules(schema, ctx)
        if (field.required === true && !(typeof schema.minItems === 'number' && schema.minItems >= 1)) schema.minItems = 1
        return schema
      }
      schema.type = 'string'
      schema.oneOf = oneOf
      if (storedDefault !== undefined) {
        if (oneOf.some((option) => option.const === storedDefault)) schema.default = storedDefault
        else diagnostics.add('warning', 'invalid-default-value', path, `"${storedDefault}" is not one of the choices, so the default value was dropped.`, name)
      }
      reportPlaceholder(ctx, type === 'select')
      applyRules(schema, ctx)
      return schema
    }
  }
}

/**
 * Compiles a `@sanity/form-toolkit` form document into draft-07 JSON Schema
 * plus the editor-written messages that JSON Schema cannot carry.
 *
 * Renderer-independent on purpose: nothing here knows about RJSF or JSON
 * Forms. Never throws on content; every loss is a diagnostic.
 */
export const toJsonSchema = (form: FormToolkitForm): ToJsonSchemaResult => {
  const diagnostics = new Diagnostics()
  const messages: MessageMap = {}
  const properties: Record<string, JSONSchema7> = {}
  const required: string[] = []

  ;(form.fields ?? []).forEach((field, index) => {
    const path = `fields[${index}]`
    if (field === null || typeof field !== 'object') {
      diagnostics.add('error', 'unknown-field-type', path, 'The array member is not a field object and was dropped.')
      return
    }
    const sourceType = trimmed(field.type)
    const name = trimmed(field.name)
    if (sourceType === undefined || !isFormToolkitType(sourceType)) {
      diagnostics.add(
        'error',
        'unknown-field-type',
        path,
        sourceType === undefined
          ? 'The field declares no type and was dropped.'
          : `"${sourceType}" is not a field type @sanity/form-toolkit defines (custom types registered with formSchema({fields}) are opaque to this adapter), so the field was dropped.`,
        name,
      )
      return
    }
    const type = compiledType(field)
    if (type === undefined) {
      diagnostics.add('error', 'unsupported-field-type', path, `"${sourceType}" is not supported yet (supported: ${SUPPORTED_FIELD_TYPES.join(', ')}), so the field was dropped.`, name)
      return
    }
    if (name === undefined || !FIELD_NAME_PATTERN.test(name) || RESERVED_NAMES.has(name)) {
      diagnostics.add('error', 'invalid-field-name', path, `The field has no usable name ("${name ?? ''}") and was dropped.`, name)
      return
    }
    if (Object.hasOwn(properties, name)) {
      diagnostics.add('error', 'duplicate-field-name', path, `"${name}" is already used by an earlier field, so the later field was dropped.`, name)
      return
    }
    if ((type === 'select' || type === 'radio' || type === 'multiselect') && !isCheckboxGroup(field)) {
      diagnostics.add('error', 'missing-choices', path, `"${name}" offers no choices, so nothing could be selected; the field was dropped.`, name)
      return
    }
    properties[name] = compileField(type, {path, name, field, diagnostics, messages})
    if (field.required === true) required.push(name)
  })

  const schema: JSONSchema7 = {type: 'object', properties}
  const title = trimmed(form.title)
  if (title !== undefined) schema.title = title
  if (required.length > 0) schema.required = required
  if (form.submitButton?.position !== undefined) {
    diagnostics.add('info', 'lossy-submit-position', 'form', `RJSF has no submit button alignment option, so position "${form.submitButton.position}" is left to the theme.`)
  }

  return {schema, messages, diagnostics: diagnostics.list}
}
