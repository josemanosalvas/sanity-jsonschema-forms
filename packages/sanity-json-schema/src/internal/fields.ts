import type {JSONSchema7} from 'json-schema'

import type {SupportedFieldType} from '../to-json-schema'
import {isSupportedType} from '../to-json-schema'
import type {FormToolkitForm} from '../types'

/**
 * The presentation facts a renderer adapter needs that JSON Schema cannot
 * carry: which input the editor chose (a textarea and a text field share one
 * schema) and its placeholder. Deliberately nothing else, and deliberately
 * not exported from any package entry: this is the whole "intermediate model"
 * both adapters share, and its size is part of the spike's evidence.
 */
export interface PresentationField {
  name: string
  type: SupportedFieldType
  placeholder?: string
}

const trimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text.length === 0 ? undefined : text
}

/**
 * Walks the source fields and keeps the ones the compiler kept, in schema
 * order. The compiler already dropped duplicates, bad names and unsupported
 * types; membership in `schema.properties` is the only filter needed here.
 */
export const presentationFields = (form: FormToolkitForm, schema: JSONSchema7): PresentationField[] => {
  const properties = schema.properties ?? {}
  const seen = new Set<string>()
  const out: PresentationField[] = []
  for (const field of form.fields ?? []) {
    const name = trimmed(field?.name)
    const type = trimmed(field?.type)
    if (name === undefined || type === undefined || !isSupportedType(type)) continue
    if (!Object.hasOwn(properties, name) || seen.has(name)) continue
    seen.add(name)
    const placeholder = trimmed(field.options?.placeholder)
    out.push(placeholder === undefined ? {name, type} : {name, type, placeholder})
  }
  return out
}
