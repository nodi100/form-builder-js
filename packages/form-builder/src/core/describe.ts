import type { FieldSchema, FormDefinition, FormValues } from "./types";
import { flattenSteps, indexByName, isFieldVisible } from "./form-visibility";
import { formatMessage, resolveMessages, type FormMessages } from "./messages";
import { isEmptyValue, isPlainObject, isUploadedFile } from "./values";

/** One answered field: its label and its value as lines of text */
export type DescribedField = {
  name: string;
  label: string;
  lines: string[];
};

/** The answered fields of one step (one section of a "sections" form) */
export type DescribedStep = {
  id: string;
  title?: string;
  fields: DescribedField[];
};

export type DescribeOptions = {
  /** Use the same messages you pass to <FormBuilder> (yes, no, arrayItem) */
  messages?: Partial<FormMessages>;
  /** Your own text for a value, e.g. a formatted date. Return undefined to
   *  fall back to the built-in text. */
  formatValue?: (field: FieldSchema, value: unknown) => string[] | undefined;
  /** Keep fields that have no value (with `lines: []`). Default false. */
  includeEmpty?: boolean;
};

type Context = { m: FormMessages; formatValue: DescribeOptions["formatValue"] };

function withSuffix(field: FieldSchema, text: string) {
  return field.suffix ? `${text} ${field.suffix}` : text;
}

function optionLabel(field: FieldSchema, value: unknown) {
  return field.options?.find((o) => o.value === value)?.label ?? String(value);
}

function scalarText(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/** One `array` row as "Label: value, Label: value" (hidden and empty fields skipped) */
function rowText(fields: FieldSchema[], row: FormValues, ctx: Context) {
  const byName = indexByName(fields);
  return fields
    .filter((f) => f.type !== "info" && isFieldVisible(f, row, byName))
    .map((f) => ({ label: f.label, lines: valueLines(f, row[f.name], ctx) }))
    .filter(({ lines }) => lines.length)
    .map(({ label, lines }) => `${label}: ${lines.join(", ")}`)
    .join(", ");
}

function valueLines(field: FieldSchema, value: unknown, ctx: Context): string[] {
  const custom = ctx.formatValue?.(field, value);
  if (custom) return custom;

  if (field.type === "checkbox") {
    if (value === true) return [ctx.m.yes];
    return value === false ? [ctx.m.no] : [];
  }
  if (isEmptyValue(value)) return [];

  switch (field.type) {
    case "select":
    case "radio":
      return [optionLabel(field, value)];

    case "checkboxes":
      return Array.isArray(value) ? value.map((v) => optionLabel(field, v)) : [];

    case "file": {
      const files = Array.isArray(value) ? value : [value];
      return files.filter(isUploadedFile).map((file) => file.name);
    }

    case "array": {
      if (!Array.isArray(value)) return [];
      return value.flatMap((row, i) => {
        const text = isPlainObject(row) ? rowText(field.fields ?? [], row, ctx) : "";
        if (!text) return [];
        const title = formatMessage(ctx.m.arrayItem, { label: field.label, number: i + 1 });
        return [`${title}: ${text}`];
      });
    }

    case "text":
    case "tel":
    case "number":
      return [withSuffix(field, scalarText(value))];

    default:
      return [scalarText(value)];
  }
}

/**
 * The visible, answered fields of a form as plain text, step by step, in
 * form order: for a summary page, a PDF or an e-mail. Option values become
 * their labels, files their names, an `array` one line per row, and a
 * `suffix` is added after the value. `info` fields and hidden fields are
 * skipped; so are empty fields unless `includeEmpty` is set.
 */
export function describeValues(
  form: FormDefinition,
  values: FormValues,
  { messages, formatValue, includeEmpty = false }: DescribeOptions = {}
): DescribedStep[] {
  const ctx: Context = { m: resolveMessages(messages), formatValue };
  const byName = indexByName(flattenSteps(form));

  return form.steps
    .map((step) => ({
      id: step.id,
      ...(step.title !== undefined && { title: step.title }),
      fields: step.fields
        .filter((field) => field.type !== "info" && isFieldVisible(field, values, byName))
        .map((field) => ({
          name: field.name,
          label: field.label,
          lines: valueLines(field, values[field.name], ctx),
        }))
        .filter((field) => includeEmpty || field.lines.length > 0),
    }))
    .filter((step) => step.fields.length > 0);
}
