import validator from '@rjsf/validator-ajv8'
import {describe, expect, test} from 'vitest'

import {toRjsf} from '../src'
import {contactForm} from './fixtures/contact'

/**
 * Runs the compiled schema through the validator RJSF ships, so the mapping is
 * proven against AJV rather than against our own expectations.
 */
describe('compiled schema validates with @rjsf/validator-ajv8', () => {
  const {schema, transformErrors} = toRjsf(contactForm)

  const errorsFor = (formData: unknown) =>
    transformErrors(validator.validateFormData(formData, schema).errors).map((e) => `${e.property} ${e.name}: ${e.message}`)

  test('a complete, valid submission has no errors', () => {
    expect(
      errorsFor({
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        partySize: 4,
        topic: 'sales',
        contactMethod: 'phone',
        interests: ['events'],
        message: 'Hello',
        consent: true,
      }),
    ).toEqual([])
  })

  test('an empty submission fails every required field', () => {
    expect(errorsFor({})).toEqual([
      "fullName required: must have required property 'Full name'",
      "email required: must have required property 'Email'",
      "topic required: must have required property 'Topic'",
      "message required: must have required property 'Message'",
      "consent required: must have required property 'I agree to be contacted'",
    ])
  })

  test('every authored rule fires with the message the editor wrote', () => {
    expect(
      errorsFor({
        fullName: 'A1',
        email: 'not-an-email',
        partySize: 0,
        topic: 'other',
        contactMethod: 'fax',
        interests: ['updates', 'events', 'newsletter'],
        message: 'x'.repeat(501),
        consent: false,
      }),
    ).toEqual([
      '.fullName pattern: Names cannot contain digits.',
      '.email format: must match format "email"',
      '.partySize minimum: At least one person.',
      '.topic enum: must be equal to one of the allowed values',
      '.contactMethod enum: must be equal to one of the allowed values',
      '.interests maxItems: Pick two at most.',
      '.message maxLength: Keep it under 500 characters.',
      '.consent enum: This box must be checked.',
    ])
  })

  test('minLength and maximum carry their messages too', () => {
    expect(errorsFor({fullName: 'A', partySize: 13, email: 'a@b.co', topic: 'press', message: 'ok', consent: true})).toEqual([
      '.fullName minLength: Please enter at least two characters.',
      '.partySize maximum: We can seat 12 at most.',
    ])
  })

  test('a duplicate selection in a checkbox group is rejected by uniqueItems', () => {
    expect(errorsFor({fullName: 'Ada', email: 'a@b.co', topic: 'press', message: 'ok', consent: true, interests: ['events', 'events']})).toEqual([
      '.interests uniqueItems: must NOT have duplicate items (items ## 1 and 0 are identical)',
    ])
  })
})
