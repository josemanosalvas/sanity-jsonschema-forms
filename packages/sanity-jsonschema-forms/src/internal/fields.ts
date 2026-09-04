import type {JSONSchema7} from 'json-schema'

import type {SupportedFieldType} from '../to-json-schema'
import {classifyField} from '../to-json-schema'
import type {FormToolkitForm} from '../types'

/**
 * What adapters need that JSON Schema cannot carry: which input the editor
 * chose (textarea and text share one schema, so do the string types with
 * a pattern) and its placeholder.
 */
export interface PresentationField {
  name: string
  type: SupportedFieldType
  /** Only on types with a text input to show it in; the compiler reports the others as ignored. */
  placeholder?: string
}

/** Types with no text input for a placeholder; mirrors the compiler's `ignored-placeholder`. */
const NO_PLACEHOLDER: ReadonlySet<SupportedFieldType> = new Set<SupportedFieldType>(['checkbox', 'color', 'hidden', 'radio', 'range'])

const trimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const text = value.trim()
  return text.length === 0 ? undefined : text
}

/** The source fields the compiler kept, in schema order, decided by the compiler's own check. */
export const presentationFields = (form: FormToolkitForm, schema: JSONSchema7): PresentationField[] => {
  const properties = schema.properties ?? {}
  const seen = new Set<string>()
  const out: PresentationField[] = []
  for (const field of form.fields ?? []) {
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
