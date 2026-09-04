import {contactForm, messyForm} from 'sanity-form-fixtures'
import {describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'

describe('toJsonSchema: contact form', () => {
  const {schema, messages, diagnostics} = toJsonSchema(contactForm)

  test('compiles to JSON Schema Draft 7 and declares the dialect', () => {
    expect(schema).toEqual({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: 'Contact us',
      required: ['fullName', 'email', 'topic', 'message', 'consent'],
      properties: {
        fullName: {type: 'string', title: 'Full name', minLength: 2, maxLength: 80, pattern: '^[^0-9]*$'},
        email: {type: 'string', title: 'Email', format: 'email'},
        partySize: {type: 'number', title: 'Party size', default: 2, minimum: 1, maximum: 12},
        topic: {
          type: 'string',
          title: 'Topic',
          oneOf: [
            {const: 'sales', title: 'Sales'},
            {const: 'support', title: 'Support'},
            {const: 'press', title: 'Press'},
          ],
        },
        contactMethod: {
          type: 'string',
          title: 'Preferred contact method',
          default: 'email',
          oneOf: [
            {const: 'email', title: 'Email'},
            {const: 'phone', title: 'Phone'},
          ],
        },
        interests: {
          type: 'array',
          title: 'Interests',
          uniqueItems: true,
          maxItems: 2,
          items: {
            type: 'string',
            oneOf: [
              {const: 'updates', title: 'Product updates'},
              {const: 'events', title: 'Events'},
              {const: 'newsletter', title: 'Newsletter'},
            ],
          },
        },
        message: {type: 'string', title: 'Message', maxLength: 500},
        consent: {type: 'boolean', title: 'I agree to be contacted', const: true},
      },
    })
  })

  test('contains nothing renderer-specific', () => {
    const text = JSON.stringify(schema)
    expect(text).not.toMatch(/"ui:|errorMessage|\$id|enumNames/u)
  })

  test('collects the authored messages beside the schema', () => {
    expect(messages).toEqual({
      fullName: {
        minLength: 'Please enter at least two characters.',
        maxLength: 'Names are limited to 80 characters.',
        pattern: 'Names cannot contain digits.',
      },
      partySize: {minimum: 'At least one person.', maximum: 'We can seat 12 at most.'},
      interests: {maxItems: 'Pick two at most.'},
      message: {maxLength: 'Keep it under 500 characters.'},
      consent: {const: 'This box must be checked.'},
    })
  })

  test('reports only the submit position as lossy', () => {
    expect(diagnostics.map((d) => d.code)).toEqual(['lossy-submit-position'])
  })

  test('diagnostics name no renderer', () => {
    for (const form of [contactForm, messyForm]) {
      for (const d of toJsonSchema(form).diagnostics) expect(d.message).not.toMatch(/rjsf|json forms|surveyjs|adapter/iu)
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
    expect(Object.keys(schema.properties ?? {})).toEqual([
      'dup',
      'unlabeled',
      'badRules',
      'badDefault',
      'dupChoices',
      'radioPh',
      'groupDefault',
      'boolRules',
    ])
    expect(schema.title).toBeUndefined()
    expect(schema.required).toEqual(['boolRules'])
  })

  test('drops fields with errors and reports every loss', () => {
    expect(codes).toEqual(
      expect.arrayContaining([
        ['fields[0]', 'unsupported-field-type', 'error'],
        ['fields[3]', 'unknown-field-type', 'error'],
        ['fields[4]', 'invalid-field-name', 'error'],
        ['fields[5]', 'invalid-field-name', 'error'],
        ['fields[7]', 'duplicate-field-name', 'error'],
        ['fields[8]', 'missing-label', 'info'],
        ['fields[11]', 'missing-choices', 'error'],
        ['fields[13]', 'ignored-placeholder', 'info'],
        ['fields[14]', 'ignored-default-value', 'info'],
      ]),
    )
  })

  test('normalises choices into oneOf', () => {
    expect(schema.properties?.dupChoices).toEqual({
      type: 'string',
      title: 'Dup choices',
      oneOf: [
        {const: 'a', title: 'A'},
        {const: 'b', title: 'b'},
      ],
    })
  })

  test('a lone required checkbox is const true; group rules do not apply to it', () => {
    expect(schema.properties?.boolRules).toEqual({type: 'boolean', title: 'Bool', const: true})
    expect(diagnostics.filter((d) => d.path === 'fields[15]').map((d) => d.code)).toEqual([
      'invalid-default-value',
      'inapplicable-validation-rule',
    ])
  })
})
