"use server";

import { validateFormValues, type FormValues, type SubmitResult } from "@nodari-pruidze/form-builder-js";
import { getFormSchema } from "@/lib/get-form-schema";

export async function submitJobApplication(values: FormValues): Promise<SubmitResult> {
  // every step is validated at once; a multi-step form is still one submit
  const form = await getFormSchema("job-application");
  const result = validateFormValues(form, values);

  if (!result.success) {
    return { success: false, fieldErrors: result.fieldErrors };
  }

  // result.data is clean: validated, and only visible fields are included
  // e.g. await saveApplication(result.data);
  // only field names are logged — the values are personal data
  console.log("Valid submission with fields:", Object.keys(result.data));

  return { success: true, message: "Application submitted!" };
}
