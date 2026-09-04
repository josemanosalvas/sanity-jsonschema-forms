// @vitest-environment jsdom
import {Form} from '@rjsf/shadcn'
import validator from '@rjsf/validator-ajv8'
import {cleanup, fireEvent, render} from '@testing-library/react'
import {contactForm, fieldTypeEdgesForm, fieldTypesForm, messyForm, namesakeForm} from 'sanity-form-fixtures'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {toJsonSchema} from '../src'
import {toRjsfProps} from '../src/rjsf'
import {query} from './dom'

// Radix (used by @rjsf/shadcn) needs a ResizeObserver; jsdom has none.
const noop = () => {}
class ResizeObserverStub {
  observe = noop
  unobserve = noop
  disconnect = noop
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

describe('RJSF presentation adapter', () => {
  afterEach(cleanup)

  const compiled = toJsonSchema(contactForm)
  const {schema, uiSchema, formProps, transformErrors} = toRjsfProps(contactForm, compiled)

  test('passes the schema through untouched', () => {
    expect(schema).toBe(compiled.schema)
  })

  test('emits only presentation in the uiSchema', () => {
    expect(uiSchema).toStrictEqual({
      contactMethod: {'ui:optionValueFormat': 'realValue', 'ui:widget': 'radio'},
      email: {'ui:placeholder': 'you@example.com', 'ui:widget': 'email'},
      fullName: {'ui:placeholder': 'Ada Lovelace'},
      interests: {'ui:widget': 'checkboxes'},
      message: {'ui:placeholder': 'How can we help?', 'ui:widget': 'textarea'},
      partySize: {'ui:placeholder': 'How many?'},
      'ui:order': ['fullName', 'email', 'partySize', 'topic', 'contactMethod', 'interests', 'message', 'consent'],
      'ui:submitButtonOptions': {submitText: 'Send message'},
    })
    expect(formProps).toStrictEqual({experimental_defaultFormStateBehavior: {constAsDefaults: 'never'}})
  })

  test('takes presentation from the field the compiler kept, not a dropped namesake', () => {
    const messy = toRjsfProps(messyForm, toJsonSchema(messyForm)).uiSchema
    expect(messy.empty).toStrictEqual({'ui:placeholder': 'Write instead', 'ui:widget': 'textarea'})
  })

  test('takes radio/select and placeholder from the kept namesake even when both are choice fields', () => {
    const namesakes = toRjsfProps(namesakeForm, toJsonSchema(namesakeForm)).uiSchema
    expect(namesakes).toStrictEqual({
      radioThenRadio: {'ui:optionValueFormat': 'realValue', 'ui:widget': 'radio'},
      radioThenSelect: {'ui:placeholder': 'Pick one'},
      selectThenRadio: {'ui:optionValueFormat': 'realValue', 'ui:widget': 'radio'},
      selectThenSelect: {'ui:placeholder': 'Pick one'},
      'ui:order': ['selectThenRadio', 'radioThenSelect', 'selectThenSelect', 'radioThenRadio'],
    })
  })

  test('renders labels from oneOf titles without pre-selecting anything', () => {
    const changes: unknown[] = []
    const {container} = render(
      <Form
        {...formProps}
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        transformErrors={transformErrors}
        onChange={(e) => changes.push(e.formData)}
      />,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('Product updates')
    expect(text).toContain('Phone')
    // The select shows no choice; the radio shows its authored default.
    expect(text).not.toContain('Sales')
    expect(container.querySelector<HTMLElement>('#root_contactMethod-0')?.dataset.state).toBe('checked')
    expect(container.querySelector<HTMLElement>('#root_consent')?.dataset.state).toBe('unchecked')
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(4)
    expect(container.querySelector('button[type="submit"]')?.textContent).toBe('Send message')
  })

  test('shows the authored messages after an invalid submit', () => {
    const {container} = render(
      <Form
        {...formProps}
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        transformErrors={transformErrors}
        noHtml5Validate
        showErrorList={false}
      />,
    )
    const set = (id: string, value: string) => fireEvent.change(query(container, `#${id}`), {target: {value}})
    set('root_fullName', 'A1')
    set('root_partySize', '0')
    set('root_message', 'x'.repeat(501))
    fireEvent.submit(query(container, 'form'))
    const text = container.textContent ?? ''
    expect(text).toContain('Names cannot contain digits.')
    expect(text).toContain('At least one person.')
    expect(text).toContain('Keep it under 500 characters.')
    expect(text).toContain("must have required property 'I agree to be contacted'")
  })

  describe('field types added in 0.2', () => {
    const compiledTypes = toJsonSchema(fieldTypesForm)
    const props = toRjsfProps(fieldTypesForm, compiledTypes)

    test('names a widget or a native input type for every field', () => {
      expect(props.uiSchema).toStrictEqual({
        brandColor: {'ui:widget': 'color'},
        campaign: {'ui:widget': 'hidden'},
        phone: {'ui:options': {inputType: 'tel'}, 'ui:placeholder': '+1 555 0100'},
        pickup: {'ui:options': {inputType: 'datetime-local'}},
        preferredTime: {'ui:options': {inputType: 'time'}},
        satisfaction: {'ui:widget': 'range'},
        startDate: {'ui:widget': 'date'},
        'ui:order': ['website', 'phone', 'campaign', 'brandColor', 'startDate', 'pickup', 'preferredTime', 'satisfaction'],
        'ui:submitButtonOptions': {submitText: 'Save'},
        website: {'ui:placeholder': 'https://', 'ui:widget': 'uri'},
      })
    })

    test('renders native inputs holding the defaults as the schema wrote them', () => {
      const submissions: unknown[] = []
      const {container} = render(
        <Form
          {...props.formProps}
          schema={props.schema}
          uiSchema={props.uiSchema}
          validator={validator}
          transformErrors={props.transformErrors}
          onSubmit={({formData}) => submissions.push(formData)}
          noHtml5Validate
        />,
      )
      const input = (id: string) => query(container, `#${id}`) as HTMLInputElement
      expect([input('root_website').type, input('root_website').value]).toStrictEqual(['url', 'https://example.com'])
      expect(input('root_phone').type).toBe('tel')
      expect([input('root_campaign').type, input('root_campaign').value]).toStrictEqual(['hidden', 'spring-2026'])
      expect(container.textContent).not.toContain('campaign')
      expect([input('root_brandColor').type, input('root_brandColor').value]).toStrictEqual(['color', '#ff8800'])
      expect([input('root_startDate').type, input('root_startDate').value]).toStrictEqual(['date', '2026-09-04'])
      expect([input('root_pickup').type, input('root_pickup').value]).toStrictEqual(['datetime-local', '2026-09-04T18:30'])
      expect([input('root_preferredTime').type, input('root_preferredTime').value]).toStrictEqual(['time', '18:30'])
      const slider = query(container, '[role="slider"]')
      expect([
        slider.getAttribute('aria-valuemin'),
        slider.getAttribute('aria-valuemax'),
        slider.getAttribute('aria-valuenow'),
      ]).toStrictEqual(['0', '10', '6'])
      fireEvent.submit(query(container, 'form'))
      expect(submissions).toStrictEqual([
        {
          brandColor: '#ff8800',
          campaign: 'spring-2026',
          pickup: '2026-09-04T18:30',
          preferredTime: '18:30',
          satisfaction: 6,
          startDate: '2026-09-04',
          website: 'https://example.com',
        },
      ])
    })

    test('hands a typed local value through untouched and shows the authored messages', () => {
      const {container} = render(
        <Form
          {...props.formProps}
          schema={props.schema}
          uiSchema={props.uiSchema}
          validator={validator}
          transformErrors={props.transformErrors}
          noHtml5Validate
          showErrorList={false}
        />,
      )
      const set = (id: string, value: string) => fireEvent.change(query(container, `#${id}`), {target: {value}})
      set('root_website', 'http://example.com')
      set('root_phone', 'call me')
      set('root_pickup', '2026-12-24T09:15')
      fireEvent.submit(query(container, 'form'))
      const text = container.textContent ?? ''
      expect(text).toContain('Only https links.')
      expect(text).toContain('Digits, spaces and a leading + only.')
      // No UTC conversion: RJSF's DateTimeWidget would have made this an ISO string with a Z.
      expect((query(container, '#root_pickup') as HTMLInputElement).value).toBe('2026-12-24T09:15')
    })

    test('a range without a default renders a slider with no value and submits nothing for it', () => {
      const edges = toJsonSchema(fieldTypeEdgesForm)
      const edgeProps = toRjsfProps(fieldTypeEdgesForm, edges)
      const submissions: Record<string, unknown>[] = []
      const {container} = render(
        <Form
          {...edgeProps.formProps}
          schema={edgeProps.schema}
          uiSchema={edgeProps.uiSchema}
          validator={validator}
          onSubmit={({formData}) => submissions.push(formData as Record<string, unknown>)}
          noHtml5Validate
          noValidate
        />,
      )
      const slider = query(container, '#root_offsetStep [role="slider"]')
      expect([slider.getAttribute('aria-valuemin'), slider.getAttribute('aria-valuemax')]).toStrictEqual(['1', '9'])
      // No default, no value: the thumb sits at the minimum without claiming it.
      expect(slider.getAttribute('aria-valuenow')).toBeNull()
      fireEvent.submit(query(container, 'form'))
      expect(submissions).toHaveLength(1)
      expect(submissions[0]?.offsetStep).toBeUndefined()
    })
  })
})
