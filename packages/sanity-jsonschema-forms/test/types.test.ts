import type {FormDataProps} from '@sanity/form-toolkit/form-renderer'
import {describe, expectTypeOf, test} from 'vitest'

import type {FormToolkitForm} from '../src'

/**
 * `FormToolkitForm` is a structural copy of form-toolkit's `FormDataProps`
 * so consumers need not install `@sanity/form-toolkit`. This keeps the copy
 * honest: it is checked by `tsc`, not at runtime.
 */
describe('input type', () => {
  test('a @sanity/form-toolkit document is accepted as is', () => {
    expectTypeOf<FormDataProps>().toExtend<FormToolkitForm>()
  })
})
