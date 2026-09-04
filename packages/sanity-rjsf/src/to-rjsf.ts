import type {RJSFSchema, RJSFValidationError, UiSchema} from '@rjsf/utils'

import type {
  Diagnostic,
  DiagnosticCode,
  DiagnosticSeverity,
  FormToolkitChoice,
  FormToolkitField,
  FormToolkitForm,
  FormToolkitValidationRule,
  ToRjsfResult,
  TransformErrors,
} from './types'

/**
 * Every field type the `formSchema` Studio plugin offers (3.0.17), copied from
 * its `validationTypesByFieldType` table together with the validation rule
 * types the Studio lets an editor attach to each. The table is the authoring
 * contract; anything outside it can only come from hand-edited content.
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

/** The subset this spike compiles. Everything else is dropped with a diagnostic. */
export const SUPPORTED_FIELD_TYPES = [
  'text',
  'textarea',
  'email',
  'number',
  'checkbox',
  'select',
  'radio',
] as const satisfies readonly FormToolkitFieldType[]

type SupportedFieldType = (typeof SUPPORTED_FIELD_TYPES)[number]

/** form-toolkit rule type → JSON Schema keyword (also the AJV error `name`). */
const RULE_KEYWORDS = {
  minLength: 'minLength',
  maxLength: 'maxLength',
  pattern: 'pattern',
  min: 'minimum',
  max: 'maximum',
  minSelectedCount: 'minItems',
  maxSelectedCount: 'maxItems',
} as const

type RuleType = keyof typeof RULE_KEYWORDS
/** `enum` is the keyword a required checkbox compiles to; it has no form-toolkit rule. */
type Keyword = (typeof RULE_KEYWORDS)[RuleType] | 'enum'

/** Same rule as the Studio's `name` validation. */
const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/
/** Names that collide with `Object.prototype` and would confuse lodash paths. */
const RESERVED_NAMES = new Set(Object.getOwnPropertyNames(Object.prototype))

const isFormToolkitType = (value: string): value is FormToolkitFieldType =>
  Object.hasOwn(FORM_TOOLKIT_FIELD_TYPES, value)

const isSupportedType = (value: string): value is SupportedFieldType =>
  (SUPPORTED_FIELD_TYPES as readonly string[]).includes(value)

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

/** Per-field messages keyed by AJV keyword, for `transformErrors`. */
type MessageTable = Map<string, Partial<Record<Keyword, string>>>

interface FieldContext {
  path: string
  name: string
  field: FormToolkitField
  diagnostics: Diagnostics
  messages: MessageTable
}

/** Whether a stored checkbox is a group (has at least one usable choice). */
const isCheckboxGroup = (field: FormToolkitField): boolean =>
  (field.choices ?? []).some((choice) => trimmed(choice?.value) !== undefined)

/**
 * The type a field is compiled as. `checkbox` is overloaded in form-toolkit:
 * without choices it is one boolean, with choices it is a multi-select.
 */
type CompiledType = Exclude<SupportedFieldType, 'checkbox'> | 'boolean' | 'multiselect'

const compiledType = (field: FormToolkitField): CompiledType | undefined => {
  const type = trimmed(field.type)
  if (type === undefined || !isSupportedType(type)) return undefined
  if (type === 'checkbox') return isCheckboxGroup(field) ? 'multiselect' : 'boolean'
  return type
}

/**
 * Which rules the Studio offers for the field's type; the applicability
 * contract. A lone `checkbox` (no choices) is a boolean, and the Studio's
 * group rules (`minSelectedCount`, `maxSelectedCount`) mean nothing for it.
 */
const applicableRules = (field: FormToolkitField): readonly string[] => {
  const type = trimmed(field.type)
  if (type === undefined || !isFormToolkitType(type)) return []
  if (type === 'checkbox' && !isCheckboxGroup(field)) return []
  return FORM_TOOLKIT_FIELD_TYPES[type]
}

