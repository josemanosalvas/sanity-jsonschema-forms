import {useMemo} from 'react'
import {contactForm} from 'sanity-form-fixtures'
import {toJsonSchema} from 'sanity-json-schema'

import {JsonFormsPane} from './JsonFormsPane'
import {RjsfPane} from './RjsfPane'

/**
 * One @sanity/form-toolkit document, one toJsonSchema() call, two renderers.
 * The fixture is the shape the Studio's formSchema plugin stores; swap it for
 * a @sanity/client fetch and nothing else changes.
 */
export const App = () => {
  const compiled = useMemo(() => toJsonSchema(contactForm), [])
  return (
    <main className="mx-auto max-w-7xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">{contactForm.title}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Authored with @sanity/form-toolkit, compiled once by sanity-json-schema, rendered by two independent form libraries.
      </p>
      <div className="grid gap-10 lg:grid-cols-2">
        <RjsfPane form={contactForm} compiled={compiled} />
        <JsonFormsPane form={contactForm} compiled={compiled} />
      </div>
      <aside className="mt-12 grid gap-6 text-xs lg:grid-cols-3">
        <Panel title="schema" open>{JSON.stringify(compiled.schema, null, 2)}</Panel>
        <Panel title="messages">{JSON.stringify(compiled.messages, null, 2)}</Panel>
        <Panel title="diagnostics">{JSON.stringify(compiled.diagnostics, null, 2)}</Panel>
      </aside>
    </main>
  )
}

const Panel = ({title, children, open = false}: {title: string; children: string; open?: boolean}) => (
  <details open={open}>
    <summary className="cursor-pointer font-mono font-semibold">{title}</summary>
    <pre className="mt-2 max-h-[32rem] overflow-auto rounded-md bg-muted p-3">{children}</pre>
  </details>
)
