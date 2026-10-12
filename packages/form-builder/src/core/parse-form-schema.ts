import { z } from "zod";
import type { FieldSchema, FormDefinition, FormStep } from "./types";
import { toConditions } from "./form-visibility";

const conditionSchema = z
  .object({
    field: z.string(),
    equals: z.union([z.string(), z.boolean(), z.array(z.string())]),
  })
  .strict();

const showWhenSchema = z.union([conditionSchema, z.array(conditionSchema).min(1)]);

const fieldSchema = z
  .object({
    name: z.string().min(1),
    label: z.string(),
    type: z.enum(["text", "email", "number", "textarea", "select", "radio", "checkbox"]),
    isRequired: z.boolean().optional(),
    options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
    showWhen: showWhenSchema.optional(),
    validation: z
      .object({
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        min: z.number().optional(),
        max: z.number().optional(),
        integer: z.boolean().optional(),
        pattern: z.string().optional(),
        message: z.string().optional(),
      })
      .strict()
      .optional(),
    placeholder: z.string().optional(),
  })
  .strict() satisfies z.ZodType<FieldSchema>;

const stepSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    description: z.string().optional(),
    showWhen: showWhenSchema.optional(),
    fields: z.array(fieldSchema).min(1),
  })
  .strict() satisfies z.ZodType<FormStep>;

const formSchema = z
  .object({ steps: z.array(stepSchema).min(1) })
  .strict()
  .superRefine(({ steps }, ctx) => {
    const stepIds = new Set<string>();
    const stepOfField = new Map<string, number>();

    steps.forEach((step, s) => {
      if (stepIds.has(step.id)) {
        ctx.addIssue({ code: "custom", path: ["steps", s, "id"], message: `Duplicate step id "${step.id}"` });
      }
      stepIds.add(step.id);

      if (steps.length > 1 && !step.title) {
        ctx.addIssue({ code: "custom", path: ["steps", s, "title"], message: `Step "${step.id}" needs a title` });
      }

      step.fields.forEach((field, f) => {
        const path = ["steps", s, "fields", f];

        if (stepOfField.has(field.name)) {
          ctx.addIssue({ code: "custom", path: [...path, "name"], message: `Duplicate field name "${field.name}"` });
        }
        stepOfField.set(field.name, s);

        if ((field.type === "select" || field.type === "radio") && !field.options?.length) {
          ctx.addIssue({ code: "custom", path: [...path, "options"], message: `"${field.name}" needs options` });
        }

        const pattern = field.validation?.pattern;
        if (pattern) {
          try {
            new RegExp(pattern);
          } catch {
            ctx.addIssue({ code: "custom", path: [...path, "validation", "pattern"], message: `Invalid regex: ${pattern}` });
          }
        }
      });
    });

    // checked after the loop so a field may depend on one declared later in
    // the same step; it can never depend on a field from a later step
    steps.forEach((step, s) => {
      for (const condition of toConditions(step.showWhen)) {
        const from = stepOfField.get(condition.field);
        if (from === undefined || from >= s) {
          ctx.addIssue({
            code: "custom",
            path: ["steps", s, "showWhen"],
            message: `Step "${step.id}" can only depend on a field from an earlier step, not "${condition.field}"`,
          });
        }
      }

      step.fields.forEach((field, f) => {
        for (const condition of toConditions(field.showWhen)) {
          const from = stepOfField.get(condition.field);
          if (from === undefined) {
            ctx.addIssue({
              code: "custom",
              path: ["steps", s, "fields", f, "showWhen"],
              message: `"${field.name}" depends on unknown field "${condition.field}"`,
            });
          } else if (from > s) {
            ctx.addIssue({
              code: "custom",
              path: ["steps", s, "fields", f, "showWhen"],
              message: `"${field.name}" depends on "${condition.field}" from a later step`,
            });
          }
        }
      });
    });
  });

/**
 * Checks form JSON at load time, so a typo fails loudly instead of silently.
 * Accepts `{ steps: [...] }` or a plain field array (= one step). Each step's
 * `showWhen` is copied into its fields, so field visibility alone decides
 * what is shown and validated, on the client and the server.
 */
export function parseFormSchema(formId: string, json: unknown): FormDefinition {
  const input = Array.isArray(json) ? { steps: [{ id: "main", fields: json }] } : json;
  const result = formSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid form schema "${formId}":\n${z.prettifyError(result.error)}`);
  }

  return {
    steps: result.data.steps.map((step) => {
      const stepConditions = toConditions(step.showWhen);
      if (!stepConditions.length) return step;
      return {
        ...step,
        fields: step.fields.map((field) => ({
          ...field,
          showWhen: [...stepConditions, ...toConditions(field.showWhen)],
        })),
      };
    }),
  };
}
