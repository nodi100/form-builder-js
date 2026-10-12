/**
 * Every piece of text the form builder shows. Templates use `{name}`
 * placeholders instead of functions, so messages stay plain JSON and can be
 * passed from a server component to the client <FormBuilder>.
 */
export type FormMessages = {
  // validation — used on the client and the server, so pass the same
  // messages to both <FormBuilder> and validateFormValues
  /** {label} */
  required: string;
  /** {label} */
  notANumber: string;
  /** {label} */
  notAnInteger: string;
  /** {min} */
  min: string;
  /** {max} */
  max: string;
  /** {min} */
  minLength: string;
  /** {max} */
  maxLength: string;
  invalidEmail: string;
  invalidOption: string;
  invalidFormat: string;
  invalidValue: string;

  // UI — client only
  next: string;
  back: string;
  submit: string;
  submitting: string;
  submitted: string;
  fixErrors: string;
  networkError: string;
  selectPlaceholder: string;
  /** {current} {total} */
  stepCounter: string;
  progressLabel: string;
};

export const defaultMessages: FormMessages = {
  required: "{label} is required",
  notANumber: "{label} must be a number",
  notAnInteger: "{label} must be a whole number",
  min: "Minimum is {min}",
  max: "Maximum is {max}",
  minLength: "At least {min} characters",
  maxLength: "At most {max} characters",
  invalidEmail: "Invalid email",
  invalidOption: "Invalid option",
  invalidFormat: "Invalid format",
  invalidValue: "Invalid value",

  next: "Next",
  back: "Back",
  submit: "Submit",
  submitting: "Submitting...",
  submitted: "Submitted successfully",
  fixErrors: "Please fix the errors above",
  networkError: "Something went wrong. Please try again.",
  selectPlaceholder: "Select...",
  stepCounter: "Step {current} of {total}",
  progressLabel: "Form progress",
};

export function resolveMessages(overrides?: Partial<FormMessages>): FormMessages {
  return { ...defaultMessages, ...overrides };
}

/** "{label} is required" + { label: "Email" } → "Email is required" */
export function formatMessage(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
