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

export async function submitFarmRegistration(values: FormValues): Promise<SubmitResult> {
  const form = await getFormSchema("farm-registration");
  const result = validateFormValues(form, values, {
    timeZone: "Asia/Tbilisi",
    customValidators: {
      // sync shape check; a real app re-verifies against the registry below
      verifyPerson: (value) => {
        const person = value as { personalNumber?: unknown; fullName?: unknown };
        return typeof person.personalNumber === "string" &&
          /^\d{11}$/.test(person.personalNumber) &&
          typeof person.fullName === "string"
          ? undefined
          : "Verify the personal number";
      },
    },
  });

  if (!result.success) {
    return { success: false, fieldErrors: result.fieldErrors };
  }

  // A real app would now, before saving:
  // - look the personal number up in the registry again (async)
  // - look up every file id in its upload store and check owner, size and type
  console.log("Valid farm registration with fields:", Object.keys(result.data));

  return { success: true, message: "Registration submitted!" };
}
