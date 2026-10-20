import { z } from "zod";
import type { FieldSchema, FormValues, UploadedFile } from "./types";
import { indexByName, isFieldVisible } from "./form-visibility";
import { formatMessage, resolveMessages, type FormMessages } from "./messages";
import { isBlank, isEmptyValue, isIsoDate, isUploadedFile, resolveDateBound } from "./values";

/**
 * Checks the value of a `custom` field. Return an error message, or
 * undefined when the value is fine. Runs only for visible, non-empty values.
 */
export type CustomValidator = (value: unknown, field: FieldSchema) => string | undefined;

export type SchemaOptions = {
  /** Checks for `custom` fields, keyed by the field's `component` */
  customValidators?: Record<string, CustomValidator>;
  /** IANA time zone used for the "today" keyword of date fields, e.g.
   *  "Asia/Tbilisi". Default: the local time zone of the browser / server. */
  timeZone?: string;
};

type Issue = { path: PropertyKey[]; message: string };

/** Strings are trimmed first, then blank values (see isBlank) → undefined */
const blankToUndefined = (val: unknown) => {
  const v = typeof val === "string" ? val.trim() : val;
  return isBlank(v) ? undefined : v;
};

/** Keeps only the known keys, so nothing else from the client gets through */
const toUploadedFile = ({ id, name, size, type }: UploadedFile): UploadedFile => ({
  id,
  name,
  ...(size !== undefined && { size }),
  ...(type !== undefined && { type }),
});

/** Base type + format rules for one field. Everything is optional here;
 *  "required" is checked in buildZodSchema, only for visible fields. */
function fieldType(field: FieldSchema, m: FormMessages, o: SchemaOptions): z.ZodType {
  const v = field.validation ?? {};
  const label = field.label;

  switch (field.type) {
    case "number": {
      let s = z.number({ message: formatMessage(m.notANumber, { label }) });
      if (v.integer) s = s.int(formatMessage(m.notAnInteger, { label }));
      if (typeof v.min === "number")
        s = s.min(v.min, v.message ?? formatMessage(m.min, { min: v.min }));
      if (typeof v.max === "number")
        s = s.max(v.max, v.message ?? formatMessage(m.max, { max: v.max }));
      return z.preprocess((val) => {
        const cleaned = blankToUndefined(val);
        return cleaned === undefined ? undefined : Number(cleaned);
      }, s.optional());
    }

    case "checkbox":
      return z.boolean().optional();

    case "select":
    case "radio": {
      const allowed = field.options?.map((o) => o.value) ?? [];
      return z.preprocess(
        blankToUndefined,
        z
          .string()
          .refine((val) => allowed.includes(val), m.invalidOption)
          .optional()
      );
    }

    case "date": {
      const invalid = formatMessage(m.invalidDate, { label });
      return z.preprocess(
        blankToUndefined,
        z
          .string({ message: invalid })
          .superRefine((val, ctx) => {
            if (!isIsoDate(val)) {
              ctx.addIssue({ code: "custom", message: invalid });
              return;
            }
            // "today" is resolved on every check, not when the schema is built;
            // ISO dates compare correctly as strings
            const min = resolveDateBound(v.min, o.timeZone);
            const max = resolveDateBound(v.max, o.timeZone);
            if (min && val < min)
              ctx.addIssue({ code: "custom", message: v.message ?? formatMessage(m.dateMin, { min }) });
            else if (max && val > max)
              ctx.addIssue({ code: "custom", message: v.message ?? formatMessage(m.dateMax, { max }) });
          })
          .optional()
      );
    }

    case "file":
      // only the shape is checked: size and type come from the client, so
      // the server must look each id up in its own upload store
      return z.preprocess(
        blankToUndefined,
        z.unknown().transform((val, ctx) => {
          if (val === undefined) return undefined;
          const ok = field.multiple
            ? Array.isArray(val) && val.every(isUploadedFile)
            : isUploadedFile(val);
          if (!ok) {
            ctx.addIssue({ code: "custom", message: m.invalidValue });
            return z.NEVER;
          }
          return Array.isArray(val) ? val.map(toUploadedFile) : toUploadedFile(val as UploadedFile);
        })
      );

    case "custom":
      // any JSON passes through; customValidators run later, for visible fields only
      return z.preprocess(blankToUndefined, z.unknown());

    case "array": {
      const row = buildZodSchema(field.fields ?? [], m, o);
      const min = Math.max(field.minItems ?? 0, field.isRequired ? 1 : 0);
      return z.unknown().transform((val, ctx) => {
        const rows = val ?? [];
        if (!Array.isArray(rows)) {
          ctx.addIssue({ code: "custom", message: m.invalidValue });
          return z.NEVER;
        }
        let ok = true;
        if (rows.length < min) {
          ok = false;
          ctx.addIssue({
            code: "custom",
            message: field.minItems
              ? formatMessage(m.minItems, { min })
              : formatMessage(m.required, { label }),
          });
        }
        if (field.maxItems !== undefined && rows.length > field.maxItems) {
          ok = false;
          ctx.addIssue({ code: "custom", message: formatMessage(m.maxItems, { max: field.maxItems }) });
        }
        // each row is validated like a small form: its hidden fields are
        // skipped and dropped, errors get the path [rowIndex, fieldName]
        const result = z.array(row).safeParse(rows);
        if (!result.success) {
          for (const issue of result.error.issues)
            ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
          return z.NEVER;
        }
        return ok ? result.data : z.NEVER;
      });
    }

    case "info":
      return z.unknown();

    default: {
      // text, email, tel, textarea
      let s = z.string();
      if (field.type === "email") s = s.email(m.invalidEmail);
      if (v.minLength !== undefined)
        s = s.min(v.minLength, formatMessage(m.minLength, { min: v.minLength }));
      if (v.maxLength !== undefined)
        s = s.max(v.maxLength, formatMessage(m.maxLength, { max: v.maxLength }));
      if (v.pattern)
        s = s.regex(new RegExp(v.pattern), v.message ?? m.invalidFormat);
      return z.preprocess(blankToUndefined, s.optional());
    }
  }
}

