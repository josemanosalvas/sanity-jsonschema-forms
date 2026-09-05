import {defineConfig} from 'oxlint'
import core from 'ultracite/oxlint/core'
import react from 'ultracite/oxlint/react'
import vitest from 'ultracite/oxlint/vitest'

export default defineConfig({
  extends: [core, react, vitest],
  ignorePatterns: core.ignorePatterns,
  overrides: [
    {
      files: ['**/*.test.{ts,tsx}'],
      plugins: ['vitest'],
      rules: {
        // A render test asserts several visible things about one render.
        'vitest/max-expects': 'off',
        // `toBe(true)` is the assertion; `toBeTruthy()` would accept anything.
        'vitest/prefer-to-be-falsy': 'off',
        'vitest/prefer-to-be-truthy': 'off',
      },
    },
  ],
  rules: {
    // The compiler's switch over field types is one function on purpose.
    complexity: 'off',
    // Schema and message maps have dynamic keyword keys.
    'typescript/no-dynamic-delete': 'off',
  },
})
