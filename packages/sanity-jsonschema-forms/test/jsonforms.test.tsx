// @vitest-environment jsdom
import {and, type ControlProps, type JsonSchema, type RankedTester, rankWith, schemaMatches, uiTypeIs} from '@jsonforms/core'
import {JsonForms, withJsonFormsControlProps} from '@jsonforms/react'
import {vanillaCells, vanillaRenderers} from '@jsonforms/vanilla-renderers'
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react'
import {contactForm} from 'sanity-form-fixtures'
import {afterEach, describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'
import {toJsonFormsProps} from '../src/jsonforms'

afterEach(cleanup)

/**
 * Vanilla renderers have no control for an array of enum values, so the
 * checkbox group needs this. Test-local; the example app carries a copy.
 */
const CheckboxGroup = withJsonFormsControlProps(({data, handleChange, path, label, schema, errors}: ControlProps) => {
  const items = schema.items as JsonSchema
  const options = (items.oneOf ?? []).map((o) => ({value: String((o as JsonSchema).const), label: (o as JsonSchema).title ?? ''}))
  const selected: string[] = Array.isArray(data) ? data : []
  return (
    <fieldset>
      <legend>{label}</legend>
      {options.map((o) => (
        <label key={o.value}>
          <input
            type="checkbox"
            value={o.value}
            checked={selected.includes(o.value)}
            onChange={(e) => handleChange(path, e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
          />
          {o.label}
        </label>
      ))}
      {errors && <span className="validation">{errors}</span>}
    </fieldset>
  )
})
const checkboxGroupTester: RankedTester = rankWith(
  5,
  and(
    uiTypeIs('Control'),
    schemaMatches(
      (s) => s.type === 'array' && s.uniqueItems === true && typeof s.items === 'object' && Array.isArray((s.items as JsonSchema).oneOf),
    ),
  ),
)
const renderers = [...vanillaRenderers, {tester: checkboxGroupTester, renderer: CheckboxGroup}]

describe('JSON Forms presentation adapter', () => {
  const compiled = toJsonSchema(contactForm)
  const {schema, uischema, translate, submitText, initialData} = toJsonFormsProps(contactForm, compiled)

  test('passes the schema through untouched and emits only controls', () => {
    expect(schema).toBe(compiled.schema)
    expect(uischema).toEqual({
      type: 'VerticalLayout',
      elements: [
        {type: 'Control', scope: '#/properties/fullName', i18n: 'fullName', options: {placeholder: 'Ada Lovelace'}},
        {type: 'Control', scope: '#/properties/email', i18n: 'email', options: {placeholder: 'you@example.com'}},
        {type: 'Control', scope: '#/properties/partySize', i18n: 'partySize', options: {placeholder: 'How many?'}},
        {type: 'Control', scope: '#/properties/topic', i18n: 'topic'},
        {type: 'Control', scope: '#/properties/contactMethod', i18n: 'contactMethod', options: {format: 'radio'}},
        {type: 'Control', scope: '#/properties/interests', i18n: 'interests'},
        {type: 'Control', scope: '#/properties/message', i18n: 'message', options: {multi: true, placeholder: 'How can we help?'}},
        {type: 'Control', scope: '#/properties/consent', i18n: 'consent'},
      ],
    })
    expect(submitText).toBe('Send message')
    expect(initialData).toEqual({partySize: 2, contactMethod: 'email'})
  })

  test('translate answers error keys and passes everything else through', () => {
    expect(translate('fullName.error.pattern', 'ajv text')).toBe('Names cannot contain digits.')
    expect(translate('consent.error.const', 'ajv text')).toBe('This box must be checked.')
    expect(translate('email.error.format', 'ajv text')).toBe('ajv text')
    expect(translate('fullName.label', 'Full name')).toBe('Full name')
  })

  test('renders with vanilla renderers plus one checkbox-group control', () => {
    const {container} = render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={initialData}
        renderers={renderers}
        cells={vanillaCells}
        i18n={{translate}}
        validationMode="ValidateAndHide"
      />,
    )
    expect(container.querySelector('textarea')).not.toBeNull()
    expect(container.querySelector('input[placeholder="Ada Lovelace"]')).not.toBeNull()
    const select = container.querySelector('select') as HTMLSelectElement
    // Vanilla puts the text in the option's `label` attribute; 'None' is its translated empty option.
    expect([...select.options].map((o) => o.label)).toEqual(['None', 'Sales', 'Support', 'Press'])
    expect(select.value).toBe('')
    const radios = [...container.querySelectorAll('input[type="radio"]')] as HTMLInputElement[]
    expect(radios.map((r) => [r.value, r.checked])).toEqual([
      ['email', true],
      ['phone', false],
    ])
    expect(container.querySelectorAll('fieldset input[type="checkbox"]')).toHaveLength(3)
    expect(container.textContent).toContain('Product updates')
  })

  test('shows the authored messages when validation is visible', () => {
    const {container} = render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={{fullName: 'A1', partySize: 0, consent: false}}
        renderers={renderers}
        cells={vanillaCells}
        i18n={{translate}}
        validationMode="ValidateAndShow"
      />,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('Names cannot contain digits.')
    expect(text).toContain('At least one person.')
    expect(text).toContain('This box must be checked.')
  })

  test('typing into a control updates data through the same schema', async () => {
    let latest: unknown
    const {container} = render(
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={{}}
        renderers={renderers}
        cells={vanillaCells}
        i18n={{translate}}
        onChange={({data}) => (latest = data)}
      />,
    )
    fireEvent.change(container.querySelector('input[placeholder="Ada Lovelace"]')!, {target: {value: 'Ada'}})
    // JSON Forms reports changes on a short debounce.
    await waitFor(() => expect(latest).toMatchObject({fullName: 'Ada'}))
  })
})
