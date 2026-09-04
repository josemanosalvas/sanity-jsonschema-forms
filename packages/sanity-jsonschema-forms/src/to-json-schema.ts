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

/**
 * The field types compiled. `file` is the one type left out: JSON has no
 * portable representation of a file, so it is dropped with a diagnostic;
 * see docs/compatibility.md.
 */
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

/** form-toolkit rule type → JSON Schema keyword (also AJV's error `keyword`). */
const RULE_KEYWORDS = {
  max: 'maximum',
  maxLength: 'maxLength',
  maxSelectedCount: 'maxItems',
  min: 'minimum',
  minLength: 'minLength',
  minSelectedCount: 'minItems',
  pattern: 'pattern',
  step: 'multipleOf',
} as const satisfies Record<string, MessageKeyword>

type KeywordRuleType = keyof typeof RULE_KEYWORDS

/**
 * Rule types the Studio offers that JSON Schema Draft 7 cannot carry. A date
 * bound would need `formatMinimum`/`formatMaximum`, which are a validator
 * extension, not part of the draft. The rule is checked and then dropped
 * with `lossy-validation-rule`; the server enforces it by other means.
 */
const LOSSY_RULES = ['minDate', 'maxDate'] as const

type LossyRuleType = (typeof LOSSY_RULES)[number]

/** Every rule type the Studio offers on some field type. */
const FORM_TOOLKIT_RULES: ReadonlySet<string> = new Set(Object.values(FORM_TOOLKIT_FIELD_TYPES).flat())

/** See docs/json-schema-contract.md for why Draft 7. */
export const JSON_SCHEMA_DRAFT_7 = 'http://json-schema.org/draft-07/schema#'

/** form-toolkit has no message for "required"; this is the one message the compiler supplies. */
export const CHECKBOX_REQUIRED_MESSAGE = 'This box must be checked.'

/**
 * The lexical forms of the native `<input>` values `@sanity/form-toolkit`'s
 * renderer submits, as JSON Schema `pattern`s. AJV's `time` and `date-time`
 * formats follow RFC 3339 and demand a timezone; a native `time` or
 * `datetime-local` value carries none, so those two types get a pattern
 * instead of a `format`. Exported so a consumer can quote the contract.
 */
const HH_MM = '(?:[01]\\d|2[0-3]):[0-5]\\d'
const OPTIONAL_SECONDS = '(?::[0-5]\\d(?:\\.\\d{1,3})?)?'
/** Month and day, with each month's length; 29 February is accepted in every year. */
const MONTH_DAY = '(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|02-(?:0[1-9]|1\\d|2\\d))'

/** `HH:MM`, optionally `:SS` and `.sss`: a valid time string per the HTML standard. */
export const TIME_PATTERN = `^${HH_MM}${OPTIONAL_SECONDS}$`
/** `YYYY-MM-DDTHH:MM`, optionally `:SS` and `.sss`, never a timezone: a valid local date and time string per the HTML standard. */
export const DATETIME_LOCAL_PATTERN = `^\\d{4}-${MONTH_DAY}T${HH_MM}${OPTIONAL_SECONDS}$`
/** `#` and six hexadecimal digits: a valid simple color per the HTML standard. The native input submits lowercase. */
export const COLOR_PATTERN = '^#[0-9A-Fa-f]{6}$'

const TIME_REGEXP = new RegExp(TIME_PATTERN, 'u')
const DATETIME_LOCAL_REGEXP = new RegExp(DATETIME_LOCAL_PATTERN, 'u')
const COLOR_REGEXP = new RegExp(COLOR_PATTERN, 'u')
const DATE_REGEXP = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** RFC 3339 `full-date`, the value of a native `date` input and what `format: date` validates. */
const isCalendarDate = (value: string): boolean => {
  const groups = DATE_REGEXP.exec(value)?.groups
  if (groups === undefined) {
    return false
  }
  const year = Number(groups.year)
  const month = Number(groups.month)
  const day = Number(groups.day)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = month === 2 && leap ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0)
  return month >= 1 && month <= 12 && day >= 1 && day <= days
}

/**
 * An absolute URL of printable ASCII, which is what `format: uri` (RFC 3986)
 * accepts. A native `url` input also takes non-ASCII characters and leaves
 * them unencoded; those need percent-encoding before they validate.
 */
const isAbsoluteAsciiUrl = (value: string): boolean => /^[!-~]+$/u.test(value) && URL.canParse(value)

