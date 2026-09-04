import {Model} from 'survey-core'
import {describe, expect, test} from 'vitest'

/** Pins the SurveyJS behaviour docs/adapters/surveyjs.md describes as diverging from the schema. */
describe('SurveyJS capabilities beyond JSON Schema (probe)', () => {
  test('pages: a survey is a sequence of pages with navigation state', () => {
    const m = new Model({
      pages: [
        {elements: [{name: 'a', type: 'text'}], name: 'p1'},
        {elements: [{name: 'b', type: 'text'}], name: 'p2'},
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
        {name: 'other', type: 'boolean'},
        {isRequired: true, name: 'detail', type: 'text', visibleIf: '{other} = true'},
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
        {name: 'a', type: 'text'},
        {enableIf: '{a} notempty', name: 'b', requiredIf: '{a} = "x"', type: 'text'},
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
      calculatedValues: [{expression: '{qty} * {price}', name: 'total'}],
      elements: [
        {inputType: 'number', name: 'qty', type: 'text'},
        {inputType: 'number', name: 'price', type: 'text'},
      ],
    })
    m.data = {price: 4, qty: 3}
    expect(m.getVariable('total')).toBe(12)
  })

  test('expression validators: cross-field rules in a runtime expression language', () => {
    const m = new Model({
      elements: [
        {inputType: 'number', name: 'start', type: 'text'},
        {
          inputType: 'number',
          name: 'end',
          type: 'text',
          validators: [{expression: '{end} > {start}', text: 'End must follow start.', type: 'expression'}],
        },
      ],
    })
    m.data = {end: 3, start: 5}
    expect(m.validate()).toBe(false)
    expect(m.getQuestionByName('end').errors[0]?.getText()).toBe('End must follow start.')
  })

  test('paneldynamic: repeating groups with add/remove and per-panel validation', () => {
    const m = new Model({
      elements: [
        {minPanelCount: 1, name: 'people', templateElements: [{isRequired: true, name: 'name', type: 'text'}], type: 'paneldynamic'},
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
        {elements: [{name: 'skip', type: 'boolean'}], name: 'p1'},
        {elements: [{name: 'x', type: 'text'}], name: 'p2', visibleIf: '{skip} <> true'},
        {elements: [{name: 'y', type: 'text'}], name: 'p3'},
      ],
    })
    m.data = {skip: true}
    expect(m.visiblePageCount).toBe(2)
    m.nextPage()
    expect(m.currentPage.name).toBe('p3')
  })
})
