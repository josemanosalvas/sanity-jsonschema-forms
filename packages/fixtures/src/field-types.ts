import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'

import type {Submission} from './submissions'

/** The eight field types added in 0.2, each with a valid default and every rule the Studio offers for it. */
export const fieldTypesForm: FormDataProps = {
  fields: [
    {
      _key: 't1',
      label: 'Website',
      name: 'website',
      options: {defaultValue: 'https://example.com', placeholder: 'https://'},
      required: true,
      type: 'url',
      validation: [{message: 'Only https links.', type: 'pattern', value: '^https://'}],
    },
    {
      _key: 't2',
      label: 'Phone',
      name: 'phone',
      options: {placeholder: '+1 555 0100'},
      type: 'tel',
      validation: [{message: 'Digits, spaces and a leading + only.', type: 'pattern', value: '^\\+?[0-9 ]+$'}],
    },
    {_key: 't3', name: 'campaign', options: {defaultValue: 'spring-2026'}, type: 'hidden'},
    {_key: 't4', label: 'Brand colour', name: 'brandColor', options: {defaultValue: '#FF8800'}, type: 'color'},
    {
      _key: 't5',
      label: 'Start date',
      name: 'startDate',
      options: {defaultValue: '2026-09-04'},
      required: true,
      type: 'date',
      validation: [
        {message: 'Not before 2026.', type: 'minDate', value: '2026-01-01'},
        {message: 'Not after 2026.', type: 'maxDate', value: '2026-12-31'},
      ],
    },
    {
      _key: 't6',
      label: 'Pickup',
      name: 'pickup',
      options: {defaultValue: '2026-09-04T18:30'},
      type: 'datetime-local',
      validation: [{message: 'Not before 2026.', type: 'minDate', value: '2026-01-01T00:00'}],
    },
    {_key: 't7', label: 'Preferred time', name: 'preferredTime', options: {defaultValue: '18:30'}, type: 'time'},
    {
      _key: 't8',
      label: 'Satisfaction',
      name: 'satisfaction',
      options: {defaultValue: '6'},
      type: 'range',
      validation: [
        {message: 'At least 0.', type: 'min', value: '0'},
        {message: 'At most 10.', type: 'max', value: '10'},
        {message: 'Even numbers only.', type: 'step', value: '2'},
      ],
    },
  ],
  id: {current: 'field-types'},
  submitButton: {position: 'left', text: 'Save'},
  title: 'Field types',
}

/** A submission every schema accepts; each case below changes one field of it. */
const accepted = {
  brandColor: '#ff8800',
  campaign: 'spring-2026',
  phone: '+1 555 0100',
  pickup: '2026-09-04T18:30',
  preferredTime: '18:30',
  satisfaction: 6,
  startDate: '2026-09-04',
  website: 'https://example.com',
}

const oneChange = (change: Record<string, unknown>, verdict: Submission['verdict']): Submission => ({
  data: {...accepted, ...change},
  verdict,
})

/** Native browser values that must pass and shapes that must fail; renderer divergences are listed in test/parity.test.ts. */
export const fieldTypesSubmissions = {
  colorName: oneChange({brandColor: 'red'}, 'reject'),
  colorShort: oneChange({brandColor: '#f80'}, 'reject'),
  colorUppercase: oneChange({brandColor: '#FF8800'}, 'accept'),
  dateFebruary30: oneChange({startDate: '2026-02-30'}, 'reject'),
  // HTML allows years of four or more digits; ajv-formats' `date` takes exactly four. Documented narrowing.
  dateFiveDigitYear: oneChange({startDate: '12026-09-04'}, 'reject'),
  dateLeapDay: oneChange({startDate: '2028-02-29'}, 'accept'),
  dateNonAsciiDigits: oneChange({startDate: '٢٠٢٦-09-04'}, 'reject'),
  dateNonLeapDay: oneChange({startDate: '2025-02-29'}, 'reject'),
  // `minDate` is not in the schema; this is the documented loss.
  dateOutsideAuthoredBounds: oneChange({startDate: '2020-01-01'}, 'accept'),
  // HTML needs year > 0; `format: date` alone would take `0000`, `NONZERO_YEAR_PATTERN` does not.
  dateYearZero: oneChange({startDate: '0000-01-01'}, 'reject'),
  empty: {data: {}, verdict: 'reject'},
  hiddenOmitted: {data: {...accepted, campaign: undefined}, verdict: 'accept'},
  phoneLetters: oneChange({phone: 'call me'}, 'reject'),
  pickupBadHour: oneChange({pickup: '2026-09-04T25:30'}, 'reject'),
  pickupCenturyLeapDay: oneChange({pickup: '2000-02-29T18:30'}, 'accept'),
  pickupCenturyNonLeapDay: oneChange({pickup: '1900-02-29T18:30'}, 'reject'),
  pickupFebruary30: oneChange({pickup: '2026-02-30T18:30'}, 'reject'),
  pickupFiveDigitCenturyLeapDay: oneChange({pickup: '10000-02-29T18:30'}, 'accept'),
  pickupFiveDigitYear: oneChange({pickup: '12026-09-04T18:30'}, 'accept'),
  pickupFiveDigitYearZero: oneChange({pickup: '00000-01-01T00:00'}, 'reject'),
  pickupLeadingZeroYear: oneChange({pickup: '00004-01-01T00:00'}, 'accept'),
  pickupLeapDay: oneChange({pickup: '2024-02-29T18:30'}, 'accept'),
  pickupNonAsciiDigits: oneChange({pickup: '٢٠٢٦-09-04T18:30'}, 'reject'),
  pickupNonLeapDay: oneChange({pickup: '2025-02-29T18:30'}, 'reject'),
  pickupOffset: oneChange({pickup: '2026-09-04T18:30+02:00'}, 'reject'),
  pickupSeconds: oneChange({pickup: '2026-09-04T18:30:15'}, 'accept'),
  pickupUtc: oneChange({pickup: '2026-09-04T18:30Z'}, 'reject'),
  pickupYearZero: oneChange({pickup: '0000-01-01T00:00'}, 'reject'),
  satisfactionAsString: oneChange({satisfaction: '6'}, 'reject'),
  satisfactionOdd: oneChange({satisfaction: 3}, 'reject'),
  satisfactionOver: oneChange({satisfaction: 12}, 'reject'),
  satisfactionZero: oneChange({satisfaction: 0}, 'accept'),
  timeBadHour: oneChange({preferredTime: '25:30'}, 'reject'),
  timeMilliseconds: oneChange({preferredTime: '18:30:00.500'}, 'accept'),
  timeNonAsciiDigits: oneChange({preferredTime: '١٨:30'}, 'reject'),
  timeSeconds: oneChange({preferredTime: '18:30:00'}, 'accept'),
  timeUtc: oneChange({preferredTime: '18:30Z'}, 'reject'),
  valid: {data: accepted, verdict: 'accept'},
  websiteHttp: oneChange({website: 'http://example.com'}, 'reject'),
  // A native `url` input accepts these; `format: uri` (RFC 3986) needs them percent-encoded. Documented narrowing.
  websiteInternationalizedHost: oneChange({website: 'https://例え.jp'}, 'reject'),
  websiteNonAscii: oneChange({website: 'https://example.com/ü'}, 'reject'),
  websiteRelative: oneChange({website: 'example.com'}, 'reject'),
  websiteSpace: oneChange({website: 'https://exa mple.com'}, 'reject'),
} as const satisfies Record<string, Submission>

