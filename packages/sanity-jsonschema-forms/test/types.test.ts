import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'
import {describe, expectTypeOf, test} from 'vitest'

import type {FormToolkitForm} from '../src'

describe('input type', () => {
  test('a @sanity/form-toolkit document is accepted as is', () => {
    expectTypeOf<FormDataProps>().toExtend<FormToolkitForm>()
  })
})
