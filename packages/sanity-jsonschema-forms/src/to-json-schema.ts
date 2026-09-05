import type {JSONSchema7} from 'json-schema'

import {classifyField, FORM_TOOLKIT_FIELD_TYPES, trimmed} from './internal/field'
import type {CompiledType} from './internal/field'
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

const isKeywordRule = (value: string): value is KeywordRuleType => Object.hasOwn(RULE_KEYWORDS, value)

const FORM_TOOLKIT_RULES: ReadonlySet<string> = new Set(Object.values(FORM_TOOLKIT_FIELD_TYPES).flat())

/** See docs/json-schema-contract.md for why Draft 7. */
export const JSON_SCHEMA_DRAFT_7 = 'http://json-schema.org/draft-07/schema#'

/** form-toolkit has no message for "required"; this is the one message the compiler supplies. */
export const CHECKBOX_REQUIRED_MESSAGE = 'This box must be checked.'

/**
 * The native `<input>` value shapes as JSON Schema `pattern`s. AJV's `time`
 * and `date-time` formats are RFC 3339 and demand a timezone; a native
 * `time` or `datetime-local` value carries none.
 */
const HH_MM = '(?:[01][0-9]|2[0-3]):[0-5][0-9]'
const OPTIONAL_SECONDS = '(?::[0-5][0-9](?:\\.[0-9]{1,3})?)?'
const NONZERO_MULTIPLE_OF_4 = '(?:0[48]|[2468][048]|[13579][26])'
/** HTML "valid date string": a year of four or more digits greater than zero, and a day the month has, leap years included. */
const YEAR = '(?=[0-9]*[1-9])[0-9]{4,}'
/** Divisible by 4 but not by 100 (last two digits), or by 400 (ends in 00 after digits divisible by 4). */
const LEAP_YEAR = `(?=[0-9]*[1-9])(?:[0-9]{2,}${NONZERO_MULTIPLE_OF_4}|[0-9]*${NONZERO_MULTIPLE_OF_4}00|[0-9]*0000)`
const MONTH_DAY_EXCEPT_LEAP_DAY =
  '(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-8]))'
const LOCAL_DATE = `(?:${YEAR}-${MONTH_DAY_EXCEPT_LEAP_DAY}|${LEAP_YEAR}-02-29)`

/** `HH:MM`, optionally `:SS` and `.sss` (HTML "valid time string"). */
export const TIME_PATTERN = `^${HH_MM}${OPTIONAL_SECONDS}$`
/** A valid date string, `T`, a valid time string, no timezone (HTML "valid local date and time string"). */
export const DATETIME_LOCAL_PATTERN = `^${LOCAL_DATE}T${HH_MM}${OPTIONAL_SECONDS}$`
/** `#` and six hexadecimal digits (HTML "valid simple color"); the native input submits lowercase. */
export const COLOR_PATTERN = '^#[0-9A-Fa-f]{6}$'
/** Beside `format: date`, which takes exactly four year digits: HTML needs the year to be greater than zero. */
export const NONZERO_YEAR_PATTERN = '^(?!0000-)'

const TIME_REGEXP = new RegExp(TIME_PATTERN, 'u')
const DATETIME_LOCAL_REGEXP = new RegExp(DATETIME_LOCAL_PATTERN, 'u')
const COLOR_REGEXP = new RegExp(COLOR_PATTERN, 'u')
const DATE_REGEXP = /^(?<year>[0-9]{4})-(?<month>[0-9]{2})-(?<day>[0-9]{2})$/u
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** What `format: date` plus `NONZERO_YEAR_PATTERN` accept: exactly four year digits, year > 0, a day the month has. */
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
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days
}

/**
 * RFC 3986 URI as ajv-formats 2.1 checks `format: uri` (its `URI` regular
 * expression, MIT). The WHATWG parser behind `URL` and the native input is
 * a different grammar: it takes a backslash or a bracket in a path or query
 * and a bare `%`, which this rejects. A default must pass both, so that
 * the native input shows it and the schema the compiler emits accepts it.
 */
const URI_REGEXP =
  /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/iu
