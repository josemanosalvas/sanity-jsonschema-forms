import {useMemo, useState} from 'react'
import {contactForm, fieldTypesForm} from 'sanity-form-fixtures'
import type {FormToolkitForm} from 'sanity-jsonschema-forms'
import {toJsonSchema} from 'sanity-jsonschema-forms'

import {JsonFormsPane} from './json-forms-pane'
import {RjsfPane} from './rjsf-pane'

const Panel = ({title, children, open = false}: {title: string; children: string; open?: boolean}) => (
  <details open={open}>
    <summary className="cursor-pointer font-mono font-semibold">{title}</summary>
    <pre className="bg-muted mt-2 max-h-[32rem] overflow-auto rounded-md p-3">{children}</pre>
  </details>
)

/** Swap a fixture for a `@sanity/client` fetch to render a real document. */
const FORMS: Record<string, FormToolkitForm> = {
  contact: contactForm,
  'field-types': fieldTypesForm,
}

/** One form document, one `toJsonSchema()` call, two renderers. */
export const App = () => {
  const [formId, setFormId] = useState<keyof typeof FORMS>('contact')
  const form = FORMS[formId] ?? contactForm
  const compiled = useMemo(() => toJsonSchema(form), [form])
  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-1 flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold">{form.title}</h1>
        <label className="text-muted-foreground text-sm">
          fixture{' '}
          <select className="rounded-md border px-2 py-1" value={formId} onChange={(e) => setFormId(e.target.value)}>
            {Object.keys(FORMS).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-muted-foreground mb-8 text-sm">
        Authored with @sanity/form-toolkit, compiled once by sanity-jsonschema-forms, rendered by two independent form libraries.
      </p>
      <div className="grid gap-10 lg:grid-cols-2">
        <RjsfPane key={`rjsf-${formId}`} form={form} compiled={compiled} />
        <JsonFormsPane key={`jsonforms-${formId}`} form={form} compiled={compiled} />
      </div>
      <aside className="mt-12 grid gap-6 text-xs lg:grid-cols-3">
        <Panel title="schema" open>
          {JSON.stringify(compiled.schema, null, 2)}
        </Panel>
        <Panel title="messages">{JSON.stringify(compiled.messages, null, 2)}</Panel>
        <Panel title="diagnostics">{JSON.stringify(compiled.diagnostics, null, 2)}</Panel>
      </aside>
    </main>
  )
}
