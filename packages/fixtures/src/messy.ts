import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'

/**
 * Content an adapter meets in practice: unsupported types, custom types,
 * half-filled fields, bad operands, duplicates. Every field here should
 * produce a diagnostic rather than a throw.
 */
export const messyForm: FormDataProps = {
  title: '  ',
  id: {current: 'messy'},
  fields: [
    {type: 'file', name: 'resume', label: 'Resume', validation: [{type: 'maxSize', value: '5000000', message: 'Too big'}]},
    {type: 'date', name: 'when', label: 'When'},
    {type: 'range', name: 'rating', label: 'Rating'},
    {type: 'myCustomType', name: 'custom', label: 'Custom'},
    {type: 'text', name: '9lives', label: 'Bad name'},
    {type: 'text', name: 'constructor', label: 'Reserved name'},
    {type: 'text', name: 'dup', label: 'First'},
    {type: 'text', name: 'dup', label: 'Second'},
    {type: 'text', name: 'unlabeled'},
    {type: 'text', name: 'badRules', label: 'Bad rules', validation: [
      {type: 'pattern', value: '([', message: 'unbalanced'},
      {type: 'minLength', value: 'three', message: 'not a number'},
      {type: 'min', value: '1', message: 'min on text'},
      {type: 'maxLength', value: '', message: 'empty'},
      {type: 'minDate', value: '2020-01-01', message: 'no counterpart'},
    ]},
    {type: 'number', name: 'badDefault', label: 'Bad default', options: {defaultValue: 'lots'}},
    {type: 'select', name: 'empty', label: 'No choices', choices: []},
    {type: 'select', name: 'dupChoices', label: 'Dup choices', options: {defaultValue: 'zzz', placeholder: 'Pick one'}, choices: [
      {label: 'A', value: 'a'},
      {label: 'Again', value: 'a'},
      {label: 'No value', value: ''},
      {label: '', value: 'b'},
    ]},
    {type: 'radio', name: 'radioPh', label: 'Radio', options: {placeholder: 'ignored'}, choices: [{label: 'X', value: 'x'}]},
    {type: 'checkbox', name: 'groupDefault', label: 'Group', options: {defaultValue: 'a'}, choices: [{label: 'A', value: 'a'}]},
    {type: 'checkbox', name: 'boolRules', label: 'Bool', required: true, options: {defaultValue: 'maybe'}, validation: [{type: 'minSelectedCount', value: '1', message: 'x'}]},
  ],
}
