import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'

/**
 * Content an adapter meets in practice: unsupported types, custom types,
 * half-filled fields, bad operands, duplicates. Every field here should
 * produce a diagnostic rather than a throw.
 */
export const messyForm: FormDataProps = {
  fields: [
    {label: 'Resume', name: 'resume', type: 'file', validation: [{message: 'Too big', type: 'maxSize', value: '5000000'}]},
    {label: 'When', name: 'when', type: 'date'},
    {label: 'Rating', name: 'rating', type: 'range'},
    {label: 'Custom', name: 'custom', type: 'myCustomType'},
    {label: 'Bad name', name: '9lives', type: 'text'},
    {label: 'Reserved name', name: 'constructor', type: 'text'},
    {label: 'First', name: 'dup', type: 'text'},
    {label: 'Second', name: 'dup', type: 'text'},
    {name: 'unlabeled', type: 'text'},
    {
      label: 'Bad rules',
      name: 'badRules',
      type: 'text',
      validation: [
        {message: 'unbalanced', type: 'pattern', value: '(['},
        {message: 'not a number', type: 'minLength', value: 'three'},
        {message: 'min on text', type: 'min', value: '1'},
        {message: 'empty', type: 'maxLength', value: ''},
        {message: 'no counterpart', type: 'minDate', value: '2020-01-01'},
      ],
    },
    {label: 'Bad default', name: 'badDefault', options: {defaultValue: 'lots'}, type: 'number'},
    {choices: [], label: 'No choices', name: 'empty', type: 'select'},
    {
      choices: [
        {label: 'A', value: 'a'},
        {label: 'Again', value: 'a'},
        {label: 'No value', value: ''},
        {label: '', value: 'b'},
      ],
      label: 'Dup choices',
      name: 'dupChoices',
      options: {defaultValue: 'zzz', placeholder: 'Pick one'},
      type: 'select',
    },
    {choices: [{label: 'X', value: 'x'}], label: 'Radio', name: 'radioPh', options: {placeholder: 'ignored'}, type: 'radio'},
    {choices: [{label: 'A', value: 'a'}], label: 'Group', name: 'groupDefault', options: {defaultValue: 'a'}, type: 'checkbox'},
    {
      label: 'Bool',
      name: 'boolRules',
      options: {defaultValue: 'maybe'},
      required: true,
      type: 'checkbox',
      validation: [{message: 'x', type: 'minSelectedCount', value: '1'}],
    },
  ],
  id: {current: 'messy'},
  title: '  ',
}
