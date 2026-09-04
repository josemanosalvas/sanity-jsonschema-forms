import type {JSONSchema7, JSONSchema7Definition} from 'json-schema'

import type {SupportedFieldType} from '../to-json-schema'
import {isSupportedType} from '../to-json-schema'
import type {FormToolkitForm} from '../types'

/**
 * What adapters need that JSON Schema cannot carry: which input the editor
 * chose (textarea and text share one schema) and its placeholder.
 */
export interface PresentationField {
  name: string
  type: SupportedFieldType
  placeholder?: string
}

const trimmed = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }
  const text = value.trim()
  return text.length === 0 ? undefined : text
}

/** A dropped choice field may share its name with a later, kept field; the property's shape tells them apart. */
const shapeMatches = (type: SupportedFieldType, property: JSONSchema7Definition | undefined): boolean => {
  if (typeof property !== 'object' || property === null) {
    return false
  }
  switch (type) {
    case 'select':
    case 'radio': {
      return Array.isArray(property.oneOf)
    }
    case 'checkbox': {
      return property.type === 'boolean' || property.type === 'array'
    }
    case 'number': {
      return property.type === 'number'
    }
    case 'text':
    case 'textarea':
    case 'email': {
      return property.type === 'string' && property.oneOf === undefined
    }
    default: {
      return false
    }
  }
}

/** The source fields the compiler kept, in schema order. */
export const presentationFields = (form: FormToolkitForm, schema: JSONSchema7): PresentationField[] => {
  const properties = schema.properties ?? {}
  const seen = new Set<string>()
  const out: PresentationField[] = []
  for (const field of form.fields ?? []) {
    const name = trimmed(field?.name)
    const type = trimmed(field?.type)
    if (name === undefined || type === undefined || !isSupportedType(type)) {
      continue
    }
    if (!Object.hasOwn(properties, name) || seen.has(name) || !shapeMatches(type, properties[name])) {
      continue
    }
    seen.add(name)
    const placeholder = trimmed(field.options?.placeholder)
    out.push(placeholder === undefined ? {name, type} : {name, placeholder, type})
  }
  return out
}
