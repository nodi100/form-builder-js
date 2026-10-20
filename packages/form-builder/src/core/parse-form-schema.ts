import { z } from "zod";
import type { Condition, FieldSchema, FieldType, FormDefinition, FormStep, JsonValue } from "./types";
import { toConditions } from "./form-visibility";
import { isIsoDate } from "./values";

const FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "number",
  "textarea",
  "date",
  "select",
  "radio",
  "checkbox",
  "file",
  "custom",
  "array",
  "info",
] as const satisfies readonly FieldType[];

const conditionValue = z.union([z.string(), z.boolean(), z.array(z.string())]);

const conditionSchema = z
  .object({
    field: z.string(),
    equals: conditionValue.optional(),
    notEquals: conditionValue.optional(),
    notEmpty: z.literal(true).optional(),
  })
  .strict()
  .refine(
    (c) => [c.equals, c.notEquals, c.notEmpty].filter((op) => op !== undefined).length === 1,
    "A condition needs exactly one of: equals, notEquals, notEmpty"
  );

const showWhenSchema = z.union([conditionSchema, z.array(conditionSchema).min(1)]);

const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(z.string(), jsonValue)])
);

/** A field as written in JSON: `label` may be missing (info), and a
 *  `custom` field may carry any extra keys */
type RawField = Omit<FieldSchema, "label" | "fields"> & {
  label?: string;
  fields?: RawField[];
  [extra: string]: unknown;
};

const fieldShape = {
  name: z
    .string()
    .min(1)
    .refine((name) => !/[.[\]]/.test(name), 'A field name can\'t contain ".", "[" or "]"'),
  label: z.string().optional(),
  type: z.enum(FIELD_TYPES),
  isRequired: z.boolean().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  showWhen: showWhenSchema.optional(),
  validation: z
    .object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      min: z.union([z.number(), z.string()]).optional(),
      max: z.union([z.number(), z.string()]).optional(),
      integer: z.boolean().optional(),
      pattern: z.string().optional(),
      message: z.string().optional(),
    })
    .strict()
    .optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  width: z.enum(["full", "half"]).optional(),
  readOnly: z.boolean().optional(),
  defaultValue: jsonValue.optional(),
  accept: z.string().min(1).optional(),
  maxSizeMb: z.number().positive().optional(),
  multiple: z.boolean().optional(),
  component: z.string().min(1).optional(),
  get fields() {
    return z.array(fieldSchema).min(1).optional();
  },
  minItems: z.number().int().nonnegative().optional(),
  maxItems: z.number().int().positive().optional(),
  addLabel: z.string().optional(),
  removeLabel: z.string().optional(),
  text: z.string().optional(),
};

const KNOWN_KEYS = new Set(Object.keys(fieldShape));

// v0.2 types keep accepting every v0.2 key, so old schemas still parse.
// Newer types only accept the keys that mean something for them.
const BASE = ["name", "label", "type", "showWhen"];
const V02 = ["isRequired", "options", "validation", "placeholder"];
const VALUE = ["description", "width", "readOnly", "defaultValue"];
const TEXT_LIKE = [...BASE, ...V02, ...VALUE];

const ALLOWED_KEYS: Record<FieldType, string[]> = {
  text: TEXT_LIKE,
  email: TEXT_LIKE,
  tel: TEXT_LIKE,
  number: TEXT_LIKE,
  textarea: TEXT_LIKE,
  select: TEXT_LIKE,
  radio: TEXT_LIKE,
  checkbox: TEXT_LIKE,
  date: [...BASE, "isRequired", "validation", "placeholder", ...VALUE],
  file: [...BASE, "isRequired", "description", "width", "readOnly", "accept", "maxSizeMb", "multiple"],
  // plus any key the field schema doesn't know, handed to the component
  custom: [...BASE, "isRequired", "options", "placeholder", ...VALUE, "component"],
  array: [
    ...BASE,
    "isRequired",
    "description",
    "width",
    "readOnly",
    "fields",
    "minItems",
    "maxItems",
    "addLabel",
    "removeLabel",
  ],
  info: [...BASE, "width", "text"],
};

type Ctx = z.RefinementCtx;
type Path = (string | number)[];

function issue(ctx: Ctx, path: Path, message: string) {
  ctx.addIssue({ code: "custom", path, message });
}