const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/u
const RESERVED_NAMES = new Set(Object.getOwnPropertyNames(Object.prototype))

const isFormToolkitType = (value: string): value is FormToolkitFieldType => Object.hasOwn(FORM_TOOLKIT_FIELD_TYPES, value)
export const isSupportedType = (value: string): value is SupportedFieldType => (SUPPORTED_FIELD_TYPES as readonly string[]).includes(value)
const isKeywordRule = (value: string): value is KeywordRuleType => Object.hasOwn(RULE_KEYWORDS, value)
const isLossyRule = (value: string): value is LossyRuleType => (LOSSY_RULES as readonly string[]).includes(value)

/** Whether AJV will accept `pattern`; it compiles patterns with the `u` flag. */
const isValidPattern = (pattern: string): boolean => {
  try {
    return Boolean(new RegExp(pattern, 'u'))
  } catch {
    return false
  }
}

const trimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const text = value.trim()
  return text.length === 0 ? undefined : text
}

class Diagnostics {
  readonly list: Diagnostic[] = []
  add(severity: DiagnosticSeverity, code: DiagnosticCode, path: string, message: string, field?: string) {
    this.list.push(field === undefined ? {code, message, path, severity} : {code, field, message, path, severity})
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

const compiledType = (type: SupportedFieldType, field: FormToolkitField): CompiledType => {
  if (type === 'checkbox') {
    return isCheckboxGroup(field) ? 'multiselect' : 'boolean'
  }
  return type
}

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
      message:
        sourceType === undefined
          ? 'The field declares no type and was dropped.'
          : `"${sourceType}" is not a field type @sanity/form-toolkit defines (custom types registered with formSchema({fields}) are opaque to this compiler), so the field was dropped.`,
      name,
    }
  }
  if (!isSupportedType(sourceType)) {
    return {
      accepted: false,
      code: 'unsupported-field-type',
      message:
        sourceType === 'file'
          ? 'JSON has no portable representation of a file (a data URL, a multipart body and an upload reference each suit a different runtime), so "file" is not compiled and the field was dropped; its maxSize and fileType rules with it.'
          : `"${sourceType}" is not supported (supported: ${SUPPORTED_FIELD_TYPES.join(', ')}), so the field was dropped.`,
      name,
    }
  }
  if (name === undefined || !FIELD_NAME_PATTERN.test(name) || RESERVED_NAMES.has(name)) {
    return {accepted: false, code: 'invalid-field-name', message: `The field has no usable name ("${name ?? ''}") and was dropped.`, name}
  }
  const type = compiledType(sourceType, field)
  if ((type === 'select' || type === 'radio' || type === 'multiselect') && !isCheckboxGroup(field)) {
    return {
      accepted: false,
      code: 'missing-choices',
      message: `"${name}" offers no choices, so nothing could be selected; the field was dropped.`,
      name,
    }
  }
  return {accepted: true, name, sourceType, type}
}

const applicableRules = (field: FormToolkitField): readonly string[] => {
  const type = trimmed(field.type)
  if (type === undefined || !isFormToolkitType(type)) {
    return []
  }
  if (type === 'checkbox' && !isCheckboxGroup(field)) {
    return []
  }
  return FORM_TOOLKIT_FIELD_TYPES[type]
}

const recordMessage = (ctx: FieldContext, keyword: MessageKeyword, message: string): void => {
  ctx.messages[ctx.name] = {...ctx.messages[ctx.name], [keyword]: message}
}

/** A `minDate`/`maxDate` operand must have the field's own value shape. */
const isTemporalOperand = (field: FormToolkitField, operand: string): boolean =>
  field.type === 'datetime-local' ? DATETIME_LOCAL_REGEXP.test(operand) : isCalendarDate(operand)

/** The HTML step base: `min` if present, else the default value, else 0. */
const stepBase = (schema: JSONSchema7): {base: number; source: string} => {
  if (typeof schema.minimum === 'number') {
    return {base: schema.minimum, source: 'min'}
  }
  if (typeof schema.default === 'number') {
    return {base: schema.default, source: 'default value'}
  }
  return {base: 0, source: 'implicit base of 0'}
}

/**
 * HTML `step` counts from a step base (`min`, else the default value, else
 * 0); JSON Schema `multipleOf` counts from zero. The two agree only when the
 * base is itself a multiple of the step. Fractional steps are left out as
 * well: validators check `multipleOf` with floating-point division, which
 * rejects values such as 0.3 for a step of 0.1.
 */
