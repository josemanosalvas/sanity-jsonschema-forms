import {contactForm, messyForm, namesakeForm} from 'sanity-form-fixtures'
import {describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'

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

  test('contains nothing renderer-specific', () => {
    const text = JSON.stringify(schema)
    expect(text).not.toMatch(/"ui:|errorMessage|\$id|enumNames/u)
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
    for (const form of [contactForm, messyForm]) {
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
        ['fields[3]', 'unknown-field-type', 'error'],
        ['fields[4]', 'invalid-field-name', 'error'],
        ['fields[5]', 'invalid-field-name', 'error'],
        ['fields[7]', 'duplicate-field-name', 'error'],
        ['fields[8]', 'missing-label', 'info'],
        ['fields[11]', 'missing-choices', 'error'],
        ['fields[14]', 'ignored-placeholder', 'info'],
        ['fields[15]', 'ignored-default-value', 'info'],
      ]),
    )
  })

  test('a dropped field does not reserve its name', () => {
    expect(schema.properties?.empty).toStrictEqual({title: 'Empty again', type: 'string'})
    expect(codes.filter(([path]) => path === 'fields[12]')).toStrictEqual([])
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
    expect(diagnostics.filter((d) => d.path === 'fields[16]').map((d) => d.code)).toStrictEqual([
      'invalid-default-value',
      'inapplicable-validation-rule',
    ])
  })
})
