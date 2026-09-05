// @vitest-environment jsdom
import type {ControlElement, VerticalLayout} from '@jsonforms/core'
import {JsonForms} from '@jsonforms/react'
import {vanillaCells, vanillaRenderers} from '@jsonforms/vanilla-renderers'
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react'
import {contactForm, fieldTypesForm, messyForm, namesakeForm} from 'sanity-form-fixtures'
import {afterEach, describe, expect, test} from 'vitest'

import {CheckboxGroupControl, checkboxGroupTester} from '../../../examples/compare/src/checkbox-group-control'
import {toJsonSchema} from '../src'
import {toJsonFormsProps} from '../src/jsonforms'
import {query} from './dom'

const renderers = [...vanillaRenderers, {renderer: CheckboxGroupControl, tester: checkboxGroupTester}]

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

  test('takes presentation from the field the compiler kept, not a dropped namesake', () => {
    const messy = toJsonFormsProps(messyForm, toJsonSchema(messyForm)).uischema as VerticalLayout
    expect(messy.elements.find((e) => (e as ControlElement).scope === '#/properties/empty')).toStrictEqual({
      i18n: 'empty',
      options: {multi: true, placeholder: 'Write instead'},
      scope: '#/properties/empty',
      type: 'Control',
    })
  })

  test('takes radio/select and placeholder from the kept namesake even when both are choice fields', () => {
    const namesakes = toJsonFormsProps(namesakeForm, toJsonSchema(namesakeForm)).uischema as VerticalLayout
    expect(namesakes.elements).toStrictEqual([
      {i18n: 'selectThenRadio', options: {format: 'radio'}, scope: '#/properties/selectThenRadio', type: 'Control'},
      {i18n: 'radioThenSelect', options: {placeholder: 'Pick one'}, scope: '#/properties/radioThenSelect', type: 'Control'},
      {i18n: 'selectThenSelect', options: {placeholder: 'Pick one'}, scope: '#/properties/selectThenSelect', type: 'Control'},
      {i18n: 'radioThenRadio', options: {format: 'radio'}, scope: '#/properties/radioThenRadio', type: 'Control'},
    ])
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

  describe('field types added in 0.2', () => {
    const compiledTypes = toJsonSchema(fieldTypesForm)
    const props = toJsonFormsProps(fieldTypesForm, compiledTypes)

    test('lists a control per visible field; the hidden value rides in initialData', () => {
      expect(props.uischema).toStrictEqual({
        elements: [
          {i18n: 'website', options: {placeholder: 'https://'}, scope: '#/properties/website', type: 'Control'},
          {i18n: 'phone', options: {placeholder: '+1 555 0100'}, scope: '#/properties/phone', type: 'Control'},
          {i18n: 'brandColor', scope: '#/properties/brandColor', type: 'Control'},
          {i18n: 'startDate', scope: '#/properties/startDate', type: 'Control'},
          {i18n: 'pickup', scope: '#/properties/pickup', type: 'Control'},
          {i18n: 'preferredTime', options: {format: 'time'}, scope: '#/properties/preferredTime', type: 'Control'},
          {i18n: 'satisfaction', options: {slider: true}, scope: '#/properties/satisfaction', type: 'Control'},
        ],
        type: 'VerticalLayout',
      })
      expect(props.initialData).toStrictEqual({
        brandColor: '#ff8800',
        campaign: 'spring-2026',
        pickup: '2026-09-04T18:30',
        preferredTime: '18:30',
        satisfaction: 6,
        startDate: '2026-09-04',
        website: 'https://example.com',
      })
    })

    test('renders native date, time and range cells; url, tel, colour and datetime-local fall back to text', () => {
      const {container} = render(
        <JsonForms
          schema={props.schema}
          uischema={props.uischema}
          data={props.initialData}
          renderers={renderers}
          cells={vanillaCells}
          i18n={{translate: props.translate}}
          validationMode="ValidateAndHide"
        />,
      )
      const types = [...container.querySelectorAll('input')].map((input) => [input.type, input.value])
      expect(types).toStrictEqual([
        ['text', 'https://example.com'],
        ['text', ''],
        ['text', '#ff8800'],
        ['date', '2026-09-04'],
        ['text', '2026-09-04T18:30'],
        ['time', '18:30'],
        ['range', '6'],
      ])
      expect(container.textContent).not.toContain('campaign')
    })

    test('a hidden field seeded from initialData validates with the rest', async () => {
      let latest: {data: unknown; errors?: unknown[]} | undefined
      render(
        <JsonForms
          schema={props.schema}
          uischema={props.uischema}
          data={{...props.initialData, campaign: 42, preferredTime: '25:30'}}
          renderers={renderers}
          cells={vanillaCells}
          i18n={{translate: props.translate}}
          onChange={(event) => (latest = event)}
        />,
      )
      await waitFor(() => expect(latest).toBeDefined())
      const paths = (latest?.errors ?? []).map((e) => (e as {instancePath: string}).instancePath)
      expect(paths.toSorted()).toStrictEqual(['/campaign', '/preferredTime'])
    })
  })
})
