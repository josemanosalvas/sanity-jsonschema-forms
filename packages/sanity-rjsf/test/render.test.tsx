// @vitest-environment jsdom
import Form from '@rjsf/shadcn'
import validator from '@rjsf/validator-ajv8'
import {cleanup, render} from '@testing-library/react'
import {afterEach, describe, expect, test} from 'vitest'

import {toRjsf} from '../src'
import {contactForm} from './fixtures/contact'

afterEach(cleanup)

// Radix primitives (used by @rjsf/shadcn) need browser APIs jsdom lacks.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

/**
 * Proves the uiSchema drives the right @rjsf/shadcn widgets. No CSS is loaded
 * here, so this is about which elements render, not how they look.
 */
describe('renders with @rjsf/shadcn', () => {
  const {schema, uiSchema, transformErrors} = toRjsf(contactForm)

  test('picks the expected widget for every field', () => {
    const {container} = render(
      <Form schema={schema} uiSchema={uiSchema} validator={validator} transformErrors={transformErrors} />,
    )
    // RJSF names inputs `root_<field>`; Radix widgets render buttons with ARIA roles.
    const byId = (id: string) => container.querySelector(`#${id}`)
    const fullName = byId('root_fullName') as HTMLInputElement
    expect(fullName).toBeInstanceOf(HTMLInputElement)
    expect(fullName.placeholder).toBe('Ada Lovelace')
    expect((byId('root_email') as HTMLInputElement).type).toBe('email')
    expect((byId('root_partySize') as HTMLInputElement).type).toBe('number')
    expect((byId('root_partySize') as HTMLInputElement).value).toBe('2')
    expect(byId('root_message')).toBeInstanceOf(HTMLTextAreaElement)
    expect(container.querySelector('label[for="root_topic"]')?.textContent).toBe('Topic*')
    expect(container.querySelectorAll('[role="radio"]')).toHaveLength(2)
    expect(byId('root_contactMethod-0')?.getAttribute('data-state')).toBe('checked')
    // Checkbox group: one per choice, plus the lone consent checkbox.
    expect(container.querySelectorAll('[role="checkbox"]')).toHaveLength(4)
    expect(byId('root_consent')?.getAttribute('role')).toBe('checkbox')
    expect(container.querySelector('button[type="submit"]')?.textContent).toBe('Send message')
  })

  test('renders labels in source order with required markers', () => {
    const {container} = render(<Form schema={schema} uiSchema={uiSchema} validator={validator} />)
    const text = container.textContent ?? ''
    const positions = ['Full name', 'Email', 'Party size', 'Topic', 'Preferred contact method', 'Interests', 'Message', 'I agree to be contacted'].map(
      (label) => text.indexOf(label),
    )
    expect(positions.every((p) => p >= 0)).toBe(true)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    expect(text).toContain('Full name*')
  })
})
