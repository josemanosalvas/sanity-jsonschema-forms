import {createAjv} from '@jsonforms/core'
import validator from '@rjsf/validator-ajv8'
import Ajv from 'ajv'
import type {SchemaObject} from 'ajv'
import addFormats from 'ajv-formats'
import {contactForm, contactSubmissions, fieldTypesForm, fieldTypesSubmissions} from 'sanity-form-fixtures'
import type {Submission} from 'sanity-form-fixtures'
import {Model} from 'survey-core'
import {describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'
import {toSurveyJsProps} from '../src/surveyjs'

/** One schema, four validators, one verdict. Wording and error counts may differ; SurveyJS divergences are listed per case. */
const suites = [
  {
    form: contactForm,
    name: 'contact form',
    submissions: contactSubmissions as Record<string, Submission>,
    surveyJsDivergence: {
      // Its checkbox widget cannot produce a duplicate; the payload is not checked for one.
      duplicateInterests: 'accept',
    } as Record<string, 'accept' | 'reject'>,
  },
  {
    form: fieldTypesForm,
    name: 'field types added in 0.2',
    submissions: fieldTypesSubmissions as Record<string, Submission>,
    surveyJsDivergence: {
      // No calendar check behind `inputType: date`.
      dateFebruary30: 'accept',
      // A numeric string is converted to a number before validation.
      satisfactionAsString: 'accept',
      // No URL check behind `inputType: url`; the native input alone enforces it (`websiteRelative` fails the authored pattern instead).
      websiteNonAscii: 'accept',
      websiteSpace: 'accept',
    } as Record<string, 'accept' | 'reject'>,
  },
]

describe.each(suites)('$name: the same verdict from every validator', ({form, submissions, surveyJsDivergence}) => {
  const compiled = toJsonSchema(form)
  const schema = compiled.schema as SchemaObject

  const plainAjv = new Ajv({allErrors: true})
  addFormats(plainAjv)
  const plain = plainAjv.compile(schema)

  const jsonFormsAjv = createAjv()
  const jsonForms = jsonFormsAjv.compile(schema)

  const {surveyJson} = toSurveyJsProps(form, compiled)

  const cases = Object.entries(submissions).map(([name, submission]) => ({
    data: submission.data,
    expected: submission.verdict === 'accept',
    name,
    surveyJs: (surveyJsDivergence[name] ?? submission.verdict) === 'accept',
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

  test.each(cases)('$name: SurveyJS', ({data, surveyJs}) => {
    const model = new Model(surveyJson)
    model.data = data
    expect(model.validate(true, false)).toBe(surveyJs)
  })
})
