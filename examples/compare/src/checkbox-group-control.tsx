import {and, rankWith, schemaMatches, uiTypeIs} from '@jsonforms/core'
import type {ControlProps, JsonSchema, RankedTester} from '@jsonforms/core'
import {withJsonFormsControlProps} from '@jsonforms/react'

/**
 * JSON Forms' vanilla renderer set has no control for an array of enum
 * values, so a checkbox group renders as "unknown" without this. It is the
 * one renderer the JSON Forms side needed that the RJSF side did not.
 */
const CheckboxGroup = ({data, handleChange, path, label, schema, errors, id}: ControlProps) => {
  const items = schema.items as JsonSchema
  const options = (items.oneOf ?? []).map((o) => ({label: (o as JsonSchema).title ?? '', value: String((o as JsonSchema).const)}))
  const selected: string[] = Array.isArray(data) ? data : []
  return (
    <fieldset className="control" id={id}>
      <legend>{label}</legend>
      {options.map((o) => (
        <label key={o.value}>
          <input
            type="checkbox"
            value={o.value}
            checked={selected.includes(o.value)}
            onChange={(e) => handleChange(path, e.target.checked ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
          />
          {o.label}
        </label>
      ))}
      {errors && <span className="validation">{errors}</span>}
    </fieldset>
  )
}

export const checkboxGroupTester: RankedTester = rankWith(
  5,
  and(
    uiTypeIs('Control'),
    schemaMatches(
      (s) => s.type === 'array' && s.uniqueItems === true && typeof s.items === 'object' && Array.isArray((s.items as JsonSchema).oneOf),
    ),
  ),
)

export const CheckboxGroupControl = withJsonFormsControlProps(CheckboxGroup)
