// @vitest-environment jsdom
import {Form} from '@rjsf/shadcn'
import validator from '@rjsf/validator-ajv8'
import {cleanup, fireEvent, render} from '@testing-library/react'
import {contactForm} from 'sanity-form-fixtures'
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
})
