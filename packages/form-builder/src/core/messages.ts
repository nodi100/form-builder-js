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
  /** {label} */
  invalidDate: string;
  /** {min} = the earliest allowed date, YYYY-MM-DD */
  dateMin: string;
  /** {max} = the latest allowed date, YYYY-MM-DD */
  dateMax: string;
  /** {min} */
  minItems: string;
  /** {max} */
  maxItems: string;

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
  /** {name} = file name, {max} = maxSizeMb */
  fileTooLarge: string;
  /** {name} = file name */
  fileType: string;
  /** {name} = file name */
  uploadFailed: string;
  /** {name} = file name */
  uploading: string;
  /** Add-row button of an `array` field (unless it sets `addLabel`) */
  add: string;
  /** Remove button of an `array` row (unless it sets `removeLabel`) and of an uploaded file */
  remove: string;
  /** Heading of an `array` row. {label} = the field's label, {number} = 1, 2, ... */
  arrayItem: string;
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
  invalidDate: "{label} must be a valid date",
  dateMin: "The date can't be before {min}",
  dateMax: "The date can't be after {max}",
  minItems: "Add at least {min}",
  maxItems: "Add at most {max}",

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
  fileTooLarge: "{name} is larger than {max} MB",
  fileType: "{name} is not an allowed file type",
  uploadFailed: "{name} could not be uploaded. Please try again.",
  uploading: "Uploading {name}...",
  add: "Add",
  remove: "Remove",
  arrayItem: "{label} #{number}",
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
