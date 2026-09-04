import {contactForm, contactSubmissions, messyForm} from 'sanity-form-fixtures'
import {Model} from 'survey-core'
import {describe, expect, test} from 'vitest'

import {toJsonSchema} from '../src'
import {toSurveyJsProps} from '../src/surveyjs'

/** Headless SurveyJS: load the JSON, assign the answers, ask for a verdict. */
const verdictOf = (surveyJson: object, data: Record<string, unknown>) => {
  const model = new Model(surveyJson)
  model.data = data
  const ok = model.validate(true, false)
  const errors = model.getAllQuestions().flatMap((q) => q.errors.map((e) => `${q.name}: ${e.getText()}`))
  return {ok, errors}
}

describe('SurveyJS presentation adapter', () => {
  const compiled = toJsonSchema(contactForm)
  const {surveyJson, fromSchema, fromForm} = toSurveyJsProps(contactForm, compiled)

  test('builds the survey JSON from the schema, reaching for the form only for presentation', () => {
    expect(surveyJson).toStrictEqual({
      title: 'Contact us',
      showQuestionNumbers: 'off',
      completeText: 'Send message',
      elements: [
        {
          type: 'text',
          name: 'fullName',
          title: 'Full name',
          isRequired: true,
          inputType: 'text',
          placeholder: 'Ada Lovelace',
          validators: [
            {type: 'text', minLength: 2, text: 'Please enter at least two characters.'},
            {type: 'text', maxLength: 80, text: 'Names are limited to 80 characters.'},
            {type: 'regex', regex: '^[^0-9]*$', text: 'Names cannot contain digits.'},
          ],
        },
        {
          type: 'text',
          name: 'email',
          title: 'Email',
          isRequired: true,
          inputType: 'email',
          placeholder: 'you@example.com',
          validators: [{type: 'email'}],
        },
        {
          type: 'text',
          name: 'partySize',
          title: 'Party size',
          defaultValue: 2,
          inputType: 'number',
          placeholder: 'How many?',
          validators: [
            {type: 'numeric', minValue: 1, text: 'At least one person.'},
            {type: 'numeric', maxValue: 12, text: 'We can seat 12 at most.'},
          ],
        },
        {
          type: 'dropdown',
          name: 'topic',
          title: 'Topic',
          isRequired: true,
          choices: [
            {value: 'sales', text: 'Sales'},
            {value: 'support', text: 'Support'},
            {value: 'press', text: 'Press'},
          ],
        },
        {
          type: 'radiogroup',
          name: 'contactMethod',
          title: 'Preferred contact method',
          defaultValue: 'email',
          choices: [
            {value: 'email', text: 'Email'},
            {value: 'phone', text: 'Phone'},
          ],
        },
        {
          type: 'checkbox',
          name: 'interests',
          title: 'Interests',
          choices: [
            {value: 'updates', text: 'Product updates'},
            {value: 'events', text: 'Events'},
            {value: 'newsletter', text: 'Newsletter'},
          ],
          validators: [{type: 'answercount', maxCount: 2, text: 'Pick two at most.'}],
        },
        {
          type: 'comment',
          name: 'message',
          title: 'Message',
          isRequired: true,
          placeholder: 'How can we help?',
          validators: [{type: 'text', maxLength: 500, text: 'Keep it under 500 characters.'}],
        },
        {
          type: 'boolean',
          name: 'consent',
          title: 'I agree to be contacted',
          isRequired: true,
          renderAs: 'checkbox',
          validators: [{type: 'expression', expression: '{consent} = true', text: 'This box must be checked.'}],
        },
      ],
    })
    expect(fromForm.toSorted()).toStrictEqual(['completeText', 'placeholder', 'type'])
    expect(fromSchema).toContain('validators')
  })

  test('the messy form compiles to a question per surviving property', () => {
    const {surveyJson: messy} = toSurveyJsProps(messyForm, toJsonSchema(messyForm))
    expect(messy.elements.map((q) => q.name)).toStrictEqual([
      'dup',
      'unlabeled',
      'badRules',
      'badDefault',
      'dupChoices',
      'radioPh',
      'groupDefault',
      'boolRules',
    ])
    expect(messy.elements.at(-1)).toMatchObject({
      type: 'boolean',
      isRequired: true,
      validators: [{type: 'expression', expression: '{boolRules} = true'}],
    })
  })

  /**
   * Accept/reject parity with AJV. Two submissions diverge by design:
   * SurveyJS validates what its own UI can produce, not an
   * arbitrary payload. A duplicate in a checkbox answer and an off-list
   * dropdown value cannot come from its widgets, so it does not reject them.
   */
  const surveyJsDivergence: Partial<Record<keyof typeof contactSubmissions, 'accept'>> = {
    duplicateInterests: 'accept',
  }

  test.each(Object.entries(contactSubmissions))('%s: verdict', (key, submission) => {
    const expected = surveyJsDivergence[key as keyof typeof contactSubmissions] ?? submission.verdict
    expect(verdictOf(surveyJson, submission.data).ok).toBe(expected === 'accept')
  })

  test('every authored message surfaces through the SurveyJS validators', () => {
    const {errors} = verdictOf(surveyJson, contactSubmissions.everyRuleFails.data)
    expect(errors).toStrictEqual(
      expect.arrayContaining([
        'fullName: Names cannot contain digits.',
        'partySize: At least one person.',
        'interests: Pick two at most.',
        'message: Keep it under 500 characters.',
        'consent: This box must be checked.',
      ]),
    )
    expect(errors.find((e) => e.startsWith('email:'))).toBeDefined()
  })

  test('an off-list dropdown value is where SurveyJS and AJV part ways', () => {
    const {ok, errors} = verdictOf(surveyJson, {...contactSubmissions.valid.data, topic: 'other'})
    // Documented divergence: SurveyJS keeps or clears the value; it does not error on it.
    expect(errors.filter((e) => e.startsWith('topic:'))).toStrictEqual([])
    expect(ok).toBeTypeOf('boolean')
  })

  test('an empty submission fails on required questions', () => {
    const {ok, errors} = verdictOf(surveyJson, {})
    expect(ok).toBe(false)
    expect(errors.map((e) => e.split(':')[0])).toStrictEqual(['fullName', 'email', 'topic', 'message', 'consent'])
  })
})
