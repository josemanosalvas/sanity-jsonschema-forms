import {defineConfig} from 'oxlint'
import core from 'ultracite/oxlint/core'
import react from 'ultracite/oxlint/react'
import vitest from 'ultracite/oxlint/vitest'

export default defineConfig({
  extends: [core, react, vitest],
  ignorePatterns: core.ignorePatterns,
  rules: {
    // Key order in JSON Schema and UI schema literals is meaningful to a reader.
    'sort-keys': 'off',
    // The compiler's switch over field types is one function on purpose.
    complexity: 'off',
  },
  overrides: [
    {
      // React components are PascalCase files by convention.
      files: ['**/*.tsx'],
      rules: {'unicorn/filename-case': ['error', {cases: {kebabCase: true, pascalCase: true}}]},
    },
    {
      files: ['**/*.test.{ts,tsx}'],
      plugins: ['vitest'],
      rules: {
        // A render test asserts several visible things about one render.
        'vitest/max-expects': 'off',
        // `toBe(true)` is the assertion; `toBeTruthy()` would accept anything.
        'vitest/prefer-to-be-truthy': 'off',
        'vitest/prefer-to-be-falsy': 'off',
      },
    },
  ],
})