const applyStep = (schema: JSONSchema7, ctx: FieldContext, label: string, operand: string, message: string | undefined): void => {
  const {diagnostics, path, name} = ctx
  if (operand === 'any') {
    diagnostics.add(
      'info',
      'lossy-validation-rule',
      path,
      `${label} ("step") is "any", which lifts the browser's whole-number step; a JSON Schema number already accepts any value, so the rule adds nothing and was dropped.`,
      name,
    )
    return
  }
  const step = Number(operand)
  if (!(Number.isFinite(step) && step > 0)) {
    diagnostics.add(
      'warning',
      'invalid-validation-rule',
      path,
      `${label} ("step") needs a number greater than 0 or "any", not "${operand}", and was dropped.`,
      name,
    )
    return
  }
  const {base, source} = stepBase(schema)
  if (!Number.isInteger(step)) {
    diagnostics.add(
      'warning',
      'lossy-validation-rule',
      path,
      `${label} ("step") is ${step}; a fractional multipleOf is checked with floating-point division and rejects valid values, so the rule was dropped from the schema.`,
      name,
    )
    return
  }
  if (base % step !== 0) {
    diagnostics.add(
      'warning',
      'lossy-validation-rule',
      path,
      `${label} ("step") counts from ${base} (the field's ${source}), which is not a multiple of ${step}; multipleOf counts from 0 and would reject the values the browser allows, so the rule was dropped from the schema.`,
      name,
    )
    return
  }
  schema.multipleOf = step
  if (message !== undefined) {
    recordMessage(ctx, 'multipleOf', message)
  }
}

const applyRules = (schema: JSONSchema7, ctx: FieldContext): void => {
  const {diagnostics, path, name, field} = ctx
  const rules: readonly (FormToolkitValidationRule | null | undefined)[] = field.validation ?? []
  let step: {label: string; operand: string; message: string | undefined} | undefined
  for (const [index, rule] of rules.entries()) {
    const label = `Validation rule ${index + 1}`
    const ruleType = trimmed(rule?.type)
    if (ruleType === undefined || !FORM_TOOLKIT_RULES.has(ruleType)) {
      diagnostics.add(
        'warning',
        'unsupported-validation-rule',
        path,
        `${label} ("${ruleType ?? '(none)'}") is not a rule type @sanity/form-toolkit defines and was dropped.`,
        name,
      )
      continue
    }
    if (!applicableRules(field).includes(ruleType)) {
      diagnostics.add(
        'warning',
        'inapplicable-validation-rule',
        path,
        `${label} ("${ruleType}") does not apply to a "${field.type}" field and was dropped.`,
        name,
      )
      continue
    }
    const operand = trimmed(rule?.value)
    if (operand === undefined) {
      diagnostics.add('warning', 'invalid-validation-rule', path, `${label} ("${ruleType}") has no value and was dropped.`, name)
      continue
    }
    const message = trimmed(rule?.message)
    if (isLossyRule(ruleType)) {
      if (isTemporalOperand(field, operand)) {
        diagnostics.add(
          'warning',
          'lossy-validation-rule',
          path,
          `${label} ("${ruleType}") cannot be expressed in JSON Schema Draft 7 (formatMinimum and formatMaximum are a validator extension, not part of the draft), so it was dropped from the schema; enforce the bound "${operand}" on the server.`,
          name,
        )
      } else {
        diagnostics.add(
          'warning',
          'invalid-validation-rule',
          path,
          `${label} ("${ruleType}") needs a value shaped like the field's own ("${operand}" is not), and was dropped.`,
          name,
        )
      }
      continue
    }
    if (!isKeywordRule(ruleType)) {
      // `maxSize` and `fileType` apply to `file` only, which is never compiled; unreachable in practice.
      diagnostics.add(
        'warning',
        'unsupported-validation-rule',
        path,
        `${label} ("${ruleType}") has no JSON Schema counterpart and was dropped.`,
        name,
      )
      continue
    }
    if (ruleType === 'step') {
      // Deferred: its step base is `min`, which may come later in the list.
      step = {label, message, operand}
      continue
    }
    const keyword = RULE_KEYWORDS[ruleType]
    let value: number | string
    if (ruleType === 'pattern') {
      if (!isValidPattern(operand)) {
        diagnostics.add(
          'warning',
          'invalid-validation-rule',
          path,
          `${label} is not a valid regular expression ("${operand}") and was dropped.`,
          name,
        )
        continue
      }
      value = operand
    } else {
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
        continue
      }
      value = parsed
    }
    ;(schema as Record<string, unknown>)[keyword] = value
    if (message !== undefined) {
      recordMessage(ctx, keyword, message)
    }
  }
  if (step !== undefined) {
    applyStep(schema, ctx, step.label, step.operand, step.message)
  }
}

