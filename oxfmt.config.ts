import {defineConfig} from 'oxfmt'
import ultracite from 'ultracite/oxfmt'

// Ultracite's preset with this codebase's existing style; Markdown is wrapped by hand.
export default defineConfig({
  ...ultracite,
  bracketSpacing: false,
  ignorePatterns: [...ultracite.ignorePatterns, '**/*.md'],
  printWidth: 140,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
})
