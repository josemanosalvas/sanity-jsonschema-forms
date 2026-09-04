import Ajv from 'ajv'
import type {SchemaObject} from 'ajv'
import addFormats from 'ajv-formats'
import {array, assert, boolean, constantFrom, integer, oneof, property, record, string, stringMatching} from 'fast-check'
import type {Arbitrary} from 'fast-check'
import {describe, expect, test} from 'vitest'

import {FORM_TOOLKIT_FIELD_TYPES, toJsonSchema} from '../src'
import type {FormToolkitField, FormToolkitForm} from '../src'
import {presentationFields} from '../src/internal/fields'

/** Compiler invariants over arbitrary form documents, including ones the Studio would never store. */

const RULE_TYPES = [...new Set(Object.values(FORM_TOOLKIT_FIELD_TYPES).flat()), 'bogus']
const FIELD_TYPES = [...Object.keys(FORM_TOOLKIT_FIELD_TYPES), 'bogus', '']

const name = oneof(
  {arbitrary: constantFrom('fullName', 'email', 'topic', 'consent', 'a', 'a', 'a'), weight: 4},
  constantFrom('constructor', '__proto__', 'hasOwnProperty', 'with space', '1st', '', 'ünïcode'),
  stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{0,8}$/u),
)

const operand = oneof(
  integer({max: 20, min: -3}).map(String),
  constantFrom(
    '0.5',
    'any',
    '',
    ' 3 ',
    '1e2',
    'NaN',
    'Infinity',
    '2026-01-01',
    '2026-02-30',
    '2026-01-01T10:00',
    '^[^0-9]*$',
    '(',
    '\\d+',
    '^https://',
  ),
  string({maxLength: 6}),
)

const rule = record({message: string({maxLength: 12}), type: constantFrom(...RULE_TYPES), value: operand})

const choice = record({
  label: string({maxLength: 8}),
  value: oneof(constantFrom('', ' ', 'a', 'b', 'c'), string({maxLength: 5})),
})

const defaultValue = oneof(
  constantFrom(
    '',
    'a',
    'true',
    'false',
    '2',
    '0',
    '2026-09-04',
    '2026-02-30',
    '18:30',
    '2026-09-04T18:30',
    '#ff8800',
    'red',
    'https://example.com',
    'example.com',
  ),
  string({maxLength: 10}),
)

const field: Arbitrary<FormToolkitField> = record(
  {
    choices: array(choice, {maxLength: 4}),
    label: string({maxLength: 10}),
    name,
    options: record({defaultValue, placeholder: string({maxLength: 8})}, {requiredKeys: []}),
    required: boolean(),
    type: constantFrom(...FIELD_TYPES),
    validation: array(rule, {maxLength: 4}),
  },
  {requiredKeys: ['name', 'type']},
).map((f) => f as FormToolkitField)

const form: Arbitrary<FormToolkitForm> = record(
  {
    fields: array(field, {maxLength: 6}),
    submitButton: record({position: constantFrom('left', 'center', 'right'), text: string({maxLength: 8})}),
    title: string({maxLength: 12}),
  },
  {requiredKeys: ['title']},
)

const ajv = new Ajv({allErrors: true})
addFormats(ajv)

const FORBIDDEN_KEYS = new Set([
  'errorMessage',
  '$id',
  'enumNames',
  'formatMinimum',
  'formatMaximum',
  'formatExclusiveMinimum',
  'formatExclusiveMaximum',
  '$data',
])

/** Keys anywhere in the schema that belong to a renderer or a validator extension; values are not inspected. */
const forbiddenKeys = (node: unknown): string[] => {
  if (typeof node !== 'object' || node === null) {
    return []
  }
  return Object.entries(node).flatMap(([key, value]) => [
    ...(FORBIDDEN_KEYS.has(key) || key.startsWith('ui:') ? [key] : []),
    ...forbiddenKeys(value),
  ])
}

