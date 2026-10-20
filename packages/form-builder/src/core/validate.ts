import type { FormDefinition, FormValues } from "./types";
import { buildZodSchema, type SchemaOptions } from "./build-zod-schema";
import { flattenSteps } from "./form-visibility";
import type { FormMessages } from "./messages";

export type ValidationResult =
  | { success: true; data: FormValues }
  | {
      success: false;
      /** Keyed by field name, by "arrayName.rowIndex.fieldName" inside an
       *  array, or "_form" when the input isn't an object */
      fieldErrors: Record<string, string>;
    };

export type ValidateOptions = SchemaOptions & {
  /** Use the same messages you pass to <FormBuilder> */
  messages?: Partial<FormMessages>;
};

/**
 * Server-side validation with the same JSON schema the client used, all steps
 * at once. Never trust the client: the Zod schema ignores hidden fields and
 * leaves them out of `data`, so a crafted request can't sneak them in.
 */
export function validateFormValues(
  form: FormDefinition,
  rawValues: unknown,
  { messages, ...options }: ValidateOptions = {}
): ValidationResult {
  const result = buildZodSchema(flattenSteps(form), messages, options).safeParse(rawValues);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
      fieldErrors[key] ??= issue.message; // keep the first error per field
    }
    return { success: false, fieldErrors };
  }

  return { success: true, data: result.data };
}
