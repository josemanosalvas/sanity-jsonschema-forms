// @vitest-environment jsdom
import {and, rankWith, schemaMatches, uiTypeIs} from '@jsonforms/core'
import type {ControlProps, JsonSchema, RankedTester} from '@jsonforms/core'
import {JsonForms, withJsonFormsControlProps} from '@jsonforms/react'
import {vanillaCells, vanillaRenderers} from '@jsonforms/vanilla-renderers'
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react'
import {contactForm} from 'sanity-form-fixtures'
import {afterEach, describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'
import {toJsonFormsProps} from '../src/jsonforms'
import {query} from './dom'

/**
 * Vanilla renderers have no control for an array of enum values, so the
 * checkbox group needs this. Test-local; the example app carries a copy.
 */
const CheckboxGroup = withJsonFormsControlProps(({data, handleChange, path, label, schema, errors}: ControlProps) => {
  const items = schema.items as JsonSchema
  const options = (items.oneOf ?? []).map((o) => ({label: (o as JsonSchema).title ?? '', value: String((o as JsonSchema).const)}))
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
const renderers = [...vanillaRenderers, {renderer: CheckboxGroup, tester: checkboxGroupTester}]

describe('JSON Forms presentation adapter', () => {
  afterEach(cleanup)

  const compiled = toJsonSchema(contactForm)
  const {schema, uischema, translate, submitText, initialData} = toJsonFormsProps(contactForm, compiled)

  test('passes the schema through untouched and emits only controls', () => {
    expect(schema).toBe(compiled.schema)
    expect(uischema).toStrictEqual({
      elements: [
        {i18n: 'fullName', options: {placeholder: 'Ada Lovelace'}, scope: '#/properties/fullName', type: 'Control'},
        {i18n: 'email', options: {placeholder: 'you@example.com'}, scope: '#/properties/email', type: 'Control'},
        {i18n: 'partySize', options: {placeholder: 'How many?'}, scope: '#/properties/partySize', type: 'Control'},
        {i18n: 'topic', scope: '#/properties/topic', type: 'Control'},
        {i18n: 'contactMethod', options: {format: 'radio'}, scope: '#/properties/contactMethod', type: 'Control'},
        {i18n: 'interests', scope: '#/properties/interests', type: 'Control'},
        {i18n: 'message', options: {multi: true, placeholder: 'How can we help?'}, scope: '#/properties/message', type: 'Control'},
        {i18n: 'consent', scope: '#/properties/consent', type: 'Control'},
      ],
      type: 'VerticalLayout',
    })
    expect(submitText).toBe('Send message')
    expect(initialData).toStrictEqual({contactMethod: 'email', partySize: 2})
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
    expect([...select.options].map((o) => o.label)).toStrictEqual(['None', 'Sales', 'Support', 'Press'])
    expect(select.value).toBe('')
    const radios = [...container.querySelectorAll('input[type="radio"]')] as HTMLInputElement[]
    expect(radios.map((r) => [r.value, r.checked])).toStrictEqual([
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
        data={{consent: false, fullName: 'A1', partySize: 0}}
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
    fireEvent.change(query(container, 'input[placeholder="Ada Lovelace"]'), {target: {value: 'Ada'}})
    // JSON Forms reports changes on a short debounce.
    await waitFor(() => expect(latest).toMatchObject({fullName: 'Ada'}))
  })
})