describe('toJsonSchema over arbitrary forms', () => {
  test('never throws on content, and is a pure function of its input', () => {
    assert(
      property(form, (input) => {
        const before = JSON.stringify(input)
        const once = toJsonSchema(input)
        expect(JSON.stringify(input)).toBe(before)
        expect(toJsonSchema(input)).toStrictEqual(once)
      }),
    )
  })

  test("every schema is valid Draft 7 by AJV's metaschema, compiles, and carries nothing renderer-specific", () => {
    assert(
      property(form, (input) => {
        const {schema} = toJsonSchema(input)
        expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#')
        expect(ajv.validateSchema(schema as SchemaObject)).toBe(true)
        expect(() => ajv.compile(schema as SchemaObject)).not.toThrow()
        expect(forbiddenKeys(schema)).toStrictEqual([])
      }),
    )
  })

  test('every emitted default has the value shape its type implies', () => {
    // Authored rules and `required` are not checked against defaults (docs/json-schema-contract.md, "Defaults").
    const AUTHORED = ['minLength', 'maxLength', 'minimum', 'maximum', 'multipleOf', 'minItems', 'maxItems', 'const'] as const
    const AUTHORED_PATTERN = new Set(['text', 'textarea', 'email', 'url', 'tel'])
    assert(
      property(form, (input) => {
        const {schema} = toJsonSchema(input)
        for (const {name: fieldName, type} of presentationFields(input, schema)) {
          const propertySchema = schema.properties?.[fieldName]
          if (typeof propertySchema !== 'object' || !('default' in propertySchema)) {
            continue
          }
          const {
            [AUTHORED[0]]: _a,
            [AUTHORED[1]]: _b,
            [AUTHORED[2]]: _c,
            [AUTHORED[3]]: _d,
            [AUTHORED[4]]: _e,
            [AUTHORED[5]]: _f,
            [AUTHORED[6]]: _g,
            [AUTHORED[7]]: _h,
            ...shape
          } = propertySchema
          if (AUTHORED_PATTERN.has(type)) {
            delete shape.pattern
          }
          expect(ajv.validate(shape as SchemaObject, propertySchema.default)).toBe(true)
        }
      }),
    )
  })

  test('required, messages and diagnostics only name properties and fields that exist', () => {
    assert(
      property(form, (input) => {
        const {schema, messages, diagnostics} = toJsonSchema(input)
        const properties = Object.keys(schema.properties ?? {})
        expect(new Set(properties).size).toBe(properties.length)
        for (const required of schema.required ?? []) {
          expect(properties).toContain(required)
        }
        for (const [fieldName, keywords] of Object.entries(messages)) {
          expect(properties).toContain(fieldName)
          const propertySchema = schema.properties?.[fieldName]
          for (const keyword of Object.keys(keywords)) {
            expect(propertySchema).toHaveProperty(keyword)
          }
        }
        for (const diagnostic of diagnostics) {
          const index = /^fields\[(?<index>\d+)\]$/u.exec(diagnostic.path)?.groups?.index
          expect(diagnostic.path === 'form' || (index !== undefined && Number(index) < (input.fields?.length ?? 0))).toBe(true)
        }
      }),
    )
  })

  test('the compiler and the presentation helper keep the same source field for every property', () => {
    assert(
      property(form, (input) => {
        const {schema} = toJsonSchema(input)
        const kept = presentationFields(input, schema)
        expect(kept.map((f) => f.name)).toStrictEqual(Object.keys(schema.properties ?? {}))
        for (const {name: fieldName, type} of kept) {
          const first = (input.fields ?? []).find((f) => f?.name?.trim() === fieldName && f.type?.trim() === type)
          expect(first).toBeDefined()
          const earlier = (input.fields ?? [])
            .slice(0, input.fields?.indexOf(first as FormToolkitField))
            .filter((f) => f?.name?.trim() === fieldName)
          for (const dropped of earlier) {
            expect(toJsonSchema({fields: [dropped], title: 't'}).schema.properties).toStrictEqual({})
          }
        }
      }),
    )
  })
})