/** Choices as `oneOf` consts with `title`, the schema-native way to label an option. */
const compileChoices = (ctx: FieldContext): JSONSchema7[] => {
  const {diagnostics, path, name, field} = ctx
  const seen = new Set<string>()
  const out: JSONSchema7[] = []
  const choices: readonly (FormToolkitChoice | null | undefined)[] = field.choices ?? []
  for (const [index, choice] of choices.entries()) {
    const value = trimmed(choice?.value)
    if (value === undefined) {
      diagnostics.add('warning', 'invalid-choice', path, `Choice ${index + 1} has no value and was dropped.`, name)
      continue
    }
    if (seen.has(value)) {
      diagnostics.add('warning', 'invalid-choice', path, `Choice ${index + 1} repeats the value "${value}" and was dropped.`, name)
      continue
    }
    seen.add(value)
    out.push({const: value, title: trimmed(choice?.label) ?? value})
  }
  return out
}

/** Placeholders never enter the schema; only the loss on a field with no text input is reported. */
const reportPlaceholder = (ctx: FieldContext, hasInput: boolean): void => {
  const placeholder = trimmed(ctx.field.options?.placeholder)
  if (placeholder !== undefined && !hasInput) {
    ctx.diagnostics.add(
      'info',
      'ignored-placeholder',
      ctx.path,
      `A "${ctx.field.type}" field has no text input to show placeholder text in, so "${placeholder}" was ignored.`,
      ctx.name,
    )
  }
}

const dropDefault = (ctx: FieldContext, storedDefault: string, reason: string): void => {
  ctx.diagnostics.add(
    'warning',
    'invalid-default-value',
    ctx.path,
    `"${storedDefault}" ${reason}, so the default value was dropped.`,
    ctx.name,
  )
}

/**
 * The value shape each string type implies, checked on a stored default so a
 * form never starts invalid. Authored rules (a `pattern`, a `min`) are not
 * checked against defaults, for any type.
 */
const STRING_DEFAULTS: Partial<Record<CompiledType, {accepts: (value: string) => boolean; reason: string}>> = {
  color: {accepts: (value) => COLOR_REGEXP.test(value), reason: 'is not a colour written as "#" and six hexadecimal digits'},
  date: {accepts: isCalendarDate, reason: 'is not a calendar date written as YYYY-MM-DD'},
  'datetime-local': {
    accepts: (value) => DATETIME_LOCAL_REGEXP.test(value),
    reason: 'is not a local date and time written as YYYY-MM-DDTHH:MM (no timezone)',
  },
  time: {accepts: (value) => TIME_REGEXP.test(value), reason: 'is not a time written as HH:MM'},
  url: {accepts: isAbsoluteAsciiUrl, reason: 'is not an absolute URL'},
}

