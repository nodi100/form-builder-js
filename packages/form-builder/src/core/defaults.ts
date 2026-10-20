import type { FieldSchema, FormValues } from "./types";
import { isPlainObject, todayIso } from "./values";

/**
 * Initial values of a form: each field's `defaultValue`, overridden by
 * `overrides` (e.g. a saved application being edited). An `array` field
 * starts with `minItems` rows (1 when it is required) unless overridden.
 * Keys of `overrides` that aren't fields are dropped.
 */
export function buildDefaultValues(
  fields: FieldSchema[],
  overrides: FormValues = {},
  timeZone?: string
): FormValues {
  const values: FormValues = {};

  for (const field of fields) {
    if (field.type === "info") continue;

    if (field.type === "array") {
      const given = overrides[field.name];
      const rows = Array.isArray(given)
        ? given
        : Array.from({ length: Math.max(field.minItems ?? 0, field.isRequired ? 1 : 0) }, () => ({}));
      values[field.name] = rows.map((row) =>
        buildDefaultValues(field.fields ?? [], isPlainObject(row) ? row : {}, timeZone)
      );
      continue;
    }

    const value =
      field.name in overrides
        ? overrides[field.name]
        : field.type === "date" && field.defaultValue === "today"
          ? todayIso(timeZone)
          : field.defaultValue;
    if (value !== undefined) values[field.name] = value;
  }

  return values;
}