interface ParsedRule {
  keyword: Keyword
  value: number | string
  message?: string
}

const parseRule = (
  rule: FormToolkitValidationRule | null | undefined,
  index: number,
  ctx: FieldContext,
): ParsedRule | undefined => {
  const {diagnostics, path, name, field} = ctx
  const label = `Validation rule ${index + 1}`
  const ruleType = trimmed(rule?.type)
  if (ruleType === undefined || !isRuleType(ruleType)) {
    diagnostics.add(
      'warning',
      'unsupported-validation-rule',
      path,
      `${label} ("${ruleType ?? '(none)'}") has no JSON Schema counterpart in this adapter and was dropped.`,
      name,
    )
    return undefined
  }
  if (!applicableRules(field).includes(ruleType)) {
    diagnostics.add(
      'warning',
      'inapplicable-validation-rule',
      path,
      `${label} ("${ruleType}") does not apply to a "${field.type}" field and was dropped.`,
      name,
    )
    return undefined
  }
  const operand = trimmed(rule?.value)
  if (operand === undefined) {
    diagnostics.add('warning', 'invalid-validation-rule', path, `${label} ("${ruleType}") has no value and was dropped.`, name)
    return undefined
  }
  const keyword = RULE_KEYWORDS[ruleType]
  const message = trimmed(rule?.message)
  const withMessage = (value: number | string): ParsedRule =>
    message === undefined ? {keyword, value} : {keyword, value, message}

  if (ruleType === 'pattern') {
    try {
      // AJV compiles patterns with the `u` flag (`unicodeRegExp: true`).
      new RegExp(operand, 'u')
    } catch {
      diagnostics.add(
        'warning',
        'invalid-validation-rule',
        path,
        `${label} is not a valid regular expression ("${operand}") and was dropped.`,
        name,
      )
      return undefined
    }
    return withMessage(operand)
  }
  const parsed = Number(operand)
  const needsInteger = keyword === 'minLength' || keyword === 'maxLength' || keyword === 'minItems' || keyword === 'maxItems'
  if (needsInteger ? !(Number.isInteger(parsed) && parsed >= 0) : !Number.isFinite(parsed)) {
    diagnostics.add(
      'warning',
      'invalid-validation-rule',
      path,
      `${label} ("${ruleType}") needs ${needsInteger ? 'a whole number of 0 or more' : 'a number'}, not "${operand}", and was dropped.`,
      name,
    )
    return undefined
  }
  return withMessage(parsed)
}

/** Applies every usable rule to the schema and records its message. */
const applyRules = (schema: RJSFSchema, ctx: FieldContext): void => {
  const rules = ctx.field.validation ?? []
  rules.forEach((rule, index) => {
    const parsed = parseRule(rule, index, ctx)
    if (parsed === undefined) return
    ;(schema as Record<string, unknown>)[parsed.keyword] = parsed.value
    if (parsed.message !== undefined) {
      const table = ctx.messages.get(ctx.name) ?? {}
      table[parsed.keyword] = parsed.message
      ctx.messages.set(ctx.name, table)
    }
  })
}

interface Choices {
  values: string[]
  labels: string[]
}

/**
 * Option list as `enum` values with labels in `ui:enumNames`.
 *
 * Not `oneOf: [{const, title}]`, although that is the schema-native way to
 * label options: RJSF's default-state computation treats a `const` inside a
 * `oneOf` as a default (`constAsDefaults`), so the first choice would be
 * pre-selected and a required select would pass validation untouched. `enum`
 * has no such behaviour and yields one AJV error instead of const + oneOf.
 */
const compileChoices = (ctx: FieldContext): Choices => {
  const {diagnostics, path, name, field} = ctx
  const seen = new Set<string>()
  const values: string[] = []
  const labels: string[] = []
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
    values.push(value)
    labels.push(trimmed(choice?.label) ?? value)
  })
  return {values, labels}
}

