import {describe, expect, test} from 'vitest'

import type {FormToolkitForm} from '../src'
import {toJsonSchema} from '../src'
import {toJsonFormsProps} from '../src/jsonforms'
import {toRjsfProps} from '../src/rjsf'

describe('malformed content at the fetch boundary', () => {
  test.each([
    {code: 'invalid-form', input: null},
    {code: 'invalid-form', input: {fields: {}}},
    {code: 'invalid-form', input: {fields: 'fields'}},
    {code: 'unknown-field-type', input: {fields: [null, 1]}},
    {code: 'invalid-choice', input: {fields: [{choices: {}, name: 'choice', type: 'checkbox'}]}},
    {code: 'invalid-validation-rule', input: {fields: [{label: 'Text', name: 'text', type: 'text', validation: {}}]}},
    {code: 'lossy-submit-position', input: {submitButton: {position: {toString: null}, text: 42}}},
  ])('$code: $input', ({input, code}) => {
    const form = input as unknown as FormToolkitForm
    const compiled = toJsonSchema(form)
    expect(compiled.diagnostics).toStrictEqual(expect.arrayContaining([expect.objectContaining({code})]))
    expect(toRjsfProps(form, compiled).schema).toBe(compiled.schema)
    expect(toJsonFormsProps(form, compiled).schema).toBe(compiled.schema)
  })

  test('a malformed choice field leaves its name available to the next field', () => {
    const form = {
      fields: [
        {choices: {}, name: 'contact', type: 'checkbox'},
        {label: 'Contact', name: 'contact', type: 'textarea'},
      ],
    } as unknown as FormToolkitForm
    const compiled = toJsonSchema(form)
    expect(compiled.schema.properties).toStrictEqual({contact: {title: 'Contact', type: 'string'}})
    expect(toRjsfProps(form, compiled).uiSchema.contact).toStrictEqual({'ui:widget': 'textarea'})
    expect(toJsonFormsProps(form, compiled).uischema).toMatchObject({elements: [{options: {multi: true}}]})
  })

  test('a later constraint replaces its message, including an empty message', () => {
    const {schema, messages} = toJsonSchema({
      fields: [
        {
          name: 'count',
          type: 'number',
          validation: [
            {message: 'At least five.', type: 'min', value: '5'},
            {message: '', type: 'min', value: '10'},
            {message: 'Must not replace the valid rule.', type: 'min', value: 'invalid'},
          ],
        },
      ],
      title: 'Repeated rule',
    })
    expect(schema.properties?.count).toMatchObject({minimum: 10})
    expect(messages.count?.minimum).toBeUndefined()
  })

  test('normalised datetime-local types accept local date bounds', () => {
    const {diagnostics} = toJsonSchema({
      fields: [
        {
          label: 'When',
          name: 'when',
          type: ' datetime-local ',
          validation: [{message: 'Later, please.', type: 'minDate', value: '2026-09-05T12:30'}],
        },
      ],
      title: 'Schedule',
    })
    expect(diagnostics.map(({code}) => code)).toStrictEqual(['lossy-validation-rule'])
  })

  test('JSON Forms seeds only authored defaults, preserving false and zero', () => {
    const form: FormToolkitForm = {
      fields: [
        {name: 'count', options: {defaultValue: '0'}, type: 'number'},
        {name: 'consent', options: {defaultValue: 'false'}, required: true, type: 'checkbox'},
        {name: 'date', type: 'date'},
        {choices: [{label: 'A', value: 'a'}], name: 'choice', type: 'select'},
      ],
      title: 'Defaults',
    }
    const compiled = toJsonSchema(form)
    const first = toJsonFormsProps(form, compiled)
    expect(first.initialData).toStrictEqual({consent: false, count: 0})
    first.initialData.count = 42
    expect(toJsonFormsProps(form, compiled).initialData).toStrictEqual({consent: false, count: 0})
  })
})
