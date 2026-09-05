import type {JSONSchema7} from 'json-schema'

import type {FormToolkitForm} from '../types'
import type {SupportedFieldType} from './field'
import {classifyField, trimmed} from './field'

/**
 * What adapters need that JSON Schema cannot carry: which input the editor
 * chose (textarea and text share one schema, so do the string types with
 * a pattern) and its placeholder.
 */
export interface PresentationField {
  name: string
  type: SupportedFieldType
  placeholder?: string
}

/** No text input to show a placeholder in; the compiler reports these as `ignored-placeholder`. */
const NO_PLACEHOLDER: ReadonlySet<SupportedFieldType> = new Set<SupportedFieldType>(['checkbox', 'color', 'hidden', 'radio', 'range'])

/** The source fields the compiler kept, in schema order, decided by the compiler's own check. */
export const presentationFields = (form: FormToolkitForm, schema: JSONSchema7): PresentationField[] => {
  const properties = schema.properties ?? {}
  const seen = new Set<string>()
  const out: PresentationField[] = []
  for (const field of Array.isArray(form?.fields) ? form.fields : []) {
    if (field === null || typeof field !== 'object') {
      continue
    }
    const verdict = classifyField(field)
    if (!verdict.accepted) {
      continue
    }
    const {name, sourceType: type} = verdict
    if (seen.has(name) || !Object.hasOwn(properties, name)) {
      continue
    }
    seen.add(name)
    const placeholder = NO_PLACEHOLDER.has(type) ? undefined : trimmed(field.options?.placeholder)
    out.push(placeholder === undefined ? {name, type} : {name, placeholder, type})
  }
  return out
}
