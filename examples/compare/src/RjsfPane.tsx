import type {IChangeEvent} from '@rjsf/core'
import Form from '@rjsf/shadcn'
import validator from '@rjsf/validator-ajv8'
import {useMemo, useState} from 'react'
import type {FormToolkitForm, ToJsonSchemaResult} from 'sanity-jsonschema-forms'
import {toRjsfProps} from 'sanity-jsonschema-forms/rjsf'

export const RjsfPane = ({form, compiled}: {form: FormToolkitForm; compiled: ToJsonSchemaResult}) => {
  const {schema, uiSchema, formProps, transformErrors} = useMemo(() => toRjsfProps(form, compiled), [form, compiled])
  const [submitted, setSubmitted] = useState<unknown>(null)
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">RJSF · @rjsf/shadcn</h2>
      <p className="mb-4 text-xs text-muted-foreground">uiSchema + formProps + transformErrors from sanity-jsonschema-forms/rjsf</p>
      <Form
        {...formProps}
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        transformErrors={transformErrors}
        onSubmit={({formData}: IChangeEvent) => setSubmitted(formData)}
        noHtml5Validate
        showErrorList={false}
      />
      {submitted !== null && (
        <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(submitted, null, 2)}</pre>
      )}
    </section>
  )
}
