import Ajv from 'ajv'
import type {SchemaObject} from 'ajv'
import addFormats from 'ajv-formats'
import {contactForm, fieldTypeEdgesForm, fieldTypesForm, messyForm, namesakeForm} from 'sanity-form-fixtures'
import {describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'

describe('fixture defaults validate against their property schemas', () => {
  const ajv = new Ajv({allErrors: true})
  addFormats(ajv)
  const forms = {contactForm, fieldTypeEdgesForm, fieldTypesForm, messyForm, namesakeForm}
  const cases = Object.entries(forms).flatMap(([formName, form]) =>
    Object.entries(toJsonSchema(form).schema.properties ?? {})
      .filter((entry): entry is [string, SchemaObject] => typeof entry[1] === 'object' && 'default' in entry[1])
      .map(([name, property]) => ({formName, name, property})),
  )

  test.each(cases)('$formName.$name', ({property}) => {
    expect(ajv.validate(property, property.default)).toBe(true)
  })
})
