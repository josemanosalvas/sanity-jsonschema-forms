import {Model} from 'survey-core'
import {describe, expect, test} from 'vitest'

/**
 * Not an adapter test. These pin the SurveyJS semantics that have no JSON
 * Schema counterpart, headless, so the adapter's documented limits rest on
 * observed behaviour rather than on SurveyJS's documentation.
 */
describe('SurveyJS capabilities beyond JSON Schema (probe)', () => {
  test('pages: a survey is a sequence of pages with navigation state', () => {
    const m = new Model({
      pages: [
        {name: 'p1', elements: [{type: 'text', name: 'a'}]},
        {name: 'p2', elements: [{type: 'text', name: 'b'}]},
      ],
    })
    expect(m.pageCount).toBe(2)
    expect(m.currentPageNo).toBe(0)
    expect(m.nextPage()).toBe(true)
    expect(m.currentPageNo).toBe(1)
  })

  test('visibleIf: a question hides itself and drops out of validation', () => {
    const m = new Model({
      elements: [
        {type: 'boolean', name: 'other'},
        {type: 'text', name: 'detail', isRequired: true, visibleIf: '{other} = true'},
      ],
    })
    m.data = {other: false}
    expect(m.getQuestionByName('detail').isVisible).toBe(false)
    expect(m.validate()).toBe(true)
    m.setValue('other', true)
    expect(m.getQuestionByName('detail').isVisible).toBe(true)
    expect(m.validate()).toBe(false)
  })

  test('enableIf and requiredIf: enablement and required-ness are expressions too', () => {
    const m = new Model({
      elements: [
        {type: 'text', name: 'a'},
        {type: 'text', name: 'b', enableIf: '{a} notempty', requiredIf: '{a} = "x"'},
      ],
    })
    m.data = {}
    expect(m.getQuestionByName('b').isReadOnly).toBe(true)
    m.setValue('a', 'x')
    expect(m.getQuestionByName('b').isReadOnly).toBe(false)
    expect(m.getQuestionByName('b').isRequired).toBe(true)
  })

  test('calculatedValues: derived values exist in the data model, not in any question', () => {
    const m = new Model({
      calculatedValues: [{name: 'total', expression: '{qty} * {price}'}],
      elements: [
        {type: 'text', name: 'qty', inputType: 'number'},
        {type: 'text', name: 'price', inputType: 'number'},
      ],
    })
    m.data = {qty: 3, price: 4}
    expect(m.getVariable('total')).toBe(12)
  })

  test('expression validators: cross-field rules in a runtime expression language', () => {
    const m = new Model({
      elements: [
        {type: 'text', name: 'start', inputType: 'number'},
        {
          type: 'text',
          name: 'end',
          inputType: 'number',
          validators: [{type: 'expression', expression: '{end} > {start}', text: 'End must follow start.'}],
        },
      ],
    })
    m.data = {start: 5, end: 3}
    expect(m.validate()).toBe(false)
    expect(m.getQuestionByName('end').errors[0]?.getText()).toBe('End must follow start.')
  })

  test('paneldynamic: repeating groups with add/remove and per-panel validation', () => {
    const m = new Model({
      elements: [
        {type: 'paneldynamic', name: 'people', minPanelCount: 1, templateElements: [{type: 'text', name: 'name', isRequired: true}]},
      ],
    })
    m.data = {people: [{name: ''}]}
    expect(m.validate()).toBe(false)
    m.data = {people: [{name: 'Ada'}, {name: 'Grace'}]}
    expect(m.validate()).toBe(true)
  })

  test('branching: page navigation driven by answers', () => {
    const m = new Model({
      pages: [
        {name: 'p1', elements: [{type: 'boolean', name: 'skip'}]},
        {name: 'p2', visibleIf: '{skip} <> true', elements: [{type: 'text', name: 'x'}]},
        {name: 'p3', elements: [{type: 'text', name: 'y'}]},
      ],
    })
    m.data = {skip: true}
    expect(m.visiblePageCount).toBe(2)
    m.nextPage()
    expect(m.currentPage.name).toBe('p3')
  })
})
