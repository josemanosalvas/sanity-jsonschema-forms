import {defineConfig} from 'tsdown'

export default defineConfig({
  clean: true,
  dts: true,
  entry: ['src/index.ts', 'src/rjsf.ts', 'src/jsonforms.ts'],
  fixedExtension: false,
  format: ['esm'],
})
