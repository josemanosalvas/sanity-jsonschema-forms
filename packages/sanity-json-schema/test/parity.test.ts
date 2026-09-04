import validator from '@rjsf/validator-ajv8'
import Ajv, {type SchemaObject} from 'ajv'
import addFormats from 'ajv-formats'
import {contactForm, contactSubmissions, messyForm} from 'sanity-form-fixtures'
import {toRjsf} from 'sanity-rjsf'
import {describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'

/**
 * Spike 1 (`sanity-rjsf`, frozen) and spike 2 compile the same documents.
 * They must agree on what was lost and on which submissions pass, even
 * though their schemas differ in shape (enum vs oneOf, enum [true] vs const).
 */
describe('parity with sanity-rjsf', () => {
  test.each([
    ['contact', contactForm],
    ['messy', messyForm],
  ])('%s: identical diagnostics', (_, form) => {
    expect(toJsonSchema(form).diagnostics).toEqual(toRjsf(form).diagnostics)
  })

  test('identical property sets and required lists', () => {
    for (const form of [contactForm, messyForm]) {
      const a = toRjsf(form).schema
      const b = toJsonSchema(form).schema
      expect(Object.keys(b.properties ?? {})).toEqual(Object.keys(a.properties ?? {}))
      expect(b.required).toEqual(a.required)
    }
  })

  test.each(Object.entries(contactSubmissions))('%s: identical verdict from both validators', (_, submission) => {
    const spike1 = validator.validateFormData(submission.data, toRjsf(contactForm).schema).errors.length === 0
    const ajv = new Ajv({allErrors: true})
    addFormats(ajv)
    const spike2 = ajv.validate(toJsonSchema(contactForm).schema as SchemaObject, submission.data) === true
    expect(spike1).toBe(submission.verdict === 'accept')
    expect(spike2).toBe(submission.verdict === 'accept')
  })
})
