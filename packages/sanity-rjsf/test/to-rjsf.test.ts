import {describe, expect, test} from 'vitest'

import {toRjsf} from '../src'
import {contactForm, messyForm} from 'sanity-form-fixtures'

describe('toRjsf: contact form (every supported type once)', () => {
  const {schema, uiSchema, diagnostics} = toRjsf(contactForm)

  test('compiles to the expected JSON Schema', () => {
    expect(schema).toEqual({
      type: 'object',
      title: 'Contact us',
      required: ['fullName', 'email', 'topic', 'message', 'consent'],
      properties: {
        fullName: {type: 'string', title: 'Full name', minLength: 2, maxLength: 80, pattern: '^[^0-9]*$'},
        email: {type: 'string', title: 'Email', format: 'email'},
        partySize: {type: 'number', title: 'Party size', default: 2, minimum: 1, maximum: 12},
        topic: {type: 'string', title: 'Topic', enum: ['sales', 'support', 'press']},
        contactMethod: {type: 'string', title: 'Preferred contact method', default: 'email', enum: ['email', 'phone']},
        interests: {
          type: 'array',
          title: 'Interests',
          uniqueItems: true,
          maxItems: 2,
          items: {type: 'string', enum: ['updates', 'events', 'newsletter']},
        },
        message: {type: 'string', title: 'Message', maxLength: 500},
        consent: {type: 'boolean', title: 'I agree to be contacted', enum: [true]},
      },
    })
  })

  test('compiles to the expected uiSchema', () => {
    expect(uiSchema).toEqual({
      fullName: {'ui:placeholder': 'Ada Lovelace'},
      email: {'ui:widget': 'email', 'ui:placeholder': 'you@example.com'},
      partySize: {'ui:placeholder': 'How many?'},
      topic: {'ui:enumNames': ['Sales', 'Support', 'Press']},
      contactMethod: {'ui:enumNames': ['Email', 'Phone'], 'ui:widget': 'radio', 'ui:optionValueFormat': 'realValue'},
      interests: {'ui:widget': 'checkboxes', items: {'ui:enumNames': ['Product updates', 'Events', 'Newsletter']}},
      message: {'ui:widget': 'textarea', 'ui:placeholder': 'How can we help?'},
      'ui:order': ['fullName', 'email', 'partySize', 'topic', 'contactMethod', 'interests', 'message', 'consent'],
      'ui:submitButtonOptions': {submitText: 'Send message'},
    })
  })

  test('only reports the submit button position as lossy', () => {
    expect(diagnostics).toEqual([
      {
        severity: 'info',
        code: 'lossy-submit-position',
        path: 'form',
        message: 'RJSF has no submit button alignment option, so position "right" is left to the theme.',
      },
    ])
  })

  test('is deterministic', () => {
    const again = toRjsf(contactForm)
    expect(again.schema).toEqual(schema)
    expect(again.uiSchema).toEqual(uiSchema)
    expect(JSON.stringify(again.schema)).toBe(JSON.stringify(schema))
  })

  test('does not mutate its input', () => {
    const before = JSON.stringify(contactForm)
    toRjsf(contactForm)
    expect(JSON.stringify(contactForm)).toBe(before)
  })
})

