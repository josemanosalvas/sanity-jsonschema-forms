import {defineConfig} from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/rjsf.ts', 'src/jsonforms.ts', 'src/surveyjs.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  fixedExtension: false,
})
