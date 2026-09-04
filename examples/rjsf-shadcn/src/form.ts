import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'

/**
 * A `form` document exactly as the Studio's `formSchema` plugin stores it and
 * as this GROQ projection returns it:
 *
 *   *[_type == "form" && id.current == $id][0]{
 *     title, id, submitButton,
 *     fields[]{_key, type, label, name, required, validation, options, choices}
 *   }
 *
 * Swap this constant for a `@sanity/client` fetch and nothing else changes.
 */
export const form: FormDataProps = {
  title: 'Contact us',
  id: {current: 'contact'},
  submitButton: {text: 'Send message', position: 'right'},
  fields: [
    {
      _key: 'k1',
      type: 'text',
      name: 'fullName',
      label: 'Full name',
      required: true,
      options: {placeholder: 'Ada Lovelace'},
      validation: [
        {type: 'minLength', value: '2', message: 'Please enter at least two characters.'},
        {type: 'pattern', value: '^[^0-9]*$', message: 'Names cannot contain digits.'},
      ],
    },
    {
      _key: 'k2',
      type: 'email',
      name: 'email',
      label: 'Email',
      required: true,
      options: {placeholder: 'you@example.com'},
    },
    {
      _key: 'k3',
      type: 'number',
      name: 'partySize',
      label: 'Party size',
      options: {defaultValue: '2'},
      validation: [
        {type: 'min', value: '1', message: 'At least one person.'},
        {type: 'max', value: '12', message: 'We can seat 12 at most.'},
      ],
    },
    {
      _key: 'k4',
      type: 'select',
      name: 'topic',
      label: 'Topic',
      required: true,
      options: {placeholder: 'Choose a topic'},
      choices: [
        {label: 'Sales', value: 'sales'},
        {label: 'Support', value: 'support'},
        {label: 'Press', value: 'press'},
      ],
    },
    {
      _key: 'k5',
      type: 'radio',
      name: 'contactMethod',
      label: 'Preferred contact method',
      options: {defaultValue: 'email'},
      choices: [
        {label: 'Email', value: 'email'},
        {label: 'Phone', value: 'phone'},
      ],
    },
    {
      _key: 'k6',
      type: 'checkbox',
      name: 'interests',
      label: 'Interests',
      choices: [
        {label: 'Product updates', value: 'updates'},
        {label: 'Events', value: 'events'},
        {label: 'Newsletter', value: 'newsletter'},
      ],
      validation: [{type: 'maxSelectedCount', value: '2', message: 'Pick two at most.'}],
    },
    {
      _key: 'k7',
      type: 'textarea',
      name: 'message',
      label: 'Message',
      required: true,
      options: {placeholder: 'How can we help?'},
      validation: [{type: 'maxLength', value: '500', message: 'Keep it under 500 characters.'}],
    },
    {
      _key: 'k8',
      type: 'checkbox',
      name: 'consent',
      label: 'I agree to be contacted',
      required: true,
    },
    // Not compiled by the spike: shows up in the diagnostics panel instead.
    {_key: 'k9', type: 'file', name: 'attachment', label: 'Attachment'},
  ],
}