/** Whether `defaultValue` fits the field's type; returns why not */
function defaultValueProblem(field: RawField): string | undefined {
  const value = field.defaultValue;
  switch (field.type) {
    case "number":
      return typeof value === "number" ? undefined : "must be a number";
    case "checkbox":
      return typeof value === "boolean" ? undefined : "must be true or false";
    case "select":
    case "radio":
      return typeof value === "string" && field.options?.some((o) => o.value === value)
        ? undefined
        : "must be the value of one of the options";
    case "date":
      return value === "today" || isIsoDate(value) ? undefined : 'must be a date "YYYY-MM-DD" or "today"';
    case "custom":
      return undefined;
    default:
      return typeof value === "string" ? undefined : "must be a string";
  }
}

/**
 * A condition must point at a field that has a comparable value: not an info
 * block, and only `notEmpty` for files and arrays.
 */
function checkConditionTarget(
  ctx: Ctx,
  path: Path,
  owner: string,
  condition: Condition,
  target: RawField
) {
  if (target.type === "info") {
    issue(ctx, path, `"${owner}" can't depend on info field "${condition.field}": it has no value`);
  } else if ((target.type === "file" || target.type === "array") && !condition.notEmpty) {
    issue(ctx, path, `"${owner}" can only use notEmpty with ${target.type} field "${condition.field}"`);
  }
}

/** Checks that only depend on the field itself (and, for arrays, its rows) */
function checkField(field: RawField, ctx: Ctx) {
  const allowed = ALLOWED_KEYS[field.type];
  for (const key of Object.keys(field)) {
    if (allowed.includes(key)) continue;
    if (KNOWN_KEYS.has(key)) {
      issue(ctx, [key], `"${key}" is not supported for type "${field.type}"`);
    } else if (field.type !== "custom") {
      issue(ctx, [key], `Unknown key "${key}"`);
    }
  }

  if (field.type !== "info" && field.label === undefined) {
    issue(ctx, ["label"], `"${field.name}" needs a label`);
  }

  if ((field.type === "select" || field.type === "radio") && !field.options?.length) {
    issue(ctx, ["options"], `"${field.name}" needs options`);
  }

  const v = field.validation;
  if (v?.pattern) {
    try {
      new RegExp(v.pattern);
    } catch {
      issue(ctx, ["validation", "pattern"], `Invalid regex: ${v.pattern}`);
    }
  }
  if (field.type === "date") {
    for (const key of ["minLength", "maxLength", "integer", "pattern"] as const) {
      if (v?.[key] !== undefined) issue(ctx, ["validation", key], `"${key}" is not supported for type "date"`);
    }
    for (const key of ["min", "max"] as const) {
      const bound = v?.[key];
      if (bound !== undefined && bound !== "today" && !isIsoDate(bound)) {
        issue(ctx, ["validation", key], `"${key}" of a date must be "YYYY-MM-DD" or "today"`);
      }
    }
    if (isIsoDate(v?.min) && isIsoDate(v?.max) && v.min > v.max) {
      issue(ctx, ["validation", "min"], `"min" is after "max"`);
    }
  } else {
    for (const key of ["min", "max"] as const) {
      if (v?.[key] !== undefined && typeof v[key] !== "number") {
        issue(ctx, ["validation", key], `"${key}" must be a number`);
      }
    }
  }

  if (field.defaultValue !== undefined && allowed.includes("defaultValue")) {
    const problem = defaultValueProblem(field);
    if (problem) issue(ctx, ["defaultValue"], `defaultValue of "${field.name}" ${problem}`);
  }

  if (field.type === "custom" && !field.component) {
    issue(ctx, ["component"], `Custom field "${field.name}" needs a "component"`);
  }

  if (field.type === "info" && field.text === undefined) {
    issue(ctx, ["text"], `Info field "${field.name}" needs a "text"`);
  }

  if (field.type === "array") checkArrayField(field, ctx);
}

function checkArrayField(field: RawField, ctx: Ctx) {
  const rowFields = field.fields;
  if (!rowFields) {
    issue(ctx, ["fields"], `Array field "${field.name}" needs "fields"`);
    return;
  }
  if (field.minItems !== undefined && field.maxItems !== undefined && field.minItems > field.maxItems) {
    issue(ctx, ["minItems"], `"minItems" is larger than "maxItems"`);
  }

  const byName = new Map<string, RawField>();
  rowFields.forEach((sub, i) => {
    if (sub.type === "array") {
      issue(ctx, ["fields", i, "type"], `"${field.name}" can't contain another array field`);
    }
    if (byName.has(sub.name)) {
      issue(ctx, ["fields", i, "name"], `Duplicate field name "${sub.name}" in "${field.name}"`);
    }
    byName.set(sub.name, sub);
  });

  // a row field may only depend on fields of the same row
  rowFields.forEach((sub, i) => {
    for (const condition of toConditions(sub.showWhen)) {
      const path = ["fields", i, "showWhen"];
      const target = byName.get(condition.field);
      if (!target) {
        issue(
          ctx,
          path,
          `"${field.name}.${sub.name}" depends on "${condition.field}", which is not a field of the same row`
        );
      } else {
        checkConditionTarget(ctx, path, `${field.name}.${sub.name}`, condition, target);
      }
    }
  });
}

