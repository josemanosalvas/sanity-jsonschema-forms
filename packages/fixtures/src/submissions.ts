/**
 * Submissions for the contact form, with the verdict every compiler's schema
 * must reach. The verdict is what parity between compilers is measured on;
 * error counts and wording may differ per validator.
 */
export interface Submission {
  data: Record<string, unknown>
  verdict: 'accept' | 'reject'
}

export const contactSubmissions = {
  valid: {
    verdict: 'accept',
    data: {
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      partySize: 4,
      topic: 'sales',
      contactMethod: 'phone',
      interests: ['events'],
      message: 'Hello',
      consent: true,
    },
  },
  empty: {verdict: 'reject', data: {}},
  everyRuleFails: {
    verdict: 'reject',
    data: {
      fullName: 'A1',
      email: 'not-an-email',
      partySize: 0,
      topic: 'other',
      contactMethod: 'fax',
      interests: ['updates', 'events', 'newsletter'],
      message: 'x'.repeat(501),
      consent: false,
    },
  },
  minLengthAndMaximum: {
    verdict: 'reject',
    data: {fullName: 'A', partySize: 13, email: 'a@b.co', topic: 'press', message: 'ok', consent: true},
  },
  duplicateInterests: {
    verdict: 'reject',
    data: {fullName: 'Ada', email: 'a@b.co', topic: 'press', message: 'ok', consent: true, interests: ['events', 'events']},
  },
} as const satisfies Record<string, Submission>