const isUri = (value: string): boolean => URI_REGEXP.test(value) && URL.canParse(value)

/** An email address as ajv-formats 2.1 checks `format: email` (its `email` regular expression, MIT). */
const EMAIL_REGEXP =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/iu

/** Whether AJV will accept `pattern`; it compiles patterns with the `u` flag. */
const isValidPattern = (pattern: string): boolean => {
  try {
    return Boolean(new RegExp(pattern, 'u'))
  } catch {
    return false
  }
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
  type: CompiledType
  diagnostics: Diagnostics
  messages: MessageMap
}

const recordMessage = (ctx: FieldContext, keyword: MessageKeyword, message: string): void => {
  ;(ctx.messages[ctx.name] ??= {})[keyword] = message
}

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
 * HTML `step` counts from the step base; `multipleOf` counts from zero. They
 * agree only when the base is a multiple of the step. Fractional steps are
 * left out too: AJV checks `multipleOf` with floating-point division and
 * rejects 0.3 for a step of 0.1.
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
  const {diagnostics, path, name, field, type} = ctx
  if (field.validation !== undefined && field.validation !== null && !Array.isArray(field.validation)) {
    diagnostics.add('warning', 'invalid-validation-rule', path, 'Validation must be an array; its rules were dropped.', name)
    return
  }
  const allowed = type === 'boolean' ? [] : (FORM_TOOLKIT_FIELD_TYPES[type === 'multiselect' ? 'checkbox' : type] as readonly string[])
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
    if (!allowed.includes(ruleType)) {
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
    if (ruleType === 'minDate' || ruleType === 'maxDate') {
      if (type === 'datetime-local' ? DATETIME_LOCAL_REGEXP.test(operand) : isCalendarDate(operand)) {
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
      // `maxSize` and `fileType` apply to `file` only, which is never compiled.
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
    } else if (ctx.messages[name] !== undefined) {
      delete ctx.messages[name][keyword]
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

/** The value shape each string type implies, checked on a stored default. Authored rules are not checked against defaults. */
const STRING_DEFAULTS: Partial<Record<CompiledType, {accepts: (value: string) => boolean; reason: string}>> = {
  color: {accepts: (value) => COLOR_REGEXP.test(value), reason: 'is not a colour written as "#" and six hexadecimal digits'},
  date: {accepts: isCalendarDate, reason: 'is not a calendar date written as YYYY-MM-DD'},
  'datetime-local': {
    accepts: (value) => DATETIME_LOCAL_REGEXP.test(value),
    reason: 'is not a local date and time written as YYYY-MM-DDTHH:MM (no timezone)',
  },
  email: {accepts: (value) => EMAIL_REGEXP.test(value), reason: 'is not an email address'},
  time: {accepts: (value) => TIME_REGEXP.test(value), reason: 'is not a time written as HH:MM'},
  url: {accepts: isUri, reason: 'is not an absolute URI as RFC 3986 writes one'},
}

const compileField = (ctx: FieldContext): JSONSchema7 => {
  const {field, diagnostics, path, name, type} = ctx
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
        schema.pattern = NONZERO_YEAR_PATTERN
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

  if (form === null || typeof form !== 'object' || Array.isArray(form)) {
    diagnostics.add('error', 'invalid-form', 'form', 'Expected a form document object.')
    return {diagnostics: diagnostics.list, messages, schema: {$schema: JSON_SCHEMA_DRAFT_7, properties, type: 'object'}}
  }
  if (form.fields !== undefined && form.fields !== null && !Array.isArray(form.fields)) {
    diagnostics.add('error', 'invalid-form', 'form', 'Fields must be an array; no fields were compiled.')
  }
  const fields: readonly (FormToolkitField | null | undefined)[] = Array.isArray(form.fields) ? form.fields : []
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
    properties[name] = compileField({diagnostics, field, messages, name, path, type})
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
    diagnostics.add('info', 'lossy-submit-position', 'form', 'Submit-button alignment is presentation and is not compiled.')
  }

  return {diagnostics: diagnostics.list, messages, schema}
}
