import {JsonForms} from '@jsonforms/react'
import {vanillaCells, vanillaRenderers} from '@jsonforms/vanilla-renderers'
import {useMemo, useState} from 'react'
import type {FormToolkitForm, ToJsonSchemaResult} from 'sanity-jsonschema-forms'
import {toJsonFormsProps} from 'sanity-jsonschema-forms/jsonforms'

import {CheckboxGroupControl, checkboxGroupTester} from './CheckboxGroupControl'

const renderers = [...vanillaRenderers, {tester: checkboxGroupTester, renderer: CheckboxGroupControl}]

export const JsonFormsPane = ({form, compiled}: {form: FormToolkitForm; compiled: ToJsonSchemaResult}) => {
  const {schema, uischema, translate, submitText, initialData} = useMemo(() => toJsonFormsProps(form, compiled), [form, compiled])
  const [data, setData] = useState<unknown>(initialData)
  const [errors, setErrors] = useState<unknown[]>([])
  const [attempted, setAttempted] = useState(false)
  const [submitted, setSubmitted] = useState<unknown>(null)

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">JSON Forms · vanilla renderers</h2>
      <p className="mb-4 text-xs text-muted-foreground">uischema + translate from sanity-jsonschema-forms/jsonforms, plus one checkbox-group renderer</p>
      <form
        className="jsonforms"
        onSubmit={(e) => {
          e.preventDefault()
          setAttempted(true)
          if (errors.length === 0) setSubmitted(data)
        }}
        noValidate
      >
        <JsonForms
          schema={schema}
          uischema={uischema}
          data={data}
          renderers={renderers}
          cells={vanillaCells}
          i18n={{translate}}
          validationMode={attempted ? 'ValidateAndShow' : 'ValidateAndHide'}
          onChange={({data: next, errors: nextErrors}) => {
            setData(next)
            setErrors(nextErrors ?? [])
          }}
        />
        <button type="submit" className="mt-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          {submitText ?? 'Submit'}
        </button>
      </form>
      {submitted !== null && <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(submitted, null, 2)}</pre>}
    </section>
  )
}
