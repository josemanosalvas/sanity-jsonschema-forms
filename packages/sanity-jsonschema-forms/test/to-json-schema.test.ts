import {contactForm, fieldTypeEdgesForm, fieldTypesForm, messyForm, namesakeForm} from 'sanity-form-fixtures'
import {describe, expect, test} from 'vitest'

import {COLOR_PATTERN, DATETIME_LOCAL_PATTERN, NONZERO_YEAR_PATTERN, TIME_PATTERN, toJsonSchema} from '../src'

describe('toJsonSchema: contact form', () => {
  const {schema, messages, diagnostics} = toJsonSchema(contactForm)

  test('compiles to JSON Schema Draft 7 and declares the dialect', () => {
    expect(schema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      properties: {
        consent: {const: true, title: 'I agree to be contacted', type: 'boolean'},
        contactMethod: {
          default: 'email',
          oneOf: [
            {const: 'email', title: 'Email'},
            {const: 'phone', title: 'Phone'},
          ],
          title: 'Preferred contact method',
          type: 'string',
        },
        email: {format: 'email', title: 'Email', type: 'string'},
        fullName: {maxLength: 80, minLength: 2, pattern: '^[^0-9]*$', title: 'Full name', type: 'string'},
        interests: {
          items: {
            oneOf: [
              {const: 'updates', title: 'Product updates'},
              {const: 'events', title: 'Events'},
              {const: 'newsletter', title: 'Newsletter'},
            ],
            type: 'string',
          },
          maxItems: 2,
          title: 'Interests',
          type: 'array',
          uniqueItems: true,
        },
        message: {maxLength: 500, title: 'Message', type: 'string'},
        partySize: {default: 2, maximum: 12, minimum: 1, title: 'Party size', type: 'number'},
        topic: {
          oneOf: [
            {const: 'sales', title: 'Sales'},
            {const: 'support', title: 'Support'},
            {const: 'press', title: 'Press'},
          ],
          title: 'Topic',
          type: 'string',
        },
      },
      required: ['fullName', 'email', 'topic', 'message', 'consent'],
      title: 'Contact us',
      type: 'object',
    })
  })

  test('contains nothing renderer-specific and no validator extension', () => {
    for (const form of [contactForm, messyForm, namesakeForm, fieldTypesForm, fieldTypeEdgesForm]) {
      const text = JSON.stringify(toJsonSchema(form).schema)
      expect(text).not.toMatch(/"ui:|errorMessage|\$id|enumNames|formatMinimum|formatMaximum|formatExclusive|\$data/u)
    }
  })

  test('collects the authored messages beside the schema', () => {
    expect(messages).toStrictEqual({
      consent: {const: 'This box must be checked.'},
      fullName: {
        maxLength: 'Names are limited to 80 characters.',
        minLength: 'Please enter at least two characters.',
        pattern: 'Names cannot contain digits.',
      },
      interests: {maxItems: 'Pick two at most.'},
      message: {maxLength: 'Keep it under 500 characters.'},
      partySize: {maximum: 'We can seat 12 at most.', minimum: 'At least one person.'},
    })
  })

  test('reports only the submit position as lossy', () => {
    expect(diagnostics.map((d) => d.code)).toStrictEqual(['lossy-submit-position'])
  })

  test('diagnostics name no renderer', () => {
    for (const form of [contactForm, messyForm, fieldTypesForm, fieldTypeEdgesForm]) {
      for (const d of toJsonSchema(form).diagnostics) {
        expect(d.message).not.toMatch(/rjsf|json forms|surveyjs|adapter/iu)
      }
    }
  })

  test('is deterministic and does not mutate its input', () => {
    const before = JSON.stringify(contactForm)
    const again = toJsonSchema(contactForm)
    expect(JSON.stringify(again.schema)).toBe(JSON.stringify(schema))
    expect(JSON.stringify(contactForm)).toBe(before)
  })
})