/**
 * Each field is parsed on its own first, then visibility is decided from the
 * parsed values. Hidden fields are skipped entirely (no format errors, no
 * "required") and left out of the output, so the result holds only clean,
 * visible values. `info` fields have no value and are never in the output.
 *
 * An `array` field's rows are validated the same way with its own `fields`;
 * errors inside a row get the path [arrayName, rowIndex, fieldName].
 */
export function buildZodSchema(
  fields: FieldSchema[],
  messages?: Partial<FormMessages>,
  options: SchemaOptions = {}
) {
  const m = resolveMessages(messages);
  const byName = indexByName(fields);
  const fieldTypes = Object.fromEntries(fields.map((f) => [f.name, fieldType(f, m, options)]));

  return z.record(z.string(), z.unknown(), { message: m.invalidValue }).transform((raw, ctx) => {
    const parsed: FormValues = {};
    const formatIssues: Record<string, Issue[]> = {};

    for (const field of fields) {
      if (field.type === "info") continue;
      const result = fieldTypes[field.name].safeParse(raw[field.name]);
      if (result.success) parsed[field.name] = result.data;
      else
        formatIssues[field.name] = result.error.issues.length
          ? result.error.issues
          : [{ path: [], message: m.invalidValue }];
    }

    const data: FormValues = {};
    let hasErrors = false;

    for (const field of fields) {
      if (field.type === "info" || !isFieldVisible(field, parsed, byName)) continue;

      const issues = formatIssues[field.name];
      if (issues) {
        // an array reports every row error; other fields only their first
        for (const issue of field.type === "array" ? issues : issues.slice(0, 1)) {
          ctx.addIssue({ code: "custom", path: [field.name, ...issue.path], message: issue.message });
        }
        hasErrors = true;
        continue;
      }

      const value = parsed[field.name];
      let message: string | undefined;
      if (field.isRequired && field.type !== "array" && isEmptyValue(value)) {
        message = formatMessage(m.required, { label: field.label });
      } else if (field.type === "custom" && value !== undefined && field.component) {
        message = options.customValidators?.[field.component]?.(value, field);
      }

      if (message) {
        ctx.addIssue({ code: "custom", path: [field.name], message });
        hasErrors = true;
      } else if (value !== undefined) {
        data[field.name] = value;
      }
    }

    return hasErrors ? z.NEVER : data;
  });
}
