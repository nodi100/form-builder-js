import { z } from "zod";
import type { FieldSchema, FormValues } from "./types";
import { indexByName, isFieldVisible } from "./form-visibility";
import { formatMessage, resolveMessages, type FormMessages } from "./messages";

/** Strings are trimmed first, then "" / null / NaN all mean "empty" → undefined */
const emptyToUndefined = (val: unknown) => {
  const v = typeof val === "string" ? val.trim() : val;
  return v === "" || v === null || (typeof v === "number" && Number.isNaN(v))
    ? undefined
    : v;
};

/** Base type + format rules for one field. Everything is optional here;
 *  "required" is checked in buildZodSchema, only for visible fields. */
function fieldType(field: FieldSchema, m: FormMessages): z.ZodType {
  const v = field.validation ?? {};
  const label = field.label;

  switch (field.type) {
    case "number": {
      let s = z.number({ message: formatMessage(m.notANumber, { label }) });
      if (v.integer) s = s.int(formatMessage(m.notAnInteger, { label }));
      if (v.min !== undefined)
        s = s.min(v.min, v.message ?? formatMessage(m.min, { min: v.min }));
      if (v.max !== undefined)
        s = s.max(v.max, v.message ?? formatMessage(m.max, { max: v.max }));
      return z.preprocess((val) => {
        const cleaned = emptyToUndefined(val);
        return cleaned === undefined ? undefined : Number(cleaned);
      }, s.optional());
    }

    case "checkbox":
      return z.boolean().optional();

    case "select":
    case "radio": {
      const allowed = field.options?.map((o) => o.value) ?? [];
      return z.preprocess(
        emptyToUndefined,
        z
          .string()
          .refine((val) => allowed.includes(val), m.invalidOption)
          .optional()
      );
    }

    default: {
      // text, email, textarea
      let s = z.string();
      if (field.type === "email") s = s.email(m.invalidEmail);
      if (v.minLength !== undefined)
        s = s.min(v.minLength, formatMessage(m.minLength, { min: v.minLength }));
      if (v.maxLength !== undefined)
        s = s.max(v.maxLength, formatMessage(m.maxLength, { max: v.maxLength }));
      if (v.pattern)
        s = s.regex(new RegExp(v.pattern), v.message ?? m.invalidFormat);
      return z.preprocess(emptyToUndefined, s.optional());
    }
  }
}

function isEmpty(field: FieldSchema, val: unknown) {
  return val === undefined || (field.type === "checkbox" && val !== true);
}

/**
 * Each field is parsed on its own first, then visibility is decided from the
 * parsed values. Hidden fields are skipped entirely (no format errors, no
 * "required") and left out of the output, so the result holds only clean,
 * visible values.
 */
export function buildZodSchema(fields: FieldSchema[], messages?: Partial<FormMessages>) {
  const m = resolveMessages(messages);
  const byName = indexByName(fields);
  const fieldTypes = Object.fromEntries(fields.map((f) => [f.name, fieldType(f, m)]));

  return z.record(z.string(), z.unknown()).transform((raw, ctx) => {
    const parsed: FormValues = {};
    const formatErrors: Record<string, string> = {};

    for (const field of fields) {
      const result = fieldTypes[field.name].safeParse(raw[field.name]);
      if (result.success) parsed[field.name] = result.data;
      else formatErrors[field.name] = result.error.issues[0]?.message ?? m.invalidValue;
    }

    const data: FormValues = {};
    let hasErrors = false;

    for (const field of fields) {
      if (!isFieldVisible(field, parsed, byName)) continue;

      const message =
        formatErrors[field.name] ??
        (field.isRequired && isEmpty(field, parsed[field.name])
          ? formatMessage(m.required, { label: field.label })
          : undefined);

      if (message) {
        ctx.addIssue({ code: "custom", path: [field.name], message });
        hasErrors = true;
      } else if (parsed[field.name] !== undefined) {
        data[field.name] = parsed[field.name];
      }
    }

    return hasErrors ? z.NEVER : data;
  });
}