describe('toJsonSchema: messy content', () => {
  const {schema, diagnostics} = toJsonSchema(messyForm)
  const codes = diagnostics.map((d) => [d.path, d.code, d.severity] as const)

  test('keeps only compilable fields, in source order', () => {
    expect(Object.keys(schema.properties ?? {})).toStrictEqual([
      'dup',
      'unlabeled',
      'badRules',
      'badDefault',
      'empty',
      'dupChoices',
      'radioPh',
      'groupDefault',
      'boolRules',
    ])
    expect(schema.title).toBeUndefined()
    expect(schema.required).toStrictEqual(['boolRules'])
  })

  test('drops fields with errors and reports every loss', () => {
    expect(codes).toStrictEqual(
      expect.arrayContaining([
        ['fields[0]', 'unsupported-field-type', 'error'],
        ['fields[1]', 'unknown-field-type', 'error'],
        ['fields[2]', 'invalid-field-name', 'error'],
        ['fields[3]', 'invalid-field-name', 'error'],
        ['fields[5]', 'duplicate-field-name', 'error'],
        ['fields[6]', 'missing-label', 'info'],
        ['fields[9]', 'missing-choices', 'error'],
        ['fields[12]', 'ignored-placeholder', 'info'],
        ['fields[13]', 'ignored-default-value', 'info'],
      ]),
    )
  })

  test('a dropped field does not reserve its name', () => {
    expect(schema.properties?.empty).toStrictEqual({title: 'Empty again', type: 'string'})
    expect(codes.filter(([path]) => path === 'fields[10]')).toStrictEqual([])
  })

  test('a dropped choice field does not reserve its name from a later choice field', () => {
    const namesakes = toJsonSchema(namesakeForm)
    expect(namesakes.schema.properties).toStrictEqual({
      radioThenRadio: {oneOf: [{const: 'd', title: 'D'}], title: 'Kept radio', type: 'string'},
      radioThenSelect: {oneOf: [{const: 'b', title: 'B'}], title: 'Kept select', type: 'string'},
      selectThenRadio: {oneOf: [{const: 'a', title: 'A'}], title: 'Kept radio', type: 'string'},
      selectThenSelect: {oneOf: [{const: 'c', title: 'C'}], title: 'Kept select', type: 'string'},
    })
    expect(namesakes.diagnostics.map((d) => [d.path, d.code])).toStrictEqual([
      ['fields[0]', 'missing-choices'],
      ['fields[2]', 'missing-choices'],
      ['fields[4]', 'missing-choices'],
      ['fields[6]', 'missing-choices'],
    ])
  })

  test('normalises choices into oneOf', () => {
    expect(schema.properties?.dupChoices).toStrictEqual({
      oneOf: [
        {const: 'a', title: 'A'},
        {const: 'b', title: 'b'},
      ],
      title: 'Dup choices',
      type: 'string',
    })
  })

  test('a lone required checkbox is const true; group rules do not apply to it', () => {
    expect(schema.properties?.boolRules).toStrictEqual({const: true, title: 'Bool', type: 'boolean'})
    expect(diagnostics.filter((d) => d.path === 'fields[14]').map((d) => d.code)).toStrictEqual([
      'invalid-default-value',
      'inapplicable-validation-rule',
    ])
  })
})

describe('toJsonSchema: field types added in 0.2', () => {
  const {schema, messages, diagnostics} = toJsonSchema(fieldTypesForm)

  test('compiles every type to a portable Draft 7 shape', () => {
    expect(schema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      properties: {
        brandColor: {default: '#ff8800', pattern: COLOR_PATTERN, title: 'Brand colour', type: 'string'},
        campaign: {default: 'spring-2026', title: 'campaign', type: 'string'},
        phone: {pattern: '^\\+?[0-9 ]+$', title: 'Phone', type: 'string'},
        pickup: {default: '2026-09-04T18:30', pattern: DATETIME_LOCAL_PATTERN, title: 'Pickup', type: 'string'},
        preferredTime: {default: '18:30', pattern: TIME_PATTERN, title: 'Preferred time', type: 'string'},
        satisfaction: {default: 6, maximum: 10, minimum: 0, multipleOf: 2, title: 'Satisfaction', type: 'number'},
        startDate: {default: '2026-09-04', format: 'date', pattern: NONZERO_YEAR_PATTERN, title: 'Start date', type: 'string'},
        website: {default: 'https://example.com', format: 'uri', pattern: '^https://', title: 'Website', type: 'string'},
      },
      required: ['website', 'startDate'],
      title: 'Field types',
      type: 'object',
    })
  })

  test('the temporal and colour patterns are the exported constants', () => {
    expect(COLOR_PATTERN).toBe('^#[0-9A-Fa-f]{6}$')
    expect(TIME_PATTERN).toBe('^(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9](?:\\.[0-9]{1,3})?)?$')
    expect(DATETIME_LOCAL_PATTERN.endsWith(`T${TIME_PATTERN.slice(1)}`)).toBe(true)
  })

  test('the patterns use ASCII digit classes and no lookaround', () => {
    for (const pattern of [COLOR_PATTERN, DATETIME_LOCAL_PATTERN, NONZERO_YEAR_PATTERN, TIME_PATTERN]) {
      expect(pattern).not.toMatch(/\\[dDwWsSb]|\(\?<?[=!]/u)
    }
  })

  test('the datetime-local pattern follows the HTML date rules: leap years, year > 0, four or more year digits', () => {
    const local = new RegExp(DATETIME_LOCAL_PATTERN, 'u')
    const accepted = [
      '2024-02-29T00:00',
      '2000-02-29T00:00',
      '2400-02-29T00:00',
      '12024-02-29T00:00',
      '0001-01-01T00:00',
      '12026-09-04T18:30:15.5',
    ]
    const rejected = [
      '2025-02-29T00:00',
      '1900-02-29T00:00',
      '2100-02-29T00:00',
      '0000-01-01T00:00',
      '00000-01-01T00:00',
      '999-01-01T00:00',
      '2026-04-31T00:00',
    ]
    expect(accepted.filter((v) => !local.test(v))).toStrictEqual([])
    expect(rejected.filter((v) => local.test(v))).toStrictEqual([])
  })

  test('step becomes multipleOf only with an aligned base, and carries its message', () => {
    expect(messages).toStrictEqual({
      phone: {pattern: 'Digits, spaces and a leading + only.'},
      satisfaction: {maximum: 'At most 10.', minimum: 'At least 0.', multipleOf: 'Even numbers only.'},
      website: {pattern: 'Only https links.'},
    })
  })

  test('date bounds are reported as lossy, never encoded as a validator extension', () => {
    expect(diagnostics.map((d) => [d.path, d.field, d.code, d.severity])).toStrictEqual([
      ['fields[4]', 'startDate', 'lossy-validation-rule', 'warning'],
      ['fields[4]', 'startDate', 'lossy-validation-rule', 'warning'],
      ['fields[5]', 'pickup', 'lossy-validation-rule', 'warning'],
      ['form', undefined, 'lossy-submit-position', 'info'],
    ])
    expect(diagnostics[0]?.message).toContain('"2026-01-01"')
  })

  test('a hidden field without a label gets no missing-label diagnostic', () => {
    expect(diagnostics.some((d) => d.field === 'campaign')).toBe(false)
  })
})