describe('toRjsf: messy content never throws and reports every loss', () => {
  const {schema, uiSchema, diagnostics} = toRjsf(messyForm)
  const codes = diagnostics.map((d) => [d.path, d.code, d.severity] as const)

  test('keeps only the fields it could compile, in source order', () => {
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
    expect(uiSchema['ui:order']).toEqual(Object.keys(schema.properties ?? {}))
    expect(schema.title).toBeUndefined()
    expect(schema.required).toEqual(['boolRules'])
  })

  test('drops unsupported, custom, badly named and duplicate fields with errors', () => {
    expect(codes).toEqual(
      expect.arrayContaining([
        ['fields[0]', 'unsupported-field-type', 'error'],
        ['fields[1]', 'unsupported-field-type', 'error'],
        ['fields[2]', 'unsupported-field-type', 'error'],
        ['fields[3]', 'unknown-field-type', 'error'],
        ['fields[4]', 'invalid-field-name', 'error'],
        ['fields[5]', 'invalid-field-name', 'error'],
        ['fields[7]', 'duplicate-field-name', 'error'],
        ['fields[8]', 'missing-label', 'info'],
        ['fields[11]', 'missing-choices', 'error'],
      ]),
    )
  })

  test('drops each bad validation rule with its own warning and keeps none of them', () => {
    expect(schema.properties?.badRules).toEqual({type: 'string', title: 'Bad rules'})
    const ruleDiagnostics = diagnostics.filter((d) => d.path === 'fields[9]')
    expect(ruleDiagnostics.map((d) => d.code)).toEqual([
      'invalid-validation-rule',
      'invalid-validation-rule',
      'inapplicable-validation-rule',
      'invalid-validation-rule',
      'unsupported-validation-rule',
    ])
    expect(ruleDiagnostics.every((d) => d.severity === 'warning' && d.field === 'badRules')).toBe(true)
  })

  test('drops a non-numeric number default', () => {
    expect(schema.properties?.badDefault).toEqual({type: 'number', title: 'Bad default'})
    expect(codes).toContainEqual(['fields[10]', 'invalid-default-value', 'warning'])
  })

  test('normalises choices: drops repeats and empty values, label falls back to value', () => {
    expect(schema.properties?.dupChoices).toEqual({type: 'string', title: 'Dup choices', enum: ['a', 'b']})
    expect(uiSchema.dupChoices).toEqual({'ui:enumNames': ['A', 'b'], 'ui:placeholder': 'Pick one'})
    expect(diagnostics.filter((d) => d.path === 'fields[12]').map((d) => d.code)).toEqual([
      'invalid-choice',
      'invalid-choice',
      'invalid-default-value',
    ])
  })

  test('ignores a placeholder on a radio and a default on a checkbox group', () => {
    expect(uiSchema.radioPh).toEqual({'ui:enumNames': ['X'], 'ui:widget': 'radio', 'ui:optionValueFormat': 'realValue'})
    expect(codes).toContainEqual(['fields[13]', 'ignored-placeholder', 'info'])
    expect(schema.properties?.groupDefault).not.toHaveProperty('default')
    expect(codes).toContainEqual(['fields[14]', 'ignored-default-value', 'info'])
  })

  test('a lone required checkbox becomes enum [true]; group rules do not apply to it', () => {
    expect(schema.properties?.boolRules).toEqual({type: 'boolean', title: 'Bool', enum: [true]})
    expect(diagnostics.filter((d) => d.path === 'fields[15]').map((d) => d.code)).toEqual([
      'invalid-default-value',
      'inapplicable-validation-rule',
    ])
  })
})

describe('toRjsf: edge cases', () => {
  test('an empty form compiles to an empty object schema', () => {
    expect(toRjsf({title: 'Empty', id: {current: 'empty'}})).toMatchObject({
      schema: {type: 'object', title: 'Empty', properties: {}},
      uiSchema: {'ui:order': []},
      diagnostics: [],
    })
  })

  test('a required checkbox group needs at least one selection', () => {
    const {schema} = toRjsf({
      title: 't',
      id: {current: 't'},
      fields: [
        {type: 'checkbox', name: 'a', label: 'A', required: true, choices: [{label: 'x', value: 'x'}]},
        {
          type: 'checkbox',
          name: 'b',
          label: 'B',
          required: true,
          choices: [{label: 'x', value: 'x'}, {label: 'y', value: 'y'}],
          validation: [{type: 'minSelectedCount', value: '2', message: 'both'}],
        },
      ],
    })
    expect(schema.properties?.a).toMatchObject({minItems: 1})
    expect(schema.properties?.b).toMatchObject({minItems: 2})
  })

  test('a boolean default of "true" is honoured', () => {
    const {schema} = toRjsf({
      title: 't',
      id: {current: 't'},
      fields: [{type: 'checkbox', name: 'a', label: 'A', options: {defaultValue: 'true'}}],
    })
    expect(schema.properties?.a).toEqual({type: 'boolean', title: 'A', default: true})
  })
})