const placeholderOf = (ctx: FieldContext, allowed: boolean): string | undefined => {
  const placeholder = trimmed(ctx.field.options?.placeholder)
  if (placeholder !== undefined && !allowed) {
    ctx.diagnostics.add(
      'info',
      'ignored-placeholder',
      ctx.path,
      `A "${ctx.field.type}" field has no text input to show placeholder text in, so "${placeholder}" was ignored.`,
      ctx.name,
    )
    return undefined
  }
  return allowed ? placeholder : undefined
}

interface CompiledField {
  schema: RJSFSchema
  ui: UiSchema
}

const compileField = (type: CompiledType, ctx: FieldContext): CompiledField => {
  const {field, diagnostics, path, name} = ctx
  const label = trimmed(field.label)
  if (label === undefined) {
    diagnostics.add('info', 'missing-label', path, `"${name}" has no label, so its name is shown instead.`, name)
  }
  const title = label ?? name
  const storedDefault = trimmed(field.options?.defaultValue)
  const ui: UiSchema = {}
  const schema: RJSFSchema = {title}

  switch (type) {
    case 'text':
    case 'email':
    case 'textarea': {
      schema.type = 'string'
      if (type === 'email') {
        schema.format = 'email'
        ui['ui:widget'] = 'email'
      }
      if (type === 'textarea') ui['ui:widget'] = 'textarea'
      if (storedDefault !== undefined) schema.default = storedDefault
      const placeholder = placeholderOf(ctx, true)
      if (placeholder !== undefined) ui['ui:placeholder'] = placeholder
      applyRules(schema, ctx)
      return {schema, ui}
    }
    case 'number': {
      schema.type = 'number'
      if (storedDefault !== undefined) {
        const parsed = Number(storedDefault)
        if (Number.isFinite(parsed)) schema.default = parsed
        else diagnostics.add('warning', 'invalid-default-value', path, `"${storedDefault}" is not a number, so the default value was dropped.`, name)
      }
      const placeholder = placeholderOf(ctx, true)
      if (placeholder !== undefined) ui['ui:placeholder'] = placeholder
      applyRules(schema, ctx)
      return {schema, ui}
    }
    case 'boolean': {
      schema.type = 'boolean'
      if (storedDefault !== undefined) {
        if (storedDefault === 'true' || storedDefault === 'false') schema.default = storedDefault === 'true'
        else diagnostics.add('warning', 'invalid-default-value', path, `"${storedDefault}" is not "true" or "false", so the default value was dropped.`, name)
      }
      // A required checkbox must be *ticked*, not merely present. JSON Schema
      // `required` only checks presence, so the constraint is `enum: [true]`.
      // (`const: true` would be pre-ticked by RJSF's constAsDefaults.)
      if (field.required === true) {
        schema.enum = [true]
        // form-toolkit has no authored message for "required"; AJV's own
        // ("must be equal to one of the allowed values") would mislead.
        ctx.messages.set(name, {...ctx.messages.get(name), enum: 'This box must be checked.'})
      }
      placeholderOf(ctx, false)
      applyRules(schema, ctx)
      return {schema, ui}
    }
    case 'select':
    case 'radio':
    case 'multiselect': {
      const {values, labels} = compileChoices(ctx)
      if (type === 'multiselect') {
        schema.type = 'array'
        schema.uniqueItems = true
        schema.items = {type: 'string', enum: values}
        ui['ui:widget'] = 'checkboxes'
        // RJSF reads the labels of a multi-select from the *items* ui schema.
        ui.items = {'ui:enumNames': labels}
        if (storedDefault !== undefined) {
          diagnostics.add('info', 'ignored-default-value', path, `A checkbox group cannot carry a default value, so "${storedDefault}" was ignored.`, name)
        }
        placeholderOf(ctx, false)
        applyRules(schema, ctx)
        // Presence is not enough for a required group: an empty array is present.
        if (field.required === true && !(typeof schema.minItems === 'number' && schema.minItems >= 1)) schema.minItems = 1
        return {schema, ui}
      }
      schema.type = 'string'
      schema.enum = values
      ui['ui:enumNames'] = labels
      if (type === 'radio') {
        ui['ui:widget'] = 'radio'
        // @rjsf/shadcn 6.8.0's RadioWidget hands the *real* value to the Radix
        // group as its default while encoding each item by *index*, so a
        // default never shows as checked. Asking for real values on both sides
        // is an RJSF-native option and costs nothing in other themes; values
        // here are always non-empty strings, which the format requires.
        ui['ui:optionValueFormat'] = 'realValue'
      }
      if (storedDefault !== undefined) {
        if (values.includes(storedDefault)) schema.default = storedDefault
        else diagnostics.add('warning', 'invalid-default-value', path, `"${storedDefault}" is not one of the choices, so the default value was dropped.`, name)
      }
      // RJSF's select widget shows a placeholder; radios have nowhere to.
      const placeholder = placeholderOf(ctx, type === 'select')
      if (placeholder !== undefined) ui['ui:placeholder'] = placeholder
      applyRules(schema, ctx)
      return {schema, ui}
    }
  }
}

