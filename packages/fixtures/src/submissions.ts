/** Contact-form submissions with the verdict the schema must reach; error counts and wording may differ per validator. */
export interface Submission {
  data: Record<string, unknown>
  verdict: 'accept' | 'reject'
}

export const contactSubmissions = {
  duplicateInterests: {
    data: {consent: true, email: 'a@b.co', fullName: 'Ada', interests: ['events', 'events'], message: 'ok', topic: 'press'},
    verdict: 'reject',
  },
  emailWithoutDot: {
    data: {consent: true, email: 'a@b', fullName: 'Ada', message: 'ok', topic: 'press'},
    verdict: 'reject',
  },
  empty: {data: {}, verdict: 'reject'},
  everyRuleFails: {
    data: {
      consent: false,
      contactMethod: 'fax',
      email: 'not-an-email',
      fullName: 'A1',
      interests: ['updates', 'events', 'newsletter'],
      message: 'x'.repeat(501),
      partySize: 0,
      topic: 'other',
    },
    verdict: 'reject',
  },
  minLengthAndMaximum: {
    data: {consent: true, email: 'a@b.co', fullName: 'A', message: 'ok', partySize: 13, topic: 'press'},
    verdict: 'reject',
  },
  valid: {
    data: {
      consent: true,
      contactMethod: 'phone',
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
      interests: ['events'],
      message: 'Hello',
      partySize: 4,
      topic: 'sales',
    },
    verdict: 'accept',
  },
} as const satisfies Record<string, Submission>