const fieldSchema: z.ZodType<RawField> = z
  .object(fieldShape)
  .catchall(z.unknown())
  .superRefine((field, ctx) => checkField(field as RawField, ctx)) as z.ZodType<RawField>;

const stepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    showWhen: showWhenSchema.optional(),
    fields: z.array(fieldSchema).min(1),
  })
  .strict();

const formSchema = z
  .object({
    layout: z.enum(["wizard", "sections"]).optional(),
    steps: z.array(stepSchema).min(1),
  })
  .strict()
  .superRefine(({ layout, steps }, ctx) => {
    const stepIds = new Set<string>();
    const stepOfField = new Map<string, number>();
    const byName = new Map<string, RawField>();

    steps.forEach((step, s) => {
      if (stepIds.has(step.id)) {
        issue(ctx, ["steps", s, "id"], `Duplicate step id "${step.id}"`);
      }
      stepIds.add(step.id);

      // in "sections" a section without a title is fine
      if (layout !== "sections" && steps.length > 1 && !step.title) {
        issue(ctx, ["steps", s, "title"], `Step "${step.id}" needs a title`);
      }

      step.fields.forEach((field, f) => {
        if (stepOfField.has(field.name)) {
          issue(ctx, ["steps", s, "fields", f, "name"], `Duplicate field name "${field.name}"`);
        }
        stepOfField.set(field.name, s);
        byName.set(field.name, field);
      });
    });

    // checked after the loop so a field may depend on one declared later in
    // the same step; it can never depend on a field from a later step
    steps.forEach((step, s) => {
      for (const condition of toConditions(step.showWhen)) {
        const from = stepOfField.get(condition.field);
        const path = ["steps", s, "showWhen"];
        if (from === undefined || from >= s) {
          issue(
            ctx,
            path,
            `Step "${step.id}" can only depend on a field from an earlier step, not "${condition.field}"`
          );
        } else {
          checkConditionTarget(ctx, path, step.id, condition, byName.get(condition.field)!);
        }
      }

      step.fields.forEach((field, f) => {
        for (const condition of toConditions(field.showWhen)) {
          const from = stepOfField.get(condition.field);
          const path = ["steps", s, "fields", f, "showWhen"];
          if (from === undefined) {
            issue(ctx, path, `"${field.name}" depends on unknown field "${condition.field}"`);
          } else if (from > s) {
            issue(ctx, path, `"${field.name}" depends on "${condition.field}" from a later step`);
          } else {
            checkConditionTarget(ctx, path, field.name, condition, byName.get(condition.field)!);
          }
        }
      });
    });
  });

/** Fills in what the JSON may leave out, so the rest of the code can rely on it */
function normalizeField(field: RawField): FieldSchema {
  return {
    ...field,
    label: field.label ?? "",
    ...(field.fields && { fields: field.fields.map(normalizeField) }),
  } as FieldSchema;
}

/**
 * Checks form JSON at load time, so a typo fails loudly instead of silently.
 * Accepts `{ layout?, steps: [...] }` or a plain field array (= one step).
 * Each step's `showWhen` is copied into its fields, so field visibility alone
 * decides what is shown and validated, on the client and the server.
 */
export function parseFormSchema(formId: string, json: unknown): FormDefinition {
  const input = Array.isArray(json) ? { steps: [{ id: "main", fields: json }] } : json;
  const result = formSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid form schema "${formId}":\n${z.prettifyError(result.error)}`);
  }

  const steps: FormStep[] = result.data.steps.map((step) => {
    const stepConditions = toConditions(step.showWhen);
    const fields = step.fields.map(normalizeField);
    return {
      ...step,
      fields: stepConditions.length
        ? fields.map((field) => ({
            ...field,
            showWhen: [...stepConditions, ...toConditions(field.showWhen)],
          }))
        : fields,
    };
  });

  return result.data.layout ? { layout: result.data.layout, steps } : { steps };
}
