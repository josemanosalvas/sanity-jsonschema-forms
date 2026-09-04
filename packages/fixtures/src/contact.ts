import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'

/**
 * A contact form as a `@sanity/form-toolkit` `form` document comes back from
 * GROQ (`*[_type == "form" && id.current == $id][0]`), exercising every
 * supported field type and every supported validation rule once.
 */
export const contactForm: FormDataProps = {
  fields: [
    {
      _key: 'k1',
      label: 'Full name',
      name: 'fullName',
      options: {placeholder: 'Ada Lovelace'},
      required: true,
      type: 'text',
      validation: [
        {message: 'Please enter at least two characters.', type: 'minLength', value: '2'},
        {message: 'Names are limited to 80 characters.', type: 'maxLength', value: '80'},
        {message: 'Names cannot contain digits.', type: 'pattern', value: '^[^0-9]*$'},
      ],
    },
    {
      _key: 'k2',
      label: 'Email',
      name: 'email',
      options: {placeholder: 'you@example.com'},
      required: true,
      type: 'email',
      validation: [],
    },
    {
      _key: 'k3',
      label: 'Party size',
      name: 'partySize',
      options: {defaultValue: '2', placeholder: 'How many?'},
      type: 'number',
      validation: [
        {message: 'At least one person.', type: 'min', value: '1'},
        {message: 'We can seat 12 at most.', type: 'max', value: '12'},
      ],
    },
    {
      _key: 'k4',
      choices: [
        {label: 'Sales', value: 'sales'},
        {label: 'Support', value: 'support'},
        {label: 'Press', value: 'press'},
      ],
      label: 'Topic',
      name: 'topic',
      required: true,
      type: 'select',
    },
    {
      _key: 'k5',
      choices: [
        {label: 'Email', value: 'email'},
        {label: 'Phone', value: 'phone'},
      ],
      label: 'Preferred contact method',
      name: 'contactMethod',
      options: {defaultValue: 'email'},
      type: 'radio',
    },
    {
      _key: 'k6',
      choices: [
        {label: 'Product updates', value: 'updates'},
        {label: 'Events', value: 'events'},
        {label: 'Newsletter', value: 'newsletter'},
      ],
      label: 'Interests',
      name: 'interests',
      type: 'checkbox',
      validation: [{message: 'Pick two at most.', type: 'maxSelectedCount', value: '2'}],
    },
    {
      _key: 'k7',
      label: 'Message',
      name: 'message',
      options: {placeholder: 'How can we help?'},
      required: true,
      type: 'textarea',
      validation: [{message: 'Keep it under 500 characters.', type: 'maxLength', value: '500'}],
    },
    {
      _key: 'k8',
      label: 'I agree to be contacted',
      name: 'consent',
      required: true,
      type: 'checkbox',
    },
  ],
  id: {current: 'contact'},
  submitButton: {position: 'right', text: 'Send message'},
  title: 'Contact us',
}
