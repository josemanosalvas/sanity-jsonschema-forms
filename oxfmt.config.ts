import {defineConfig} from 'oxfmt'
import ultracite from 'ultracite/oxfmt'

// Ultracite's preset, with the style this codebase already uses (the same
// options Sanity's own packages set for Prettier). Markdown is written and
// wrapped by hand; the docs' wide tables read better unpadded.
export default defineConfig({
  ...ultracite,
  bracketSpacing: false,
  ignorePatterns: [...ultracite.ignorePatterns, '**/*.md'],
  printWidth: 140,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
})
