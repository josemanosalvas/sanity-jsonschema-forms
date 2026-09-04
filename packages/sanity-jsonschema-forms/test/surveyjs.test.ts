import {contactForm, contactSubmissions, fieldTypesForm, fieldTypesSubmissions, messyForm, namesakeForm} from 'sanity-form-fixtures'
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
  return {errors, ok}
}

describe('SurveyJS presentation adapter', () => {
  const compiled = toJsonSchema(contactForm)
  const {surveyJson, fromSchema, fromForm} = toSurveyJsProps(contactForm, compiled)

  test('builds the survey JSON from the schema, reaching for the form only for presentation', () => {
    expect(surveyJson).toStrictEqual({
      completeText: 'Send message',
      elements: [
        {
          inputType: 'text',
          isRequired: true,
          name: 'fullName',
          placeholder: 'Ada Lovelace',
          title: 'Full name',
          type: 'text',
          validators: [
            {minLength: 2, text: 'Please enter at least two characters.', type: 'text'},
            {maxLength: 80, text: 'Names are limited to 80 characters.', type: 'text'},
            {regex: '^[^0-9]*$', text: 'Names cannot contain digits.', type: 'regex'},
          ],
        },
        {
          inputType: 'email',
          isRequired: true,
          name: 'email',
          placeholder: 'you@example.com',
          title: 'Email',
          type: 'text',
          validators: [{type: 'email'}],
        },
        {
          defaultValue: 2,
          inputType: 'number',
          name: 'partySize',
          placeholder: 'How many?',
          title: 'Party size',
          type: 'text',
          validators: [
            {minValue: 1, text: 'At least one person.', type: 'numeric'},
            {maxValue: 12, text: 'We can seat 12 at most.', type: 'numeric'},
          ],
        },
        {
          choices: [
            {text: 'Sales', value: 'sales'},
            {text: 'Support', value: 'support'},
            {text: 'Press', value: 'press'},
          ],
          isRequired: true,
          name: 'topic',
          title: 'Topic',
          type: 'dropdown',
        },
        {
          choices: [
            {text: 'Email', value: 'email'},
            {text: 'Phone', value: 'phone'},
          ],
          defaultValue: 'email',
          name: 'contactMethod',
          title: 'Preferred contact method',
          type: 'radiogroup',
        },
        {
          choices: [
            {text: 'Product updates', value: 'updates'},
            {text: 'Events', value: 'events'},
            {text: 'Newsletter', value: 'newsletter'},
          ],
          name: 'interests',
          title: 'Interests',
          type: 'checkbox',
          validators: [{maxCount: 2, text: 'Pick two at most.', type: 'answercount'}],
        },
        {
          isRequired: true,
          name: 'message',
          placeholder: 'How can we help?',
          title: 'Message',
          type: 'comment',
          validators: [{maxLength: 500, text: 'Keep it under 500 characters.', type: 'text'}],
        },
        {
          isRequired: true,
          name: 'consent',
          renderAs: 'checkbox',
          title: 'I agree to be contacted',
          type: 'boolean',
          validators: [{expression: '{consent} = true', text: 'This box must be checked.', type: 'expression'}],
        },
      ],
      showQuestionNumbers: 'off',
      title: 'Contact us',
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
      'empty',
      'dupChoices',
      'radioPh',
      'groupDefault',
      'boolRules',
    ])
    expect(messy.elements.find((q) => q.name === 'empty')).toStrictEqual({
      name: 'empty',
      placeholder: 'Write instead',
      title: 'Empty again',
      type: 'comment',
    })
    expect(messy.elements.at(-1)).toMatchObject({
      isRequired: true,
      type: 'boolean',
      validators: [{expression: '{boolRules} = true', type: 'expression'}],
    })
  })

  test('takes radiogroup/dropdown and placeholder from the kept namesake even when both are choice fields', () => {
    const {surveyJson: namesakes, fromForm: namesakesFromForm} = toSurveyJsProps(namesakeForm, toJsonSchema(namesakeForm))
    expect(namesakes.elements).toStrictEqual([
      {choices: [{text: 'A', value: 'a'}], name: 'selectThenRadio', title: 'Kept radio', type: 'radiogroup'},
      {choices: [{text: 'B', value: 'b'}], name: 'radioThenSelect', placeholder: 'Pick one', title: 'Kept select', type: 'dropdown'},
      {choices: [{text: 'C', value: 'c'}], name: 'selectThenSelect', placeholder: 'Pick one', title: 'Kept select', type: 'dropdown'},
      {choices: [{text: 'D', value: 'd'}], name: 'radioThenRadio', title: 'Kept radio', type: 'radiogroup'},
    ])
    expect(namesakesFromForm).toStrictEqual(['type', 'placeholder'])
  })

  /**
   * Verdict parity with AJV, except where SurveyJS validates only what its
   * widgets can produce: a duplicate checkbox value and an off-list dropdown
   * value pass.
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
    // SurveyJS keeps or clears the value rather than erroring; see docs/adapters/surveyjs.md.
    expect(errors.filter((e) => e.startsWith('topic:'))).toStrictEqual([])
    expect(ok).toBeTypeOf('boolean')
  })

  test('an empty submission fails on required questions', () => {
    const {ok, errors} = verdictOf(surveyJson, {})
    expect(ok).toBe(false)
    expect(errors.map((e) => e.split(':')[0])).toStrictEqual(['fullName', 'email', 'topic', 'message', 'consent'])
  })

  describe('field types added in 0.2', () => {
    const compiledTypes = toJsonSchema(fieldTypesForm)
    const props = toSurveyJsProps(fieldTypesForm, compiledTypes)

    test('maps every field to a text question with the native input type', () => {
      expect(props.surveyJson).toStrictEqual({
        clearInvisibleValues: 'none',
        completeText: 'Save',
        elements: [
          {
            defaultValue: 'https://example.com',
            inputType: 'url',
            isRequired: true,
            name: 'website',
            placeholder: 'https://',
            title: 'Website',
            type: 'text',
            validators: [{regex: '^https://', text: 'Only https links.', type: 'regex'}],
          },
          {
            inputType: 'tel',
            name: 'phone',
            placeholder: '+1 555 0100',
            title: 'Phone',
            type: 'text',
            validators: [{regex: '^\\+?[0-9 ]+$', text: 'Digits, spaces and a leading + only.', type: 'regex'}],
          },
          {defaultValue: 'spring-2026', name: 'campaign', title: 'campaign', type: 'text', visible: false},
          {
            defaultValue: '#ff8800',
            inputType: 'color',
            name: 'brandColor',
            title: 'Brand colour',
            type: 'text',
            validators: [{regex: '^#[0-9A-Fa-f]{6}$', type: 'regex'}],
          },
          {defaultValue: '2026-09-04', inputType: 'date', isRequired: true, name: 'startDate', title: 'Start date', type: 'text'},
          {
            defaultValue: '2026-09-04T18:30',
            inputType: 'datetime-local',
            name: 'pickup',
            title: 'Pickup',
            type: 'text',
            validators: [
              {
                regex: compiledTypes.schema.properties?.pickup && (compiledTypes.schema.properties.pickup as {pattern: string}).pattern,
                type: 'regex',
              },
            ],
          },
          {
            defaultValue: '18:30',
            inputType: 'time',
            name: 'preferredTime',
            title: 'Preferred time',
            type: 'text',
            validators: [{regex: '^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d{1,3})?)?$', type: 'regex'}],
          },
          {
            defaultValue: 6,
            inputType: 'range',
            max: 10,
            min: 0,
            name: 'satisfaction',
            step: 2,
            title: 'Satisfaction',
            type: 'text',
            validators: [
              {minValue: 0, text: 'At least 0.', type: 'numeric'},
              {maxValue: 10, text: 'At most 10.', type: 'numeric'},
              {expression: '{satisfaction} % 2 = 0', text: 'Even numbers only.', type: 'expression'},
            ],
          },
        ],
        showQuestionNumbers: 'off',
        title: 'Field types',
      })
      expect(props.fromForm.toSorted()).toStrictEqual(['completeText', 'inputType', 'placeholder', 'visible'])
    })

    test('a hidden field keeps its default through completion', () => {
      const model = new Model(props.surveyJson)
      model.completeLastPage()
      expect(model.data.campaign).toBe('spring-2026')
    })

    test('the step message surfaces through the expression validator', () => {
      const {errors} = verdictOf(props.surveyJson, fieldTypesSubmissions.satisfactionOdd.data)
      expect(errors).toStrictEqual(['satisfaction: Even numbers only.'])
    })

    test('a time outside the clock fails the regex validator', () => {
      expect(verdictOf(props.surveyJson, fieldTypesSubmissions.timeBadHour.data).ok).toBe(false)
    })
  })
})
