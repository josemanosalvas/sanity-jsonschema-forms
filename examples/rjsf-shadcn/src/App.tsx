import Form from '@rjsf/shadcn'
import type {IChangeEvent} from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import {useMemo, useState} from 'react'
import {toRjsf} from 'sanity-rjsf'

import {form} from './form'

export const App = () => {
  const compiled = useMemo(() => toRjsf(form), [])
  const {schema, uiSchema, transformErrors, diagnostics} = compiled
  const [submitted, setSubmitted] = useState<unknown>(null)

  const onSubmit = ({formData}: IChangeEvent) => setSubmitted(formData)

  return (
    <main className="mx-auto grid max-w-5xl gap-8 p-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section>
        <h1 className="mb-1 text-2xl font-semibold">{form.title}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Authored with @sanity/form-toolkit, compiled by sanity-rjsf, rendered by @rjsf/shadcn, validated by AJV.
        </p>
        <Form
          schema={schema}
          uiSchema={uiSchema}
          validator={validator}
          transformErrors={transformErrors}
          onSubmit={onSubmit}
          noHtml5Validate
          showErrorList={false}
        />
        {submitted !== null && (
          <pre data-testid="submitted" className="mt-6 overflow-x-auto rounded-md bg-muted p-4 text-xs">
            {JSON.stringify(submitted, null, 2)}
          </pre>
        )}
      </section>
      <aside className="space-y-6 text-xs">
        <Panel title="diagnostics">{JSON.stringify(diagnostics, null, 2)}</Panel>
        <Panel title="schema">{JSON.stringify(schema, null, 2)}</Panel>
        <Panel title="uiSchema">{JSON.stringify(uiSchema, null, 2)}</Panel>
      </aside>
    </main>
  )
}

const Panel = ({title, children}: {title: string; children: string}) => (
  <details open={title === 'diagnostics'}>
    <summary className="cursor-pointer font-mono font-semibold">{title}</summary>
    <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3">{children}</pre>
  </details>
)