/**
 * Builds a `transformErrors` that swaps AJV's message for the one the editor
 * wrote on the matching rule. Errors without an authored message pass through.
 */
const createTransformErrors = (messages: MessageTable): TransformErrors => {
  return (errors: RJSFValidationError[]) =>
    errors.map((error) => {
      const name = error.property?.replace(/^\./u, '')
      const table = name === undefined ? undefined : messages.get(name)
      const message = table?.[error.name as Keyword]
      if (message === undefined) return error
      return {...error, message, stack: `${name}: ${message}`}
    })
}

/**
 * Compiles a `@sanity/form-toolkit` form document into what RJSF needs.
 *
 * Never throws on content: a field it cannot compile is dropped and reported
 * in `diagnostics`, so a page renders the rest of the form.
 */
export const toRjsf = (form: FormToolkitForm): ToRjsfResult => {
  const diagnostics = new Diagnostics()
  const messages: MessageTable = new Map()
  const properties: Record<string, RJSFSchema> = {}
  const uiFields: Record<string, UiSchema> = {}
  const order: string[] = []
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
      diagnostics.add(
        'error',
        'unsupported-field-type',
        path,
        `"${sourceType}" is not compiled by this spike (supported: ${SUPPORTED_FIELD_TYPES.join(', ')}), so the field was dropped.`,
        name,
      )
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
    if (type === 'select' || type === 'radio' || type === 'multiselect') {
      if (!isCheckboxGroup(field)) {
        diagnostics.add('error', 'missing-choices', path, `"${name}" offers no choices, so nothing could be selected; the field was dropped.`, name)
        return
      }
    }
    const compiled = compileField(type, {path, name, field, diagnostics, messages})
    properties[name] = compiled.schema
    if (Object.keys(compiled.ui).length > 0) uiFields[name] = compiled.ui
    order.push(name)
    if (field.required === true) required.push(name)
  })

  const schema: RJSFSchema = {type: 'object', properties}
  const title = trimmed(form.title)
  if (title !== undefined) schema.title = title
  if (required.length > 0) schema.required = required

  const uiSchema: UiSchema = {...uiFields, 'ui:order': order}
  const submitText = trimmed(form.submitButton?.text)
  if (submitText !== undefined) uiSchema['ui:submitButtonOptions'] = {submitText}
  if (form.submitButton?.position !== undefined) {
    diagnostics.add(
      'info',
      'lossy-submit-position',
      'form',
      `RJSF has no submit button alignment option, so position "${form.submitButton.position}" is left to the theme.`,
    )
  }

  return {schema, uiSchema, transformErrors: createTransformErrors(messages), diagnostics: diagnostics.list}
}