const compileField = (type: CompiledType, ctx: FieldContext): JSONSchema7 => {
  const {field, diagnostics, path, name} = ctx
  const label = trimmed(field.label)
  if (label === undefined && type !== 'hidden') {
    diagnostics.add('info', 'missing-label', path, `"${name}" has no label, so its name is shown instead.`, name)
  }
  const storedDefault = trimmed(field.options?.defaultValue)
  const schema: JSONSchema7 = {title: label ?? name}

  switch (type) {
    case 'text':
    case 'email':
    case 'textarea':
    case 'url':
    case 'tel':
    case 'hidden':
    case 'date':
    case 'datetime-local':
    case 'time':
    case 'color': {
      schema.type = 'string'
      if (type === 'email') {
        schema.format = 'email'
      } else if (type === 'url') {
        schema.format = 'uri'
      } else if (type === 'date') {
        schema.format = 'date'
      } else if (type === 'datetime-local') {
        schema.pattern = DATETIME_LOCAL_PATTERN
      } else if (type === 'time') {
        schema.pattern = TIME_PATTERN
      } else if (type === 'color') {
        schema.pattern = COLOR_PATTERN
      }
      if (storedDefault !== undefined) {
        const check = STRING_DEFAULTS[type]
        if (check === undefined || check.accepts(storedDefault)) {
          // A native colour input reports its value in lowercase.
          schema.default = type === 'color' ? storedDefault.toLowerCase() : storedDefault
        } else {
          dropDefault(ctx, storedDefault, check.reason)
        }
      } else if (type === 'hidden' && field.required === true) {
        diagnostics.add(
          'warning',
          'missing-default-value',
          path,
          `"${name}" is required and hidden but has no default value; nothing on the page can supply one, so every submission fails validation unless the host seeds the value.`,
          name,
        )
      }
      reportPlaceholder(ctx, type !== 'hidden' && type !== 'color')
      applyRules(schema, ctx)
      return schema
    }
    case 'number':
    case 'range': {
      schema.type = 'number'
      if (storedDefault !== undefined) {
        const parsed = Number(storedDefault)
        if (Number.isFinite(parsed)) {
          schema.default = parsed
        } else {
          dropDefault(ctx, storedDefault, 'is not a number')
        }
      }
      reportPlaceholder(ctx, type === 'number')
      applyRules(schema, ctx)
      return schema
    }
    case 'boolean': {
      schema.type = 'boolean'
      if (storedDefault !== undefined) {
        if (storedDefault === 'true' || storedDefault === 'false') {
          schema.default = storedDefault === 'true'
        } else {
          dropDefault(ctx, storedDefault, 'is not "true" or "false"')
        }
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
        schema.items = {oneOf, type: 'string'}
        if (storedDefault !== undefined) {
          diagnostics.add(
            'info',
            'ignored-default-value',
            path,
            `A checkbox group cannot carry a default value, so "${storedDefault}" was ignored.`,
            name,
          )
        }
        reportPlaceholder(ctx, false)
        applyRules(schema, ctx)
        if (field.required === true && !(typeof schema.minItems === 'number' && schema.minItems >= 1)) {
          schema.minItems = 1
        }
        return schema
      }
      schema.type = 'string'
      schema.oneOf = oneOf
      if (storedDefault !== undefined) {
        if (oneOf.some((option) => option.const === storedDefault)) {
          schema.default = storedDefault
        } else {
          dropDefault(ctx, storedDefault, 'is not one of the choices')
        }
      }
      reportPlaceholder(ctx, type === 'select')
      applyRules(schema, ctx)
      return schema
    }
    default: {
      throw new Error(`Unhandled field type "${String(type satisfies never)}"`)
    }
  }
}

/**
 * Compiles a `@sanity/form-toolkit` form document into JSON Schema Draft 7
 * plus the editor-written messages JSON Schema cannot carry. Never throws on
 * content; every loss is a diagnostic.
 */
export const toJsonSchema = (form: FormToolkitForm): ToJsonSchemaResult => {
  const diagnostics = new Diagnostics()
  const messages: MessageMap = {}
  const properties: Record<string, JSONSchema7> = {}
  const required: string[] = []

  const fields: readonly (FormToolkitField | null | undefined)[] = form.fields ?? []
  for (const [index, field] of fields.entries()) {
    const path = `fields[${index}]`
    if (field === null || typeof field !== 'object') {
      diagnostics.add('error', 'unknown-field-type', path, 'The array member is not a field object and was dropped.')
      continue
    }
    const verdict = classifyField(field)
    if (!verdict.accepted) {
      diagnostics.add('error', verdict.code, path, verdict.message, verdict.name)
      continue
    }
    const {name, type} = verdict
    if (Object.hasOwn(properties, name)) {
      diagnostics.add(
        'error',
        'duplicate-field-name',
        path,
        `"${name}" is already used by an earlier field, so the later field was dropped.`,
        name,
      )
      continue
    }
    properties[name] = compileField(type, {diagnostics, field, messages, name, path})
    if (field.required === true) {
      required.push(name)
    }
  }

  const schema: JSONSchema7 = {$schema: JSON_SCHEMA_DRAFT_7}
  const title = trimmed(form.title)
  if (title !== undefined) {
    schema.title = title
  }
  schema.type = 'object'
  if (required.length > 0) {
    schema.required = required
  }
  schema.properties = properties
  if (form.submitButton?.position !== undefined) {
    diagnostics.add(
      'info',
      'lossy-submit-position',
      'form',
      `JSON Schema has no concept of submit-button alignment, so position "${form.submitButton.position}" was not compiled; the renderer's theme decides.`,
    )
  }

  return {diagnostics: diagnostics.list, messages, schema}
}
