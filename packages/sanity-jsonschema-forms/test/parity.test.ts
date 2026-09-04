import {createAjv} from '@jsonforms/core'
import validator from '@rjsf/validator-ajv8'
import Ajv from 'ajv'
import type {SchemaObject} from 'ajv'
import addFormats from 'ajv-formats'
import {contactForm, contactSubmissions, fieldTypesForm, fieldTypesSubmissions} from 'sanity-form-fixtures'
import type {Submission} from 'sanity-form-fixtures'
import {describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'

/** One schema, three validators, one verdict. Wording and error counts may differ; the verdict may not. */
const suites = [
  {
    form: contactForm,
    name: 'contact form',
    submissions: contactSubmissions as Record<string, Submission>,
  },
  {
    form: fieldTypesForm,
    name: 'field types added in 0.2',
    submissions: fieldTypesSubmissions as Record<string, Submission>,
  },
]

describe.each(suites)('$name: the same verdict from every validator', ({form, submissions}) => {
  const compiled = toJsonSchema(form)
  const schema = compiled.schema as SchemaObject

  const plainAjv = new Ajv({allErrors: true})
  addFormats(plainAjv)
  const plain = plainAjv.compile(schema)

  const jsonFormsAjv = createAjv()
  const jsonForms = jsonFormsAjv.compile(schema)

  const cases = Object.entries(submissions).map(([name, submission]) => ({
    data: submission.data,
    expected: submission.verdict === 'accept',
    name,
  }))

  test.each(cases)('$name: plain AJV', ({data, expected}) => {
    expect(plain(data)).toBe(expected)
  })

  test.each(cases)('$name: @rjsf/validator-ajv8', ({data, expected}) => {
    expect(validator.isValid(schema, data, schema)).toBe(expected)
    expect(validator.validateFormData(data, schema).errors.length === 0).toBe(expected)
  })

  test.each(cases)('$name: JSON Forms AJV', ({data, expected}) => {
    expect(jsonForms(data)).toBe(expected)
  })
})
