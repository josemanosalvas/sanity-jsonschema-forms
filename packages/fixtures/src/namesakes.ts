import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'

/**
 * Four choice fields whose names are first taken by a choice field with no
 * choices. The compiler drops the first of each pair; adapters must take
 * their presentation (radio vs select, placeholder) from the second. The
 * dropped-select-then-textarea case lives in `messyForm` (`empty`).
 */
export const namesakeForm: FormDataProps = {
  fields: [
    {choices: [], label: 'Dropped', name: 'selectThenRadio', options: {placeholder: 'Stolen'}, type: 'select'},
    {choices: [{label: 'A', value: 'a'}], label: 'Kept radio', name: 'selectThenRadio', type: 'radio'},
    {choices: [], label: 'Dropped', name: 'radioThenSelect', type: 'radio'},
    {
      choices: [{label: 'B', value: 'b'}],
      label: 'Kept select',
      name: 'radioThenSelect',
      options: {placeholder: 'Pick one'},
      type: 'select',
    },
    {choices: [], label: 'Dropped', name: 'selectThenSelect', options: {placeholder: 'Stolen'}, type: 'select'},
    {
      choices: [{label: 'C', value: 'c'}],
      label: 'Kept select',
      name: 'selectThenSelect',
      options: {placeholder: 'Pick one'},
      type: 'select',
    },
    {choices: [], label: 'Dropped', name: 'radioThenRadio', type: 'radio'},
    {choices: [{label: 'D', value: 'd'}], label: 'Kept radio', name: 'radioThenRadio', type: 'radio'},
  ],
  id: {current: 'namesakes'},
  title: 'Namesakes',
}