describe('toJsonSchema: field type edges', () => {
  const {schema, messages, diagnostics} = toJsonSchema(fieldTypeEdgesForm)
  const codes = diagnostics.map((d) => [d.field, d.code, d.severity] as const)

  test('every field still compiles', () => {
    expect(Object.keys(schema.properties ?? {})).toHaveLength(fieldTypeEdgesForm.fields?.length ?? 0)
    expect(schema.required).toStrictEqual(['requiredHidden'])
  })

  test('a default the native input would refuse is dropped', () => {
    expect(codes.filter(([, code]) => code === 'invalid-default-value').map(([field]) => field)).toStrictEqual([
      'badEmail',
      'badUrl',
      'unicodeUrl',
      'bracketUrl',
      'namedColor',
      'shortColor',
      'badDate',
      'zeroDate',
      'utcPickup',
      'badTime',
      'wordRating',
    ])
    for (const name of [
      'badEmail',
      'badUrl',
      'unicodeUrl',
      'bracketUrl',
      'namedColor',
      'shortColor',
      'badDate',
      'zeroDate',
      'utcPickup',
      'badTime',
      'wordRating',
    ]) {
      expect(schema.properties?.[name]).not.toHaveProperty('default')
    }
  })

  test('a required hidden field with no default is a warning, not a manufactured value', () => {
    expect(schema.properties?.requiredHidden).toStrictEqual({title: 'Token', type: 'string'})
    expect(codes).toContainEqual(['requiredHidden', 'missing-default-value', 'warning'])
  })

  test('placeholders on hidden, colour and range fields are reported as ignored', () => {
    expect(codes.filter(([, code]) => code === 'ignored-placeholder').map(([field]) => field)).toStrictEqual([
      'hiddenPlaceholder',
      'shortColor',
      'wordRating',
    ])
  })

  test('date bounds are checked before they are declared lossy', () => {
    expect(codes.filter(([field]) => field === 'badDate')).toStrictEqual([
      ['badDate', 'invalid-default-value', 'warning'],
      ['badDate', 'invalid-validation-rule', 'warning'],
      ['badDate', 'invalid-validation-rule', 'warning'],
      ['badDate', 'inapplicable-validation-rule', 'warning'],
    ])
  })

  test('step: min is the step base, then the default, then 0', () => {
    expect(schema.properties?.offsetStep).toStrictEqual({maximum: 9, minimum: 1, title: 'Rating', type: 'number'})
    expect(schema.properties?.defaultBase).toStrictEqual({default: 3, title: 'Rating', type: 'number'})
    expect(schema.properties?.alignedDefaultBase).toStrictEqual({default: 4, multipleOf: 2, title: 'Rating', type: 'number'})
    expect(schema.properties?.noBaseStep).toStrictEqual({multipleOf: 5, title: 'Rating', type: 'number'})
    expect(codes.filter(([field]) => field === 'offsetStep')).toStrictEqual([['offsetStep', 'lossy-validation-rule', 'warning']])
    expect(codes.filter(([field]) => field === 'defaultBase')).toStrictEqual([['defaultBase', 'lossy-validation-rule', 'warning']])
    expect(codes.filter(([field]) => field === 'alignedDefaultBase')).toStrictEqual([])
    expect(messages.offsetStep).toStrictEqual({maximum: 'max', minimum: 'min'})
    expect(messages.alignedDefaultBase).toStrictEqual({multipleOf: 'x'})
  })

  test('step: fractional is lossy, "any" is a no-op, 0 is invalid', () => {
    expect(schema.properties?.fractionStep).toStrictEqual({title: 'Rating', type: 'number'})
    expect(codes.filter(([field]) => field === 'fractionStep')).toStrictEqual([['fractionStep', 'lossy-validation-rule', 'warning']])
    expect(codes.filter(([field]) => field === 'anyStep')).toStrictEqual([['anyStep', 'lossy-validation-rule', 'info']])
    expect(codes.filter(([field]) => field === 'zeroStep')).toStrictEqual([['zeroStep', 'invalid-validation-rule', 'warning']])
  })
})
