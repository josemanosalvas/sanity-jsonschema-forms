import Ajv from 'ajv'
import type {ErrorObject, SchemaObject} from 'ajv'
import addFormats from 'ajv-formats'
import {contactForm, contactSubmissions} from 'sanity-form-fixtures'
import {describe, expect, test} from 'vitest'

import type {MessageKeyword} from '../src'
import {toJsonSchema} from '../src'

/**
 * The compiled schema through plain AJV, whose default dialect is Draft 7, with ajv-formats,
 * no renderer involved: the contract must validate on its own.
 */
describe('compiled schema validates with plain AJV', () => {
  const {schema, messages} = toJsonSchema(contactForm)
  const ajv = new Ajv({allErrors: true})
  addFormats(ajv)
  const validate = ajv.compile(schema as SchemaObject)

  const describeError = (e: ErrorObject) => {
    const field = e.keyword === 'required' ? String(e.params.missingProperty) : e.instancePath.slice(1)
    const authored = messages[field]?.[e.keyword as MessageKeyword]
    return `${field} ${e.keyword}: ${authored ?? e.message}`
  }
  const run = (data: unknown) => {
    const ok = validate(data)
    return {ok, errors: (validate.errors ?? []).map(describeError)}
  }

  test.each(Object.entries(contactSubmissions))('%s reaches the expected verdict', (_, submission) => {
    expect(run(submission.data).ok).toBe(submission.verdict === 'accept')
  })

  test('an empty submission names every required property', () => {
    expect(run({}).errors).toStrictEqual([
      "fullName required: must have required property 'fullName'",
      "email required: must have required property 'email'",
      "topic required: must have required property 'topic'",
      "message required: must have required property 'message'",
      "consent required: must have required property 'consent'",
    ])
  })

  test('every authored message can be looked up by (field, keyword)', () => {
    expect(run(contactSubmissions.everyRuleFails.data).errors).toStrictEqual([
      'fullName pattern: Names cannot contain digits.',
      'email format: must match format "email"',
      'partySize minimum: At least one person.',
      // An off-list value fails every branch const and then the oneOf itself.
      'topic const: must be equal to constant',
      'topic const: must be equal to constant',
      'topic const: must be equal to constant',
      'topic oneOf: must match exactly one schema in oneOf',
      'contactMethod const: must be equal to constant',
      'contactMethod const: must be equal to constant',
      'contactMethod oneOf: must match exactly one schema in oneOf',
      'interests maxItems: Pick two at most.',
      'message maxLength: Keep it under 500 characters.',
      'consent const: This box must be checked.',
    ])
  })

  test('minLength and maximum carry their messages', () => {
    expect(run(contactSubmissions.minLengthAndMaximum.data).errors).toStrictEqual([
      'fullName minLength: Please enter at least two characters.',
      'partySize maximum: We can seat 12 at most.',
    ])
  })
})
