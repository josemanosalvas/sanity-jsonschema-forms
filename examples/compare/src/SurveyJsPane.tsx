import {useMemo, useState} from 'react'
import type {FormToolkitForm, ToJsonSchemaResult} from 'sanity-jsonschema-forms'
import {toSurveyJsProps} from 'sanity-jsonschema-forms/surveyjs'
import {Model} from 'survey-core'
import {Survey} from 'survey-react-ui'
import 'survey-core/survey-core.css'

export const SurveyJsPane = ({form, compiled}: {form: FormToolkitForm; compiled: ToJsonSchemaResult}) => {
  const {surveyJson, fromForm} = useMemo(() => toSurveyJsProps(form, compiled), [form, compiled])
  const [submitted, setSubmitted] = useState<unknown>(null)
  const model = useMemo(() => {
    const m = new Model(surveyJson)
    m.showCompletedPage = false
    m.onComplete.add((sender) => setSubmitted(sender.data))
    return m
  }, [surveyJson])
  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">SurveyJS · survey-react-ui</h2>
      <p className="mb-4 text-xs text-muted-foreground">survey JSON from sanity-jsonschema-forms/surveyjs; from the form only: {fromForm.join(', ')}</p>
      <div className="surveyjs">
        <Survey model={model} />
      </div>
      {submitted !== null && <pre className="mt-4 overflow-x-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(submitted, null, 2)}</pre>}
    </section>
  )
}
