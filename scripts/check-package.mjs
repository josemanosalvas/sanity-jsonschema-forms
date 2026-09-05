import {execFileSync} from 'node:child_process'
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'

const consumer = await mkdtemp(path.join(tmpdir(), 'sanity-jsonschema-forms-'))
try {
  const archive = path.join(consumer, 'package.tgz')
  execFileSync('pnpm', ['--filter', 'sanity-jsonschema-forms', 'pack', '--out', archive], {stdio: 'pipe'})
  const installed = path.join(consumer, 'node_modules', 'sanity-jsonschema-forms')
  await mkdir(installed, {recursive: true})
  execFileSync('tar', ['-xzf', archive, '-C', installed, '--strip-components=1'])
  // Resolve the published exports in an isolated consumer with no renderer peers.
  const entry = path.join(consumer, 'check.mjs')
  await writeFile(
    entry,
    `
import assert from 'node:assert/strict'
import {toJsonSchema} from 'sanity-jsonschema-forms'
import {toRjsfProps} from 'sanity-jsonschema-forms/rjsf'
import {toJsonFormsProps} from 'sanity-jsonschema-forms/jsonforms'
import manifest from 'sanity-jsonschema-forms/package.json' with {type: 'json'}

assert.equal(manifest.name, 'sanity-jsonschema-forms')
const form = {title: 'Packed consumer', fields: [
  {name: 'count', type: 'number', options: {defaultValue: '0'}},
  {name: 'consent', type: 'checkbox', required: true},
]}
const compiled = toJsonSchema(form)
assert.equal(compiled.schema.properties.consent.const, true)
assert.equal(toRjsfProps(form, compiled).schema, compiled.schema)
const jsonforms = toJsonFormsProps(form, compiled)
assert.equal(jsonforms.schema, compiled.schema)
assert.deepEqual(jsonforms.initialData, {count: 0})
`,
  )
  execFileSync(process.execPath, [entry], {cwd: consumer, stdio: 'inherit'})
  console.log('Packed exports work without renderer peers.')
} finally {
  await rm(consumer, {force: true, recursive: true})
}