/** What an editor can get wrong: bad defaults, malformed operands, a step the schema cannot encode, a required hidden field with no value. Every field still compiles. */
export const fieldTypeEdgesForm: FormDataProps = {
  fields: [
    {label: 'Email', name: 'badEmail', options: {defaultValue: 'not-an-email'}, type: 'email'},
    // The native input accepts a domain without a dot; ajv-formats does not.
    {label: 'Email', name: 'dotlessEmail', options: {defaultValue: 'a@b'}, type: 'email'},
    {label: 'Website', name: 'badUrl', options: {defaultValue: 'example.com'}, type: 'url'},
    {label: 'Website', name: 'unicodeUrl', options: {defaultValue: 'https://例え.jp'}, type: 'url'},
    // The WHATWG parser takes brackets in a query; RFC 3986 and `format: uri` do not.
    {label: 'Website', name: 'bracketUrl', options: {defaultValue: 'https://example.com/?ids[]=1'}, type: 'url'},
    {label: 'Token', name: 'requiredHidden', required: true, type: 'hidden'},
    {label: 'Source', name: 'hiddenPlaceholder', options: {defaultValue: 'web', placeholder: 'ignored'}, type: 'hidden'},
    {label: 'Colour', name: 'namedColor', options: {defaultValue: 'red'}, type: 'color'},
    {label: 'Colour', name: 'shortColor', options: {defaultValue: '#f80', placeholder: 'ignored'}, type: 'color'},
    {
      label: 'Date',
      name: 'badDate',
      options: {defaultValue: '2026-02-30'},
      type: 'date',
      validation: [
        {message: 'soon', type: 'minDate', value: 'soon'},
        {message: 'empty', type: 'maxDate', value: ''},
        {message: 'min on date', type: 'min', value: '1'},
      ],
    },
    {label: 'Date', name: 'zeroDate', options: {defaultValue: '0000-01-01'}, type: 'date'},
    {label: 'Pickup', name: 'utcPickup', options: {defaultValue: '2026-09-04T18:30Z'}, type: 'datetime-local'},
    {label: 'Time', name: 'badTime', options: {defaultValue: '25:30'}, type: 'time'},
    {label: 'Rating', name: 'wordRating', options: {defaultValue: 'lots', placeholder: 'ignored'}, type: 'range'},
    {
      label: 'Rating',
      name: 'offsetStep',
      type: 'range',
      validation: [
        {message: 'odd', type: 'step', value: '2'},
        {message: 'min', type: 'min', value: '1'},
        {message: 'max', type: 'max', value: '9'},
      ],
    },
    {
      label: 'Rating',
      name: 'defaultBase',
      options: {defaultValue: '3'},
      type: 'range',
      validation: [{message: 'x', type: 'step', value: '2'}],
    },
    {
      label: 'Rating',
      name: 'alignedDefaultBase',
      options: {defaultValue: '4'},
      type: 'range',
      validation: [{message: 'x', type: 'step', value: '2'}],
    },
    {label: 'Rating', name: 'fractionStep', type: 'range', validation: [{message: 'x', type: 'step', value: '0.1'}]},
    {label: 'Rating', name: 'anyStep', type: 'range', validation: [{message: 'x', type: 'step', value: 'any'}]},
    {label: 'Rating', name: 'zeroStep', type: 'range', validation: [{message: 'x', type: 'step', value: '0'}]},
    {label: 'Rating', name: 'noBaseStep', type: 'range', validation: [{message: 'x', type: 'step', value: '5'}]},
  ],
  id: {current: 'field-type-edges'},
  title: 'Field type edges',
}
